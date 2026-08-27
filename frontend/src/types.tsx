export interface Author {
  id: number;
  name: string;
  bio: string;
}

export interface AuthorAccount {
  id: number;
  username: string;
  role: "author";
}

export interface Book {
  id: number;
  author: number | null;
  author_detail?: Author;
  title: string;
  description: string;
  cover_image: string;
  isbn: string;
  publication_date: string | null;
  owner: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: string;
  role: "author" | "reader";
}

export interface LibraryData {
  authors: Author[];
  authorAccounts: AuthorAccount[];
  books: Book[];
  booksPagination: PaginationMeta;
}

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ApiError extends Error {
  status?: number;
}
