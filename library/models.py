from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from PIL import Image

MAX_COVER_SIZE = 5 * 1024 * 1024


def validate_cover_image(image):
    if image.size > MAX_COVER_SIZE:
        raise ValidationError("Cover image must be 5 MB or smaller.")
    try:
        with Image.open(image) as opened_image:
            if opened_image.format not in {"JPEG", "PNG"}:
                raise ValidationError("Cover image must be a JPEG or PNG.")
    except ValidationError:
        raise
    except (OSError, Image.UnidentifiedImageError) as error:
        raise ValidationError("Upload a valid JPEG or PNG image.") from error


class Author(models.Model):
    name = models.CharField(max_length=150)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["name"], name="author_name_idx")]

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    class Role(models.TextChoices):
        AUTHOR = "author", "Author"
        READER = "reader", "Reader"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.AUTHOR)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Book(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name="books",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(
        blank=True,
        upload_to="book-covers/",
        validators=[validate_cover_image],
    )
    isbn = models.CharField(max_length=20, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="books",
        null=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["author", "-created_at"], name="book_author_created_idx"),
            models.Index(fields=["owner", "-created_at"], name="book_owner_created_idx"),
        ]

    def __str__(self):
        return self.title
