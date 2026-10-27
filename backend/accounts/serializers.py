from config.serializers import StrictSerializer, TextField
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "is_demo"]
        read_only_fields = fields


class RegisterSerializer(StrictSerializer):
    name = TextField(max_length=80)
    email = serializers.EmailField(max_length=254)
    password = TextField(write_only=True, trim_whitespace=False, min_length=10, max_length=128)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email cannot be used. Try signing in.")
        return value

    def validate(self, attrs):
        try:
            password_validation.validate_password(
                attrs["password"], User(email=attrs["email"], name=attrs["name"])
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs


class LoginSerializer(StrictSerializer):
    email = serializers.EmailField(max_length=254)
    password = TextField(write_only=True, trim_whitespace=False, max_length=128)


class SessionSerializer(serializers.Serializer):
    user = UserSerializer(allow_null=True)
    csrf_token = serializers.CharField()
    demo_enabled = serializers.BooleanField()
    mode = serializers.CharField()


class DeleteAccountSerializer(StrictSerializer):
    confirmation = serializers.ChoiceField(choices=["DELETE"])
    password = TextField(
        write_only=True, trim_whitespace=False, max_length=128, required=False, allow_blank=True
    )
