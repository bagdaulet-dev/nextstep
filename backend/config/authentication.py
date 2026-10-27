from datetime import timedelta

from django.contrib.auth import logout
from django.utils import timezone
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication


class PrivateSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if (
            result
            and result[0].is_demo
            and result[0].date_joined < timezone.now() - timedelta(hours=24)
        ):
            logout(request._request)
            return None
        return result


class SessionScheme(OpenApiAuthenticationExtension):
    target_class = "config.authentication.PrivateSessionAuthentication"
    name = "browserSession"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "nextstep_session",
            "description": "Use the browser session cookie. Unsafe requests also require X-CSRFToken from /api/auth/session/.",
        }
