from pathlib import Path

from accounts.views import (
    DeleteAccountView,
    DemoView,
    ExportView,
    LoginView,
    LogoutView,
    RegisterView,
    SessionView,
)
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from tracker.views import ApplicationViewSet


def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)


class FrontendView(TemplateView):
    template_name = "index.html"

    def get(self, request, *args, **kwargs):
        if not Path(settings.FRONTEND_DIST / "index.html").exists():
            return JsonResponse(
                {
                    "message": "The interface is not built yet. Run npm run build from the project root."
                },
                status=503,
            )
        return super().get(request, *args, **kwargs)


router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="applications")
urlpatterns = [
    path("api/health/", health, name="health"),
    path("api/auth/session/", SessionView.as_view(), name="session"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/logout/", LogoutView.as_view(), name="logout"),
    path("api/auth/demo/", DemoView.as_view(), name="demo"),
    path("api/auth/export/", ExportView.as_view(), name="export-account"),
    path("api/auth/delete/", DeleteAccountView.as_view(), name="delete-account"),
    path("api/", include(router.urls)),
]
if settings.API_DOCS_ENABLED:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema", template_name="docs/swagger.html"),
            name="api-docs",
        ),
    ]
urlpatterns += [re_path(r"^(?!api/|static/).*$", FrontendView.as_view(), name="frontend")]
handler404 = "config.errors.not_found"
handler500 = "config.errors.server_error"
