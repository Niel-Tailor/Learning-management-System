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

// ---------- Pretend course ----------
export function makeCourse(overrides = {}) {
  return {
    id: 1,
    title: "Python Basics",
    description: "Variables, loops and functions.",
    teacher: teacher.id,
    teacher_name: "Ada Lovelace",
    enrollment_count: 3,
    is_enrolled: false,
    created_at: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

// ---------- Pretend auth ----------
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
export function mockApi(routes) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options = {}) => {
    const method = options.method ?? "GET";
    const path = new URL(url).pathname.replace(/^\/api/, "");
    const key = `${method} ${path}`;

    if (!(key in routes)) {
      throw new Error(`No mock for ${key}`);
    }

    const response = typeof routes[key] === "function" ? routes[key]() : routes[key];
    const { status = 200, body = null } = response;
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

// Returns the JSON body of every request sent to METHOD /path/.
export function requestsTo(fetchMock, method, path) {
  return fetchMock.mock.calls
    .filter(([url, options = {}]) => {
      const sameMethod = (options.method ?? "GET") === method;
      const samePath = new URL(url).pathname.replace(/^\/api/, "") === path;
      return sameMethod && samePath;
    })
    .map(([, options = {}]) => (options.body ? JSON.parse(options.body) : null));
}