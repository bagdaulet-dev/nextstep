import uuid

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token, rotate_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from tracker.models import Application
from tracker.serializers import ApplicationExportSerializer

from .demo import populate_demo
from .serializers import (
    DeleteAccountSerializer,
    LoginSerializer,
    RegisterSerializer,
    SessionSerializer,
    UserSerializer,
)

User = get_user_model()


def session_data(request):
    return {
        "user": UserSerializer(request.user).data if request.user.is_authenticated else None,
        "csrf_token": get_token(request),
        "demo_enabled": settings.DEMO_ENABLED,
        "mode": settings.APP_MODE,
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=SessionSerializer)
    def get(self, request):
        return Response(session_data(request))


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: SessionSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = User.objects.create_user(**serializer.validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"email": ["This email cannot be used. Try signing in."]}
            ) from exc
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        request.user = user
        return Response(session_data(request), status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=LoginSerializer, responses=SessionSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if user is None or user.is_demo:
            return Response(
                {
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Email or password is incorrect.",
                    }
                },
                status=400,
            )
        login(request, user)
        request.user = user
        return Response(session_data(request))


class LogoutView(APIView):
    @extend_schema(request=None, responses=SessionSerializer)
    def post(self, request):
        logout(request)
        rotate_token(request)
        return Response(session_data(request))


@method_decorator(csrf_protect, name="dispatch")
class DemoView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle, AnonRateThrottle]
    throttle_scope = "demo"

    @extend_schema(request=None, responses=SessionSerializer)
    def post(self, request):
        if not settings.DEMO_ENABLED:
            from rest_framework.exceptions import NotFound

            raise NotFound()
        with transaction.atomic():
            user = User.objects.create_user(
                email=f"demo-{uuid.uuid4().hex}@nextstep.invalid",
                password=None,
                name="Alex Morgan",
                is_demo=True,
            )
            populate_demo(user)
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        request.session.set_expiry(24 * 3600)
        request.user = user
        return Response(session_data(request))


class AccountExportSerializer(serializers.Serializer):
    user = UserSerializer()
    exported_at = serializers.DateTimeField()
    applications = ApplicationExportSerializer(many=True)


class ExportView(APIView):
    @extend_schema(responses=AccountExportSerializer)
    def get(self, request):
        applications = Application.objects.filter(owner=request.user).prefetch_related("events")
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "exported_at": timezone.now(),
                "applications": ApplicationExportSerializer(applications, many=True).data,
            }
        )


class DeleteAccountView(APIView):
    @extend_schema(request=DeleteAccountSerializer, responses=SessionSerializer)
    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.is_demo and not request.user.check_password(
            serializer.validated_data.get("password", "")
        ):
            raise serializers.ValidationError(
                {"password": ["Enter your current password to delete the account."]}
            )
        with transaction.atomic():
            request.user.delete()
        logout(request)
        rotate_token(request)
        return Response(session_data(request))
