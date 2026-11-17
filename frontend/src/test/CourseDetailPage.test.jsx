import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CourseDetailPage from "../pages/CourseDetailPage";
import {
  admin,
  makeCourse,
  mockApi,
  renderWithProviders,
  requestsTo,
  student,
  teacher,
} from "./helpers";

function renderDetail(user) {
  return renderWithProviders(<CourseDetailPage />, {
    user,
    route: "/courses/1",
    path: "/courses/:id",
  });
}

describe("CourseDetailPage", () => {
  test("shows a loading message first", () => {
    mockApi({ "GET /courses/1/": { body: makeCourse() } });
    renderDetail(student);
    expect(screen.getByText("Loading course...")).toBeInTheDocument();
  });

  test("shows the course details", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse() } });
    renderDetail(student);

    expect(await screen.findByRole("heading", { name: "Python Basics" })).toBeInTheDocument();
    expect(screen.getByText(/Taught by Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/3 enrolled/)).toBeInTheDocument();
    expect(screen.getByText("Variables, loops and functions.")).toBeInTheDocument();
  });

  test("says when the course doesn't exist", async () => {
    mockApi({ "GET /courses/1/": { status: 404, body: { detail: "Not found." } } });
    renderDetail(student);

    expect(await screen.findByText("This course doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to courses" })).toBeInTheDocument();
  });

  // ---------- Students ----------
  test("lets a student enrol", async () => {
    let enrolled = false;
    const fetchMock = mockApi({
      "GET /courses/1/": () => ({
        body: makeCourse({ is_enrolled: enrolled, enrollment_count: enrolled ? 4 : 3 }),
      }),
      "POST /courses/1/enroll/": () => {
        enrolled = true;
        return { status: 201, body: {} };
      },
    });
    renderDetail(student);

    await userEvent.click(await screen.findByRole("button", { name: "Enrol" }));

    expect(await screen.findByText("You're now enrolled!")).toBeInTheDocument();
    expect(screen.getByText("You're enrolled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unenrol" })).toBeInTheDocument();
    expect(screen.getByText(/4 enrolled/)).toBeInTheDocument();
    expect(requestsTo(fetchMock, "POST", "/courses/1/enroll/")).toHaveLength(1);
  });

  test("lets an enrolled student leave", async () => {
    let enrolled = true;
    mockApi({
      "GET /courses/1/": () => ({ body: makeCourse({ is_enrolled: enrolled }) }),
      "POST /courses/1/unenroll/": () => {
        enrolled = false;
        return { status: 204 };
      },
    });
    renderDetail(student);

    await userEvent.click(await screen.findByRole("button", { name: "Unenrol" }));

    expect(await screen.findByText("You've left this course.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enrol" })).toBeInTheDocument();
    expect(screen.queryByText("You're enrolled")).not.toBeInTheDocument();
  });

  test("shows the error if enrolling fails", async () => {
    mockApi({
      "GET /courses/1/": { body: makeCourse() },
      "POST /courses/1/enroll/": {
        status: 400,
        body: { detail: "You are already enrolled in this course." },
      },
    });
    renderDetail(student);

    await userEvent.click(await screen.findByRole("button", { name: "Enrol" }));

    expect(await screen.findByText("You are already enrolled in this course.")).toBeInTheDocument();
  });

  test("doesn't show Edit or Delete to students", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse() } });
    renderDetail(student);

    await screen.findByRole("heading", { name: "Python Basics" });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  // ---------- Teachers and admins ----------
  test("shows Edit and Delete to the course's own teacher", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse({ teacher: teacher.id }) } });
    renderDetail(teacher);

    const edit = await screen.findByRole("link", { name: "Edit" });
    expect(edit).toHaveAttribute("href", "/courses/1/edit");
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enrol" })).not.toBeInTheDocument();
  });

  test("hides Edit and Delete from other teachers", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse({ teacher: 9 }) } });
    renderDetail(teacher);

    await screen.findByRole("heading", { name: "Python Basics" });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  test("shows Edit and Delete to admins on any course", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse({ teacher: 9 }) } });
    renderDetail(admin);

    expect(await screen.findByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  test("deletes the course after confirming, then goes to the course list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = mockApi({
      "GET /courses/1/": { body: makeCourse() },
      "DELETE /courses/1/": { status: 204 },
    });
    renderDetail(teacher);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(requestsTo(fetchMock, "DELETE", "/courses/1/")).toHaveLength(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/courses");
  });

  test("doesn't delete if the user cancels", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = mockApi({ "GET /courses/1/": { body: makeCourse() } });
    renderDetail(teacher);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(requestsTo(fetchMock, "DELETE", "/courses/1/")).toHaveLength(0);
    expect(screen.getByTestId("location")).toHaveTextContent("/courses/1");
  });
});