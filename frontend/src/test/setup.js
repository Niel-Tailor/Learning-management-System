import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup(); // remove whatever the test rendered
  localStorage.clear(); // forget any saved token
  vi.restoreAllMocks(); // undo any faked functions, like fetch
});