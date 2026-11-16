import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import { admin, fakeAuth, renderWithProviders, student, teacher } from "./helpers";

function renderLayout(auth) {
  return renderWithProviders(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<p>Page content</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Route>
    </Routes>,
    { auth },
  );
}

const link = (name) => screen.queryByRole("link", { name });

describe("Layout", () => {
  test("shows the current page inside the layout", () => {
    renderLayout(fakeAuth());
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  test("shows Log in and Register when logged out", () => {
    renderLayout(fakeAuth());
    expect(link("Log in")).toBeInTheDocument();
    expect(link("Register")).toBeInTheDocument();
    expect(link("Dashboard")).not.toBeInTheDocument();
  });

  test("hides every link while the login is being checked", () => {
    renderLayout(fakeAuth({ loading: true }));
    expect(link("Log in")).not.toBeInTheDocument();
    expect(link("Dashboard")).not.toBeInTheDocument();
  });

  test("shows students their links only", () => {
    renderLayout(fakeAuth({ user: student }));
    expect(link("Dashboard")).toBeInTheDocument();
    expect(link("Courses")).toBeInTheDocument();
    expect(link("My courses")).toBeInTheDocument();
    expect(link("New course")).not.toBeInTheDocument();
    expect(link("Users")).not.toBeInTheDocument();
    expect(screen.getByText("student1 (student)")).toBeInTheDocument();
  });

  test("shows teachers New course but not student or admin links", () => {
    renderLayout(fakeAuth({ user: teacher }));
    expect(link("New course")).toBeInTheDocument();
    expect(link("My courses")).not.toBeInTheDocument();
    expect(link("Users")).not.toBeInTheDocument();
  });

  test("shows admins Users and New course", () => {
    renderLayout(fakeAuth({ user: admin }));
    expect(link("Users")).toBeInTheDocument();
    expect(link("New course")).toBeInTheDocument();
    expect(link("My courses")).not.toBeInTheDocument();
  });

  test("logs out and goes to the login page", async () => {
    const auth = fakeAuth({ user: student });
    renderLayout(auth);

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});