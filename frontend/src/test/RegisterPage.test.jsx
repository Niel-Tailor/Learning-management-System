import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import RegisterPage from "../pages/RegisterPage";
import { fakeAuth, renderWithProviders, student } from "./helpers";

function renderRegister(auth) {
  return renderWithProviders(<RegisterPage />, { auth, route: "/register", path: "/register" });
}

async function fillIn(role = "student") {
  await userEvent.type(screen.getByLabelText("Username"), "newuser");
  await userEvent.type(screen.getByLabelText("Email"), "newuser@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "test123$");
  await userEvent.selectOptions(screen.getByLabelText(/i am a/i), role);
  await userEvent.click(screen.getByRole("button", { name: "Register" }));
}

describe("RegisterPage", () => {
  test("sends the form details and goes to the dashboard", async () => {
    const auth = fakeAuth({ register: vi.fn().mockResolvedValue(student) });
    renderRegister(auth);

    await fillIn("teacher");

    expect(auth.register).toHaveBeenCalledWith({
      username: "newuser",
      email: "newuser@example.com",
      password: "test123$",
      role: "teacher",
    });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"));
  });

  test("doesn't offer an admin role", () => {
    renderRegister(fakeAuth());
    expect(screen.getByRole("option", { name: "Student" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Teacher" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Admin" })).not.toBeInTheDocument();
  });

  test("shows the error when registering fails", async () => {
    const auth = fakeAuth({
      register: vi
        .fn()
        .mockRejectedValue(new Error("username: A user with that username already exists.")),
    });
    renderRegister(auth);

    await fillIn();

    expect(
      await screen.findByText("username: A user with that username already exists."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/register");
  });

  test("disables the button while the account is being created", async () => {
    const auth = fakeAuth({ register: vi.fn(() => new Promise(() => {})) });
    renderRegister(auth);

    await fillIn();

    expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();
  });

  test("sends users who are already logged in to the dashboard", () => {
    renderWithProviders(<RegisterPage />, { user: student, route: "/register", path: "/register" });
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});
