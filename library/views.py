from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, generics, status
from rest_framework.response import Response
from library.permissions import IsAuthor, IsOwnerOrReadOnly
from library.serializers import (
    AuthorSerializer,
    BookSerializer,
    AuthorAccountSerializer,
    RegisterSerializer,
    LoginSerializer,
)
from library.models import Author, Book, UserProfile


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile, _ = UserProfile.objects.get_or_create(
            user=serializer.validated_data["user"],
            defaults={"role": UserProfile.Role.AUTHOR},
        )
        data = {
            "token": serializer.validated_data["token"],
            "user": serializer.validated_data["user"].username,
            "role": profile.role,
        }
        return Response(data, status=status.HTTP_200_OK)


class AuthorListView(generics.ListCreateAPIView):
    queryset = Author.objects.all().order_by("name")
    serializer_class = AuthorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["name"]


class AuthorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class AuthorAccountListView(generics.ListAPIView):
    queryset = UserProfile.objects.select_related("user").filter(role=UserProfile.Role.AUTHOR)
    serializer_class = AuthorAccountSerializer
    permission_classes = [permissions.AllowAny]


class BookListView(generics.ListCreateAPIView):
    queryset = (
        Book.objects.select_related("author", "owner")
        .all()
        .order_by("-created_at")
    )
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["author", "owner"]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthor()]
        return [permissions.AllowAny()]


class BookDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Book.objects.select_related("author", "owner").all()
    serializer_class = BookSerializer
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAuthor(), IsOwnerOrReadOnly()]
