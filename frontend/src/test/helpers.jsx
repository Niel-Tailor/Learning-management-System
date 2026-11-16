import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import { AuthContext } from "../AuthContext";

// ---------- Pretend users ----------
export const student = {
  id: 1,
  username: "student1",
  email: "student1@example.com",
  first_name: "Sam",
  last_name: "Patel",
  role: "student",
};

export const teacher = {
  id: 2,
  username: "teacher1",
  email: "teacher1@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  role: "teacher",
};

export const admin = {
  id: 3,
  username: "admin",
  email: "admin@example.com",
  first_name: "",
  last_name: "",
  role: "admin",
};

// ---------- Pretend auth ----------
// Same shape as AuthContext's value, but nothing talks to a server.
export function fakeAuth(overrides = {}) {
  return {
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

// Shows the current URL, so tests can check where a page navigated to.
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// ---------- Render a page ----------
// user:  who's logged in (default: nobody)
// route: the URL to start at (default: "/")
// path:  a route pattern like "/courses/:id", for pages that use useParams
export function renderWithProviders(ui, { user = null, auth, route = "/", path } = {}) {
  const authValue = auth ?? fakeAuth({ user });

  const result = render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={null} />
          </Routes>
        ) : (
          ui
        )}
        <LocationDisplay />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return { ...result, auth: authValue };
}

// ---------- Pretend backend ----------
// Pass { "METHOD /path/": { status, body } }, for example:
// mockApi({ "GET /courses/": { body: [course] } })
export function mockApi(routes) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options = {}) => {
    const method = options.method ?? "GET";
    const path = new URL(url).pathname.replace(/^\/api/, "");
    const key = `${method} ${path}`;

    if (!(key in routes)) {
      throw new Error(`No mock for ${key}`);
    }

    const { status = 200, body = null } = routes[key];
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}