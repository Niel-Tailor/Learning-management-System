import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import RequireAuth from "../components/RequireAuth";
import { admin, fakeAuth, renderWithProviders, student } from "./helpers";

// A stand-in login page that shows where RequireAuth sent us from.
function LoginStub() {
  const location = useLocation();
  return <p>Login page (from {location.state?.from?.pathname})</p>;
}

function renderProtected({ user = null, roles, loading = false } = {}) {
  return renderWithProviders(
    <Routes>
      <Route element={<RequireAuth roles={roles} />}>
        <Route path="/secret" element={<p>Secret page</p>} />
      </Route>
      <Route path="/login" element={<LoginStub />} />
      <Route path="/" element={<p>Home page</p>} />
    </Routes>,
    { auth: fakeAuth({ user, loading }), route: "/secret" },
  );
}

describe("RequireAuth", () => {
  test("shows a loading message while the login is being checked", () => {
    renderProtected({ loading: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  test("sends logged-out visitors to the login page", () => {
    renderProtected();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  test("remembers which page the visitor wanted", () => {
    renderProtected();
    expect(screen.getByText("Login page (from /secret)")).toBeInTheDocument();
  });

  test("lets any logged-in user in when no roles are given", () => {
    renderProtected({ user: student });
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  test("lets in users with an allowed role", () => {
    renderProtected({ user: admin, roles: ["admin"] });
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  test("sends users with the wrong role to the home page", () => {
    renderProtected({ user: student, roles: ["admin"] });
    expect(screen.getByTestId("location")).toHaveTextContent("/");
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });
});