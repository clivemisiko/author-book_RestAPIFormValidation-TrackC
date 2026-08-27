import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import App from "./App";

const authors = {
  count: 1,
  next: null,
  previous: null,
  results: [{ id: 1, name: "Octavia Butler", bio: "Author" }],
};
const authorAccounts = {
  count: 1,
  next: null,
  previous: null,
  results: [{ id: 1, username: "octavia", role: "author" }],
};
const books = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 10,
      author: 1,
      author_detail: { id: 1, name: "Octavia Butler", bio: "Author" },
      title: "Kindred",
      description: "Time travel novel",
      cover_image: "https://example.com/kindred.jpg",
      isbn: "9780807083697",
      owner: "owner",
    },
  ],
};
const fetchMock = vi.fn();

function mockJson(status: number, data: unknown): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? "Server Error" : "",
    json: () => Promise.resolve(data),
  } as Response);
}
function renderApp(path = "/catalog") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
function libraryResponse(data: unknown) {
  return mockJson(200, { count: 0, next: null, previous: null, results: data });
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("routed library experience", () => {
  test("loads the catalog and displays book covers", async () => {
    fetchMock
      .mockResolvedValueOnce(await mockJson(200, authors))
      .mockResolvedValueOnce(await mockJson(200, authorAccounts))
      .mockResolvedValueOnce(await mockJson(200, books));
    renderApp();
    expect(await screen.findByText("Kindred")).toBeInTheDocument();
    expect(screen.getByAltText("Cover of Kindred")).toBeInTheDocument();
  });

  test("shows API errors on the catalog page", async () => {
    fetchMock
      .mockResolvedValueOnce(
        await mockJson(500, { detail: "Database unavailable" }),
      )
      .mockResolvedValueOnce(await mockJson(200, authorAccounts))
      .mockResolvedValueOnce(await mockJson(200, books));
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Database unavailable",
    );
  });

  test("provides a separate registration page", async () => {
    fetchMock
      .mockResolvedValueOnce(await mockJson(200, authors))
      .mockResolvedValueOnce(await mockJson(200, authorAccounts))
      .mockResolvedValueOnce(await mockJson(200, books));
    renderApp("/register");
    expect(
      screen.getByRole("heading", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      await screen.findByText("Make room for a new chapter."),
    ).toBeInTheDocument();
  });

  test("redirects unauthenticated users from the dashboard", async () => {
    renderApp("/dashboard");
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  test("submits valid registration data", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/register/") return mockJson(201, {});
      return libraryResponse([]);
    });
    const user = userEvent.setup();
    renderApp("/register");
    await user.type(screen.getByLabelText("Username"), "reader");
    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(
      screen.getByLabelText("Password", { selector: "input" }),
      "StrongPass123!",
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "StrongPass123!",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Sign in" }),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/register/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("shows a client validation error without submitting mismatched passwords", async () => {
    const user = userEvent.setup();
    renderApp("/register");
    await user.type(screen.getByLabelText("Username"), "reader");
    await user.type(screen.getByLabelText("Email"), "reader@example.com");
    await user.type(
      screen.getByLabelText("Password", { selector: "input" }),
      "StrongPass123!",
    );
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "DifferentPass123!",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords must match",
    );
    expect(
      fetchMock.mock.calls.some(([input]) => String(input) === "/register/"),
    ).toBe(false);
  });

  test("shows server-rejected login errors", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === "/login/")
        return mockJson(400, {
          non_field_errors: ["Invalid username or password."],
        });
      return libraryResponse([]);
    });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(screen.getByLabelText("Username"), "reader");
    await user.type(screen.getByLabelText("Password"), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password.",
    );
  });
});
