from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from io import BytesIO
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from library.models import Author, Book


class AuthorModelTest(TestCase):
    def test_create_author(self) -> None:
        author = Author.objects.create(name="Octavia Butler", bio="Science fiction author")
        self.assertEqual(author.name, "Octavia Butler")
        self.assertEqual(author.bio, "Science fiction author")

    def test_author_str_method(self) -> None:
        author = Author.objects.create(name="Nnedi Okorafor")
        self.assertEqual(str(author), "Nnedi Okorafor")


class BookModelTest(TestCase):
    def test_create_book_linked_to_author(self) -> None:
        author = Author.objects.create(name="Chinua Achebe")
        book = Book.objects.create(
            author=author,
            title="Things Fall Apart",
            description="A classic novel",
            isbn="9780385474542",
        )
        self.assertEqual(book.author, author)
        self.assertIn(book, author.books.all())

    def test_deleting_author_deletes_books(self) -> None:
        author = Author.objects.create(name="Chinua Achebe")
        Book.objects.create(author=author, title="Things Fall Apart")
        self.assertEqual(Book.objects.count(), 1)

        author.delete()
        self.assertEqual(Book.objects.count(), 0)


class AuthorListViewTests(TestCase):
    def test_no_authors_returns_empty_results(self) -> None:
        response = self.client.get(reverse("author-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_author_appears_in_list(self) -> None:
        Author.objects.create(name="Visible Author")
        response = self.client.get(reverse("author-list-create"))
        names = [author["name"] for author in response.json()["results"]]
        self.assertIn("Visible Author", names)


class UserRegistrationAPITests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_register_user_success(self) -> None:
        response = self.client.post(
            reverse("register"),
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "StrongPass123!",
                "password2": "StrongPass123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_user_validation_failure(self) -> None:
        response = self.client.post(
            reverse("register"),
            {
                "username": "newuser",
                "email": "not-an-email",
                "password": "StrongPass123!",
                "password2": "DifferentPass123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="loginuser",
            email="loginuser@example.com",
            password="StrongPass123!",
        )

    def test_login_success(self) -> None:
        response = self.client.post(
            reverse("login"),
            {"username": "loginuser", "password": "StrongPass123!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_login_invalid_credentials(self) -> None:
        response = self.client.post(
            reverse("login"),
            {"username": "loginuser", "password": "wrongpass"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class BookAPITests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user(username="owner", password="ownerpass123")
        self.other_user = User.objects.create_user(
            username="other", password="otherpass123"
        )
        self.owner_token = Token.objects.create(user=self.owner)
        self.other_token = Token.objects.create(user=self.other_user)

        self.client = APIClient()
        self.author = Author.objects.create(name="Existing Author")
        self.book = Book.objects.create(
            author=self.author,
            title="Existing Book",
            description="Some description",
            isbn="1234567890",
            owner=self.owner,
        )

    def test_list_books_success(self) -> None:
        response = self.client.get(reverse("book-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(REST_FRAMEWORK={
        "DEFAULT_PAGINATION_CLASS": None,
        "DEFAULT_FILTER_BACKENDS": [
            "django_filters.rest_framework.DjangoFilterBackend"
        ],
    })
    def test_list_books_uses_constant_queries_for_related_objects(self) -> None:
        Book.objects.create(title="Second Book", author=self.author, owner=self.owner)
        Book.objects.create(title="Third Book", author=self.author, owner=self.owner)

        with self.assertNumQueries(2):
            response = self.client.get(reverse("book-list-create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 3)

    def test_create_book_success(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.owner_token.key}")
        response = self.client.post(
            reverse("book-list-create"),
            {
                "author": self.author.pk,
                "title": "New Book",
                "description": "Some description",
                "isbn": "9780000000001",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["owner"], "owner")
        self.assertEqual(response.data["author"], self.author.pk)

    def test_create_book_accepts_cover_upload(self) -> None:
        image_data = BytesIO()
        Image.new("RGB", (40, 40), "#165a4a").save(image_data, format="PNG")
        image_data.seek(0)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.owner_token.key}")

        response = self.client.post(
            reverse("book-list-create"),
            {
                "title": "Book With Cover",
                "cover_image": SimpleUploadedFile(
                    "cover.png", image_data.read(), content_type="image/png"
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("/media/book-covers/cover", response.data["cover_image"])

    def test_create_book_validation_failure(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.owner_token.key}")
        response = self.client.post(reverse("book-list-create"), {"title": ""})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_book_unauthenticated(self) -> None:
        response = self.client.post(
            reverse("book-list-create"),
            {"author": self.author.pk, "title": "New Book"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_book_success(self) -> None:
        response = self.client.get(reverse("book-detail", kwargs={"pk": self.book.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Existing Book")
        self.assertEqual(response.data["author_detail"]["name"], "Existing Author")

    def test_retrieve_book_not_found(self) -> None:
        response = self.client.get(reverse("book-detail", kwargs={"pk": 9999}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_update_own_book(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.owner_token.key}")
        response = self.client.patch(
            reverse("book-detail", kwargs={"pk": self.book.pk}),
            {"title": "Updated Title"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Title")

    def test_non_owner_cannot_update_book(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.other_token.key}")
        response = self.client.patch(
            reverse("book-detail", kwargs={"pk": self.book.pk}),
            {"title": "Changed Title"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Existing Book")

    def test_update_book_unauthenticated(self) -> None:
        response = self.client.patch(
            reverse("book-detail", kwargs={"pk": self.book.pk}),
            {"title": "Should Not Work"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_delete_own_book(self) -> None:
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.owner_token.key}")
        response = self.client.delete(reverse("book-detail", kwargs={"pk": self.book.pk}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Book.objects.filter(pk=self.book.pk).exists())


class CorsHeaderTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_allowed_origin_receives_access_control_header(self) -> None:
        response = self.client.get(
            reverse("book-list-create"),
            HTTP_ORIGIN="http://localhost:5173",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "http://localhost:5173",
        )

    def test_disallowed_origin_does_not_receive_access_control_header(self) -> None:
        response = self.client.get(
            reverse("book-list-create"),
            HTTP_ORIGIN="http://malicious-site.example.com",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))

    @override_settings(CORS_ALLOWED_ORIGINS=["http://104.248.50.1:5173"])
    def test_staging_origin_allowed_when_configured(self) -> None:
        response = self.client.get(
            reverse("book-list-create"),
            HTTP_ORIGIN="http://104.248.50.1:5173",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "http://104.248.50.1:5173",
        )
