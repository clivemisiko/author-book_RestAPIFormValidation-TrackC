from django.urls import path
from library import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("authors/", views.AuthorListView.as_view(), name="author-list-create"),
    path("authors/<int:pk>/", views.AuthorDetailView.as_view(), name="author-detail"),
    path("author-accounts/", views.AuthorAccountListView.as_view(), name="author-account-list"),
    path("books/", views.BookListView.as_view(), name="book-list-create"),
    path("books/<int:pk>/", views.BookDetailView.as_view(), name="book-detail"),
]
