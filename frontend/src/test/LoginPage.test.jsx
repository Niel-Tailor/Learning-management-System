import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import LoginPage from "../pages/LoginPage";
import { fakeAuth, renderWithProviders, student } from "./helpers";

async function fillIn(username, password) {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginPage", () => {
  test("logs in and goes to the dashboard", async () => {
    const auth = fakeAuth({ login: vi.fn().mockResolvedValue(student) });
    renderWithProviders(<LoginPage />, { auth, route: "/login", path: "/login" });

    await fillIn("student1", "test123$");

    expect(auth.login).toHaveBeenCalledWith("student1", "test123$");
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"));
  });

  test("goes back to the page the user wanted after logging in", async () => {
    const auth = fakeAuth({ login: vi.fn().mockResolvedValue(student) });
    renderWithProviders(<LoginPage />, {
      auth,
      route: { pathname: "/login", state: { from: { pathname: "/courses" } } },
      path: "/login",
    });

    await fillIn("student1", "test123$");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/courses"));
  });

  test("shows the error when login fails", async () => {
    const auth = fakeAuth({
      login: vi.fn().mockRejectedValue(new Error("Invalid username or password.")),
    });
    renderWithProviders(<LoginPage />, { auth, route: "/login", path: "/login" });

    await fillIn("student1", "wrong");

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  test("sends users who are already logged in to the dashboard", () => {
    renderWithProviders(<LoginPage />, { user: student, route: "/login", path: "/login" });
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});