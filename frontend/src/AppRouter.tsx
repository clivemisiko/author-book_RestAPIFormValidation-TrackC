import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LogIn,
  LogOut,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { createBook, loadLibrary, login, register } from "./api";
import type { Author, Book } from "./types";

const emptyBook = {
  author: "",
  title: "",
  description: "",
  cover_image: null as File | null,
  isbn: "",
  publication_date: "",
};

function useLibrary(token: string) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorAccounts, setAuthorAccounts] = useState<
    { id: number; username: string }[]
  >([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksPagination, setBooksPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh(nextPage = page, nextSearch = search) {
    setLoading(true);
    setError("");
    try {
      const data = await loadLibrary(token, nextPage, nextSearch);
      setAuthors(data.authors);
      setAuthorAccounts(data.authorAccounts);
      setBooks(data.books);
      setBooksPagination(data.booksPagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load the library.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh(page);
  }, [page, search]);
  function goToPage(nextPage: number) {
    setPage(nextPage);
  }
  function applySearch(nextSearch: string) {
    setSearch(nextSearch);
    setPage(1);
  }
  return {
    authors,
    authorAccounts,
    books,
    booksPagination,
    page,
    search,
    loading,
    error,
    refresh,
    goToPage,
    applySearch,
  };
}

function Layout({
  token,
  username,
  role,
  onLogout,
  children,
}: {
  token: string;
  username: string;
  role: "author" | "reader";
  onLogout: () => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const links = token
    ? [
      ["/dashboard", "Dashboard"],
      ["/catalog", "Catalog"],
      ["/authors", "Authors"],
      ...(role === "author" ? [["/manage", "Manage library"]] : []),
    ]
    : [
      ["/catalog", "Catalog"],
      ["/login", "Login"],
      ["/register", "Register"],
    ];
  return (
    <main className="shell">
      <header className="site-header">
        <Link className="brand" to={token ? "/dashboard" : "/catalog"}>
          <BookOpen size={22} /> Author Book Library
        </Link>
        <nav aria-label="Primary navigation">
          {links.map(([path, label]) => (
            <Link
              className={location.pathname === path ? "active" : ""}
              key={path}
              to={path}
            >
              {label}
            </Link>
          ))}
          {token && (
            <button className="quiet-button" type="button" onClick={onLogout}>
              <LogOut size={16} /> {username}
            </button>
          )}
        </nav>
      </header>
      {children}
    </main>
  );
}

function Status({
  loading,
  error,
  message,
}: {
  loading?: boolean;
  error?: string;
  message?: string;
}) {
  if (!loading && !error && !message) return null;
  return (
    <section className="status" aria-live="polite">
      {loading && <span>Loading library data...</span>}
      {error && <strong role="alert">{error}</strong>}
      {message && <strong role="status">{message}</strong>}
    </section>
  );
}

function AuthPage({
  mode,
  onLogin,
}: {
  mode: "login" | "register";
  onLogin: (token: string, username: string, role: "author" | "reader") => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    role: "reader" as "author" | "reader",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && form.password !== form.password2) {
      setError("password2: Passwords must match.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "login") {
        const data = await login(form);
        onLogin(data.token, data.user, data.role);
        navigate("/dashboard");
      } else {
        await register(form);
        navigate("/login", {
          state: { message: "Account created. Sign in to continue." },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">A quieter way to read</span>
        <h1>
          {mode === "login" ? "Welcome back." : "Make room for a new chapter."}
        </h1>
        <p>
          Keep your reading life organized, discover new titles, and give every
          book a place.
        </p>
      </div>
      <form onSubmit={submit} className="panel auth-panel">
        <h2>
          {mode === "login" ? (
            <>
              <LogIn size={18} /> Sign in
            </>
          ) : (
            <>
              <UserRound size={18} /> Create account
            </>
          )}
        </h2>
        <Status error={error} message={location.state?.message} />
        <label>
          Username
          <input
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
          />
        </label>
        {mode === "register" && (
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </label>
        )}
        {mode === "register" && (
          <label>
            Account type
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as "author" | "reader",
                })
              }
            >
              <option value="reader">Reader</option>
              <option value="author">Author</option>
            </select>
          </label>
        )}
        <label>
          Password
          <input
            required
            minLength={8}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </label>
        {mode === "register" && (
          <label>
            Confirm password
            <input
              required
              minLength={8}
              type="password"
              value={form.password2}
              onChange={(e) => setForm({ ...form, password2: e.target.value })}
              autoComplete="new-password"
            />
          </label>
        )}
        <button type="submit" disabled={saving}>
          {mode === "login" ? <LogIn size={18} /> : <Plus size={18} />}
          {saving
            ? "Working..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
        <p className="form-note">
          {mode === "login" ? (
            <>
              New here? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already registered? <Link to="/login">Sign in</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <article className="book-card catalog-card">
      <div className="cover-frame">
        {book.cover_image ? (
          <img src={book.cover_image} alt={`Cover of ${book.title}`} />
        ) : (
          <BookOpen size={32} aria-hidden="true" />
        )}
      </div>
      <div className="book-copy">
        <p className="eyebrow">
          {book.author_detail?.name || "Independent title"}
        </p>
        <h2>{book.title}</h2>
        {book.description && <p>{book.description}</p>}
        <Link className="text-link" to={`/catalog/${book.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}

function CatalogPage({
  books,
  booksPagination,
  page,
  search,
  goToPage,
  applySearch,
  loading,
  error,
}: {
  books: Book[];
  booksPagination: {
    count: number;
    next: string | null;
    previous: string | null;
  };
  page: number;
  search: string;
  goToPage: (page: number) => void;
  applySearch: (search: string) => void;
  loading: boolean;
  error: string;
}) {
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) applySearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const normalizedSearch = search.trim().toLowerCase();
  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">The open shelf</span>
          <h1>Find your next book.</h1>
          <p>
            Browse the community catalog. Purchasing will be added here later.
          </p>
        </div>
        <Link className="button-link" to="/register">
          <Plus size={18} /> Join the library
        </Link>
      </section>
      <Status loading={loading} error={error} />
      <section className="panel search-bar" aria-label="Search the catalog">
        <label>
          <Search size={18} /> Search
          <input
            type="search"
            placeholder="Search by title, author, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        {normalizedSearch && (
          <p className="search-result-count" role="status">
            {loading
              ? "Searching..."
              : `${booksPagination.count} titles match.`}
          </p>
        )}
      </section>
      <section className="catalog-list" aria-label="Book catalog">
        {books.map((book) => (
          <BookCard book={book} key={book.id} />
        ))}
        {!loading && books.length === 0 && (
          <p>No books match your search.</p>
        )}
      </section>
      <Pagination
        count={booksPagination.count}
        page={page}
        hasNext={Boolean(booksPagination.next)}
        hasPrevious={Boolean(booksPagination.previous)}
        onChange={goToPage}
      />
    </>
  );
}

function Pagination({
  count,
  page,
  hasNext,
  hasPrevious,
  onChange,
}: {
  count: number;
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onChange: (page: number) => void;
}) {
  if (count === 0) return null;
  return (
    <nav className="pagination" aria-label="Book pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={!hasPrevious}
      >
        <ArrowLeft size={16} /> Previous
      </button>
      <span>
        Page {page} of {Math.ceil(count / 5)}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={!hasNext}
      >
        Next <ArrowRight size={16} />
      </button>
    </nav>
  );
}

function BookDetailPage({
  books,
  loading,
  error,
}: {
  books: Book[];
  loading: boolean;
  error: string;
}) {
  const { id } = useParams();
  const book = books.find((item) => item.id === Number(id));
  if (loading) return <Status loading />;
  if (error || !book)
    return (
      <>
        <Status error={error || "Book not found."} />
        <Link className="text-link" to="/catalog">
          Back to catalog
        </Link>
      </>
    );
  return (
    <>
      <Link className="text-link" to="/catalog">
        Back to catalog
      </Link>
      <article className="detail-page">
        <div className="cover-frame">
          {book.cover_image ? (
            <img src={book.cover_image} alt={`Cover of ${book.title}`} />
          ) : (
            <BookOpen size={40} />
          )}
        </div>
        <div>
          <span className="eyebrow">
            {book.author_detail?.name || "Independent title"}
          </span>
          <h1>{book.title}</h1>
          <p>{book.description || "No description added yet."}</p>
          <button type="button" disabled>
            <BookOpen size={18} /> Purchasing coming later
          </button>
        </div>
      </article>
    </>
  );
}

function DashboardPage({
  username,
  role,
  books,
  authors,
  loading,
  error,
}: {
  username: string;
  role: "author" | "reader";
  books: Book[];
  authors: Author[];
  loading: boolean;
  error: string;
}) {
  const ownedBooks = books.filter((book) => book.owner === username);
  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Your reading room</span>
          <h1>Good to see you, {username}.</h1>
          <p>
            {role === "author"
              ? "Explore the catalog or manage the titles you have added."
              : "Explore the catalog and discover your next read."}
          </p>
        </div>
        <Link className="button-link" to="/catalog">
          <BookOpen size={18} /> Browse catalog
        </Link>
      </section>
      <Status loading={loading} error={error} />
      <section className="stats">
        <div>
          <strong>{books.length}</strong>
          <span>Catalog titles</span>
        </div>
        <div>
          <strong>{authors.length}</strong>
          <span>Authors</span>
        </div>
        <div>
          <strong>{ownedBooks.length}</strong>
          <span>Your titles</span>
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <span className="eyebrow">For readers</span>
          <h2>Keep exploring</h2>
          <p>Purchase history will live here once checkout is connected.</p>
          <Link className="text-link" to="/catalog">
            Open catalog
          </Link>
        </div>
        {role === "author" && (
          <div className="panel">
            <span className="eyebrow">For contributors</span>
            <h2>Share your work</h2>
            <p>Add books and authors to build a richer shelf for everyone.</p>
            <Link className="text-link" to="/manage">
              Manage library
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function ManagePage({
  token,
  books,
  refresh,
}: {
  token: string;
  books: Book[];
  refresh: () => Promise<void>;
}) {
  const [bookForm, setBookForm] = useState(emptyBook);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(action: () => Promise<unknown>, success: () => void) {
    setSaving(true);
    setError("");
    try {
      await action();
      success();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }
  function selectCover(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Cover image must be a JPEG or PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be 5 MB or smaller.");
      return;
    }
    setError("");
    setBookForm({ ...bookForm, cover_image: file });
  }
  function submitBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.append("title", bookForm.title);
    data.append("description", bookForm.description);
    data.append("isbn", bookForm.isbn);
    if (bookForm.publication_date)
      data.append("publication_date", bookForm.publication_date);
    if (bookForm.cover_image) data.append("cover_image", bookForm.cover_image);
    void submit(
      () => createBook(data, token),
      () => setBookForm(emptyBook),
    );
  }
  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Your tools</span>
          <h1>Manage the library.</h1>
          <p>
            Add a book and its details. Covers must be JPEG or PNG and no larger
            than 5 MB.
          </p>
        </div>
      </section>
      <Status error={error} />
      <section className="grid manage-grid">
        <form className="panel" onSubmit={submitBook}>
          <h2>
            <BookOpen size={18} /> New book
          </h2>
          <label>
            Title
            <input
              required
              value={bookForm.title}
              onChange={(e) =>
                setBookForm({ ...bookForm, title: e.target.value })
              }
            />
          </label>
          <label>
            Cover image
            <input
              required
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => selectCover(e.target.files?.[0])}
            />
          </label>
          <label>
            Description
            <textarea
              value={bookForm.description}
              onChange={(e) =>
                setBookForm({ ...bookForm, description: e.target.value })
              }
            />
          </label>
          <button disabled={saving || !bookForm.cover_image}>
            <Plus size={18} /> Add book
          </button>
        </form>
      </section>
      <section className="list">
        {books.map((book) => (
          <BookCard book={book} key={book.id} />
        ))}
      </section>
    </>
  );
}

function AuthorsPage({
  authorAccounts,
}: {
  authorAccounts: { id: number; username: string }[];
}) {
  return (
    <>
      <section className="toolbar">
        <div>
          <span className="eyebrow">The voices</span>
          <h1>Meet the authors.</h1>
          <p>Registered author accounts and their published books.</p>
        </div>
      </section>
      <section className="author-list">
        {authorAccounts.map((author) => (
          <Link
            className="panel author-card"
            to={`/authors/${author.id}`}
            key={author.id}
          >
            <UserRound size={22} />
            <h2>{author.username}</h2>
            <p>Author account</p>
            <span className="text-link">View published books</span>
          </Link>
        ))}
      </section>
    </>
  );
}

function AuthorBooksPage({
  authorAccounts,
  books,
  loading,
  error,
}: {
  authorAccounts: { id: number; username: string }[];
  books: Book[];
  loading: boolean;
  error: string;
}) {
  const { id } = useParams();
  const author = authorAccounts.find((item) => item.id === Number(id));
  const publishedBooks = books.filter(
    (book) => book.owner === author?.username,
  );
  return (
    <>
      <Link className="text-link" to="/authors">
        Back to authors
      </Link>
      <section className="toolbar">
        <div>
          <span className="eyebrow">Published books</span>
          <h1>{author?.username || "Author"}</h1>
          <p>Books published by this author account.</p>
        </div>
      </section>
      <Status loading={loading} error={error} />
      {!loading && !error && publishedBooks.length === 0 && (
        <p>No published books found.</p>
      )}
      <section className="catalog-list">
        {publishedBooks.map((book) => (
          <BookCard book={book} key={book.id} />
        ))}
      </section>
    </>
  );
}

export default function AppRouter() {
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken") || "",
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "",
  );
  const [role, setRole] = useState<"author" | "reader">(
    () => (localStorage.getItem("role") as "author" | "reader") || "reader",
  );
  const library = useLibrary(token);
  function handleLogin(
    nextToken: string,
    nextUsername: string,
    nextRole: "author" | "reader",
  ) {
    localStorage.setItem("authToken", nextToken);
    localStorage.setItem("username", nextUsername);
    localStorage.setItem("role", nextRole);
    setToken(nextToken);
    setUsername(nextUsername);
    setRole(nextRole);
  }
  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setToken("");
    setUsername("");
    setRole("reader");
  }
  return (
    <Layout token={token} username={username} role={role} onLogout={logout}>
      <Routes>
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/dashboard" />
            ) : (
              <AuthPage mode="login" onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            token ? (
              <Navigate to="/dashboard" />
            ) : (
              <AuthPage mode="register" onLogin={handleLogin} />
            )
          }
        />
        <Route path="/catalog" element={<CatalogPage {...library} />} />
        <Route path="/catalog/:id" element={<BookDetailPage {...library} />} />
        <Route
          path="/dashboard"
          element={
            token ? (
              <DashboardPage username={username} role={role} {...library} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/authors"
          element={<AuthorsPage authorAccounts={library.authorAccounts} />}
        />
        <Route path="/authors/:id" element={<AuthorBooksPage {...library} />} />
        <Route
          path="/manage"
          element={
            token && role === "author" ? (
              <ManagePage token={token} {...library} />
            ) : (
              <Navigate to={token ? "/dashboard" : "/login"} />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={token ? "/dashboard" : "/catalog"} />}
        />
      </Routes>
    </Layout>
  );
}
