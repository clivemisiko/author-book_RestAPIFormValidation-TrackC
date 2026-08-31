import type {
  Author,
  AuthorAccount,
  Book,
  LibraryData,
  LoginCredentials,
  LoginResponse,
  PaginatedResponse,
  PaginationMeta,
  ApiError,
} from "./types";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface RequestOptions extends RequestInit {
  token?: string;
}

function errorMessage(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "The API request failed.";
  if ("detail" in data && typeof data.detail === "string") return data.detail;

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((message) => `${field}: ${String(message)}`);
  });
  return messages.length ? messages.join(" ") : JSON.stringify(data);
}

async function request<T>(
  path: string,
  { token, ...options }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    const error: ApiError = new Error(
      "Your session is not authorized for that action.",
    );
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    let message = "The API request failed.";
    try {
      const data = await response.json();
      message = errorMessage(data);
    } catch {
      message = response.statusText || message;
    }
    const error: ApiError = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function listFromPaginated<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

function paginationFrom<T>(data: PaginatedResponse<T> | T[]): PaginationMeta {
  return Array.isArray(data)
    ? { count: data.length, next: null, previous: null }
    : { count: data.count, next: data.next, previous: data.previous };
}

export async function loadLibrary(
  token?: string,
  page = 1,
  search = "",
): Promise<LibraryData> {
  const booksParams = new URLSearchParams({ page: String(page) });
  if (search.trim()) booksParams.set("search", search.trim());
  const [authorsData, authorAccountsData, booksData] = await Promise.all([
    request<PaginatedResponse<Author> | Author[]>("/authors/", { token }),
    request<PaginatedResponse<AuthorAccount> | AuthorAccount[]>(
      "/author-accounts/",
      { token },
    ),
    request<PaginatedResponse<Book> | Book[]>(
      `/books/?${booksParams.toString()}`,
      {
        token,
      },
    ),
  ]);

  return {
    authors: listFromPaginated(authorsData),
    authorAccounts: listFromPaginated(authorAccountsData),
    books: listFromPaginated(booksData),
    booksPagination: paginationFrom(booksData),
  };
}

export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return request<LoginResponse>("/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  password2: string;
  role: "author" | "reader";
}

export function register(credentials: RegistrationData): Promise<unknown> {
  return request<unknown>("/register/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function createAuthor(
  author: Partial<Author>,
  token?: string,
): Promise<Author> {
  return request<Author>("/authors/", {
    method: "POST",
    token,
    body: JSON.stringify(author),
  });
}

export function createBook(
  book: Partial<Book> | FormData,
  token?: string,
): Promise<Book> {
  return request<Book>("/books/", {
    method: "POST",
    token,
    body: book instanceof FormData ? book : JSON.stringify(book),
  });
}
