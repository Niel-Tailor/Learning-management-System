import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseFormPage from "../pages/CourseFormPage";
import {
  admin,
  makeCourse,
  mockApi,
  renderWithProviders,
  requestsTo,
  teacher,
} from "./helpers";

const titleField = () => screen.getByLabelText("Title");
const descriptionField = () => screen.getByLabelText(/^Description/);

function renderCreate(user = teacher) {
  return renderWithProviders(<CourseFormPage />, {
    user,
    route: "/courses/new",
    path: "/courses/new",
  });
}

function renderEdit(user = teacher) {
  return renderWithProviders(<CourseFormPage />, {
    user,
    route: "/courses/1/edit",
    path: "/courses/:id/edit",
  });
}

describe("CourseFormPage: creating", () => {
  test("starts with an empty form", () => {
    renderCreate();

    expect(screen.getByRole("heading", { name: "New course" })).toBeInTheDocument();
    expect(titleField()).toHaveValue("");
    expect(descriptionField()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create course" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/courses");
  });

  test("creates the course and opens it", async () => {
    const fetchMock = mockApi({
      "POST /courses/": {
        status: 201,
        body: makeCourse({ id: 7, title: "Django", description: "Intro to Django" }),
      },
    });
    renderCreate();

    await userEvent.type(titleField(), "Django");
    await userEvent.type(descriptionField(), "Intro to Django");
    await userEvent.click(screen.getByRole("button", { name: "Create course" }));

    expect(requestsTo(fetchMock, "POST", "/courses/")).toEqual([
      { title: "Django", description: "Intro to Django" },
    ]);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/courses/7"));
  });

  test("shows the error if the course can't be saved", async () => {
    mockApi({
      "POST /courses/": {
        status: 400,
        body: { title: ["Ensure this field has no more than 200 characters."] },
      },
    });
    renderCreate();

    await userEvent.type(titleField(), "Django");
    await userEvent.type(descriptionField(), "Intro to Django");
    await userEvent.click(screen.getByRole("button", { name: "Create course" }));

    expect(
      await screen.findByText("title: Ensure this field has no more than 200 characters."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/courses/new");
  });
});

describe("CourseFormPage: editing", () => {
  test("fills in the form with the course's current details", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse() } });
    renderEdit();

    expect(await screen.findByDisplayValue("Python Basics")).toBeInTheDocument();
    expect(descriptionField()).toHaveValue("Variables, loops and functions.");
    expect(screen.getByRole("heading", { name: "Edit course" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/courses/1");
  });

  test("saves the changes and opens the course", async () => {
    const fetchMock = mockApi({
      "GET /courses/1/": { body: makeCourse() },
      "PATCH /courses/1/": { body: makeCourse({ title: "Python 101" }) },
    });
    renderEdit();

    const title = await screen.findByDisplayValue("Python Basics");
    await userEvent.clear(title);
    await userEvent.type(title, "Python 101");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(requestsTo(fetchMock, "PATCH", "/courses/1/")).toEqual([
      { title: "Python 101", description: "Variables, loops and functions." },
    ]);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/courses/1"));
  });

  test("stops teachers editing someone else's course", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse({ teacher: 9 }) } });
    renderEdit(teacher);

    expect(await screen.findByText("You can only edit your own courses.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  test("lets admins edit any course", async () => {
    mockApi({ "GET /courses/1/": { body: makeCourse({ teacher: 9 }) } });
    renderEdit(admin);

    expect(await screen.findByDisplayValue("Python Basics")).toBeInTheDocument();
    expect(screen.queryByText("You can only edit your own courses.")).not.toBeInTheDocument();
  });

  test("says when the course doesn't exist", async () => {
    mockApi({ "GET /courses/1/": { status: 404, body: { detail: "Not found." } } });
    renderEdit();

    expect(await screen.findByText("This course doesn't exist.")).toBeInTheDocument();
  });
});