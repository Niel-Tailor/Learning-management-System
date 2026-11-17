import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import UsersPage from "../pages/UsersPage";
import { admin, mockApi, renderWithProviders, requestsTo, student, teacher } from "./helpers";

const users = [admin, teacher, student];

function renderUsers() {
  return renderWithProviders(<UsersPage />, { user: admin, route: "/users" });
}

describe("UsersPage", () => {
  test("shows a loading message first", () => {
    mockApi({ "GET /users/": { body: users } });
    renderUsers();
    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  test("lists every user", async () => {
    mockApi({ "GET /users/": { body: users } });
    renderUsers();

    expect(await screen.findByText("teacher1")).toBeInTheDocument();
    expect(screen.getByText("student1")).toBeInTheDocument();
    expect(screen.getByText("Sam Patel")).toBeInTheDocument();
    expect(screen.getByText("student1@example.com")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument(); // admin has no name
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  test("locks the admin's own row", async () => {
    mockApi({ "GET /users/": { body: users } });
    renderUsers();

    expect(await screen.findByLabelText("Role for admin")).toBeDisabled();
    expect(screen.getByLabelText("Role for student1")).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  test("filters the list by role", async () => {
    mockApi({ "GET /users/": { body: users } });
    renderUsers();
    await screen.findByText("teacher1");

    await userEvent.selectOptions(screen.getByLabelText(/^show/i), "teacher");

    expect(screen.getByText("teacher1")).toBeInTheDocument();
    expect(screen.queryByText("student1")).not.toBeInTheDocument();
  });

  test("changes a user's role", async () => {
    const fetchMock = mockApi({
      "GET /users/": { body: users },
      "PATCH /users/1/": { body: { ...student, role: "teacher" } },
    });
    renderUsers();

    await userEvent.selectOptions(await screen.findByLabelText("Role for student1"), "teacher");

    expect(requestsTo(fetchMock, "PATCH", "/users/1/")).toEqual([{ role: "teacher" }]);
    await waitFor(() =>
      expect(screen.getByLabelText("Role for student1")).toHaveValue("teacher"),
    );
  });

  test("shows the error if a role change fails", async () => {
    mockApi({
      "GET /users/": { body: users },
      "PATCH /users/1/": { status: 400, body: { role: ['"boss" is not a valid choice.'] } },
    });
    renderUsers();

    await userEvent.selectOptions(await screen.findByLabelText("Role for student1"), "teacher");

    expect(await screen.findByText('role: "boss" is not a valid choice.')).toBeInTheDocument();
    expect(screen.getByLabelText("Role for student1")).toHaveValue("student");
  });

  test("deletes a user after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = mockApi({
      "GET /users/": { body: users },
      "DELETE /users/1/": { status: 204 },
    });
    renderUsers();

    await userEvent.click((await screen.findAllByRole("button", { name: "Delete" }))[1]);

    expect(requestsTo(fetchMock, "DELETE", "/users/1/")).toHaveLength(1);
    await waitFor(() => expect(screen.queryByText("student1")).not.toBeInTheDocument());
  });

  test("warns that deleting a teacher deletes their courses, and can be cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = mockApi({ "GET /users/": { body: users } });
    renderUsers();

    await userEvent.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Their courses"));
    expect(requestsTo(fetchMock, "DELETE", "/users/2/")).toHaveLength(0);
    expect(screen.getByText("teacher1")).toBeInTheDocument();
  });

  test("shows the error if the users can't be loaded", async () => {
    mockApi({
      "GET /users/": {
        status: 403,
        body: { detail: "You do not have permission to perform this action." },
      },
    });
    renderUsers();

    expect(
      await screen.findByText("You do not have permission to perform this action."),
    ).toBeInTheDocument();
  });
});