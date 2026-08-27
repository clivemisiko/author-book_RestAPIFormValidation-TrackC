from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from library.models import Author, Book, UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        default=UserProfile.Role.READER,
    )

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2", "role"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords must match."})
        if User.objects.filter(email=attrs.get("email")).exists():
            raise serializers.ValidationError({"email": "A user with that email already exists."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        role = validated_data.pop("role", UserProfile.Role.READER)
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.create(user=user, role=role)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid username or password.")

        token, _ = Token.objects.get_or_create(user=user)
        attrs["user"] = user
        attrs["token"] = token.key
        return attrs


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["id", "name", "bio", "created_at"]
        read_only_fields = ["id", "created_at"]


class AuthorAccountSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["id", "username", "role"]


class BookSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    author_detail = AuthorSerializer(source="author", read_only=True)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.cover_image:
            request = self.context.get("request")
            representation["cover_image"] = (
                request.build_absolute_uri(instance.cover_image.url)
                if request
                else instance.cover_image.url
            )
        return representation

    class Meta:
        model = Book
        fields = [
            "id",
            "author",
            "author_detail",
            "title",
            "description",
            "cover_image",
            "isbn",
            "publication_date",
            "created_at",
            "owner",
        ]
        read_only_fields = ["id", "created_at", "owner"]
