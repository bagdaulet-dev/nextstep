import logging

from django.http import JsonResponse
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def csrf_failure(request, reason=""):
    return JsonResponse(
        {"error": {"code": "CSRF_FAILED", "message": "Refresh the page and try again."}}, status=403
    )


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        logger.error("API request failed (%s)", type(exc).__name__)
        return JsonResponse(
            {
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "The service is temporarily unavailable. Please try again.",
                }
            },
            status=503,
        )
    code = str(getattr(exc, "default_code", "REQUEST_FAILED")).upper()
    fields = None
    if isinstance(exc, ValidationError):
        code = "VALIDATION_ERROR"
        fields = response.data
        message = "Check the highlighted fields and try again."
    elif isinstance(exc, NotAuthenticated):
        code, message = "NOT_AUTHENTICATED", "Sign in to open your workspace."
    elif isinstance(exc, PermissionDenied) and "CSRF" in str(exc.detail):
        code, message = "CSRF_FAILED", "Refresh the page and try again."
    else:
        message = str(getattr(exc, "detail", "This request could not be completed."))
    response.data = {
        "error": {"code": code, "message": message, **({"fields": fields} if fields else {})}
    }
    return response


def not_found(request, exception=None):
    return JsonResponse(
        {"error": {"code": "NOT_FOUND", "message": "This page or resource was not found."}},
        status=404,
    )


def server_error(request):
    return JsonResponse(
        {
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "The service is temporarily unavailable.",
            }
        },
        status=503,
    )
