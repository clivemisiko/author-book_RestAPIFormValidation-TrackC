import { test, expect } from "@playwright/test";

const author = { id: 1, username: "author", role: "author" };
const initialBook = {
  id: 1,
  author: null,
  author_detail: null,
  title: "Existing title",
  description: "Already on the shelf",
  cover_image: null,
  isbn: "",
  publication_date: null,
  created_at: "2026-08-27T00:00:00Z",
  owner: "author",
};
const createdBook = {
  ...initialBook,
  id: 2,
  title: "A New Chapter",
  cover_image: "http://127.0.0.1:8000/media/book-covers/new-cover.png",
};

test("author logs in, creates a book, and sees it listed", async ({ page }) => {
  let bookList = [initialBook];

  await page.route("**/login/", async (route) => {
    await route.fulfill({
      json: { token: "test-token", user: author.username, role: author.role },
    });
  });
  await page.route("**/authors/", async (route) => {
    await route.fulfill({
      json: { count: 0, next: null, previous: null, results: [] },
    });
  });
  await page.route("**/author-accounts/", async (route) => {
    await route.fulfill({
      json: { count: 1, next: null, previous: null, results: [author] },
    });
  });
  await page.route("**/books/**", async (route) => {
    if (route.request().method() === "POST") {
      bookList = [...bookList, createdBook];
      await route.fulfill({ status: 201, json: createdBook });
      return;
    }
    await route.fulfill({
      json: {
        count: bookList.length,
        next: null,
        previous: null,
        results: bookList,
      },
    });
  });

  await page.goto("/login");
  await page.getByLabel("Username").fill("author");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Manage library" })
    .click();
  await expect(page).toHaveURL(/manage/);

  await page.getByLabel("Title").fill("A New Chapter");
  await page.getByLabel("Cover image").setInputFiles({
    name: "new-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake png content"),
  });
  await page.getByRole("button", { name: /add book/i }).click();

  await expect(
    page.getByRole("heading", { name: "A New Chapter" }),
  ).toBeVisible();
});
