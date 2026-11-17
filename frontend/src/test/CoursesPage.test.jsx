import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoursesPage from "../pages/CoursesPage";
import { admin, makeCourse, mockApi, renderWithProviders, student, teacher } from "./helpers";

const courses = [
  makeCourse({ id: 1, title: "Python Basics", is_enrolled: true }),
  makeCourse({
    id: 2,
    title: "Intro to Algorithms",
    description: "Sorting and searching.",
    teacher: 9,
    teacher_name: "Alan Turing",
  }),
];

function renderCourses(user = student) {
  return renderWithProviders(<CoursesPage />, { user, route: "/courses" });
}

describe("CoursesPage", () => {
  test("shows a loading message first", () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses();
    expect(screen.getByText("Loading courses...")).toBeInTheDocument();
  });

  test("shows a card for each course", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses();

    expect(await screen.findByText("Python Basics")).toBeInTheDocument();
    expect(screen.getByText("Intro to Algorithms")).toBeInTheDocument();
    expect(screen.getByText("Taught by Alan Turing")).toBeInTheDocument();
    expect(screen.getAllByText("Enrolled")).toHaveLength(1);
  });

  test("links each card to its course page", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses();

    const link = await screen.findByRole("link", { name: "Python Basics" });
    expect(link).toHaveAttribute("href", "/courses/1");
  });

  test("filters courses with the search box", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses();
    await screen.findByText("Python Basics");

    await userEvent.type(screen.getByRole("searchbox"), "turing");

    expect(screen.queryByText("Python Basics")).not.toBeInTheDocument();
    expect(screen.getByText("Intro to Algorithms")).toBeInTheDocument();
  });

  test("says when nothing matches the search", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses();
    await screen.findByText("Python Basics");

    await userEvent.type(screen.getByRole("searchbox"), "chemistry");

    expect(screen.getByText("No courses match your search.")).toBeInTheDocument();
  });

  test("says when there are no courses", async () => {
    mockApi({ "GET /courses/": { body: [] } });
    renderCourses();
    expect(await screen.findByText("No courses yet.")).toBeInTheDocument();
  });

  test("shows the error if the courses can't be loaded", async () => {
    mockApi({ "GET /courses/": { status: 500, body: { detail: "Server error" } } });
    renderCourses();
    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });

  test("hides New course from students", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    renderCourses(student);
    await screen.findByText("Python Basics");
    expect(screen.queryByRole("link", { name: "New course" })).not.toBeInTheDocument();
  });

  test("shows New course to teachers and admins", async () => {
    mockApi({ "GET /courses/": { body: courses } });
    const { unmount } = renderCourses(teacher);
    expect(await screen.findByRole("link", { name: "New course" })).toBeInTheDocument();
    unmount();

    renderCourses(admin);
    expect(await screen.findByRole("link", { name: "New course" })).toBeInTheDocument();
  });
});