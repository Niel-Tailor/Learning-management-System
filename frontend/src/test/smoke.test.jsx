import { screen } from "@testing-library/react";
import CoursesPage from "../pages/CoursesPage";
import HomePage from "../pages/HomePage";
import { mockApi, renderWithProviders, student } from "./helpers";

test("the home page greets a logged-in user", () => {
  renderWithProviders(<HomePage />, { user: student });
  expect(screen.getByText("Welcome back, Sam.")).toBeInTheDocument();
});

test("the course list shows courses from the API", async () => {
  mockApi({
    "GET /courses/": {
      body: [
        {
          id: 1,
          title: "Python Basics",
          description: "Variables, loops and functions.",
          teacher: 2,
          teacher_name: "Ada Lovelace",
          enrollment_count: 3,
          is_enrolled: true,
        },
      ],
    },
  });

  renderWithProviders(<CoursesPage />, { user: student, route: "/courses" });

  expect(await screen.findByText("Python Basics")).toBeInTheDocument();
  expect(screen.getByText("Enrolled")).toBeInTheDocument();
});