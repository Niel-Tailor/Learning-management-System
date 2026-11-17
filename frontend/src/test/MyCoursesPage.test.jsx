import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyCoursesPage from "../pages/MyCoursesPage";
import { makeCourse, mockApi, renderWithProviders, requestsTo, student } from "./helpers";

const notDone = {
  id: 1,
  student: student.id,
  completed: false,
  enrolled_at: "2026-11-01T10:00:00Z",
  course: makeCourse({ id: 1, title: "Python Basics" }),
};

const done = {
  id: 2,
  student: student.id,
  completed: true,
  enrolled_at: "2026-11-02T10:00:00Z",
  course: makeCourse({ id: 2, title: "Web Development with Django" }),
};

function renderMyCourses() {
  return renderWithProviders(<MyCoursesPage />, { user: student, route: "/my-courses" });
}

describe("MyCoursesPage", () => {
  test("shows a loading message first", () => {
    mockApi({ "GET /enrollments/": { body: [notDone, done] } });
    renderMyCourses();
    expect(screen.getByText("Loading your courses...")).toBeInTheDocument();
  });

  test("lists the student's courses with links and dates", async () => {
    mockApi({ "GET /enrollments/": { body: [notDone, done] } });
    renderMyCourses();

    const link = await screen.findByRole("link", { name: "Python Basics" });
    expect(link).toHaveAttribute("href", "/courses/1");
    expect(screen.getByRole("link", { name: "Web Development with Django" })).toBeInTheDocument();
    expect(screen.getByText(/enrolled 01\/11\/2026/)).toBeInTheDocument();
  });

  test("shows overall progress", async () => {
    mockApi({ "GET /enrollments/": { body: [notDone, done] } });
    renderMyCourses();

    expect(await screen.findByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("courses completed (50%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Courses completed" })).toHaveAttribute(
      "value",
      "1",
    );
    expect(screen.getAllByText("Completed")).toHaveLength(1);
  });

  test("marks a course complete", async () => {
    const fetchMock = mockApi({
      "GET /enrollments/": { body: [notDone, done] },
      "PATCH /enrollments/1/": { body: { ...notDone, completed: true } },
    });
    renderMyCourses();

    await userEvent.click(await screen.findByRole("button", { name: "Mark complete" }));

    expect(await screen.findByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByText("courses completed (100%)")).toBeInTheDocument();
    expect(screen.getAllByText("Completed")).toHaveLength(2);
    expect(requestsTo(fetchMock, "PATCH", "/enrollments/1/")).toEqual([{ completed: true }]);
  });

  test("marks a course not complete", async () => {
    const fetchMock = mockApi({
      "GET /enrollments/": { body: [notDone, done] },
      "PATCH /enrollments/2/": { body: { ...done, completed: false } },
    });
    renderMyCourses();

    await userEvent.click(await screen.findByRole("button", { name: "Mark not complete" }));

    expect(await screen.findByText("0 of 2")).toBeInTheDocument();
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    expect(requestsTo(fetchMock, "PATCH", "/enrollments/2/")).toEqual([{ completed: false }]);
  });

  test("shows the error if saving fails", async () => {
    mockApi({
      "GET /enrollments/": { body: [notDone] },
      "PATCH /enrollments/1/": {
        status: 403,
        body: { detail: "You do not have permission to perform this action." },
      },
    });
    renderMyCourses();

    await userEvent.click(await screen.findByRole("button", { name: "Mark complete" }));

    expect(
      await screen.findByText("You do not have permission to perform this action."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 of 1")).toBeInTheDocument();
  });

  test("invites students with no courses to browse", async () => {
    mockApi({ "GET /enrollments/": { body: [] } });
    renderMyCourses();

    expect(await screen.findByText(/not enrolled in any courses yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse courses" })).toHaveAttribute(
      "href",
      "/courses",
    );
  });
});