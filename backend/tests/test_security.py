from unittest.mock import patch

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from .conftest import PASSWORD, csrf_client


def test_authenticated_mutation_requires_valid_csrf(user):
    client, token = csrf_client()
    response = client.post(
        "/api/auth/login/",
        {"email": user.email, "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    payload = {"company": "Nova", "position": "Engineer"}
    assert client.post("/api/applications/", payload, format="json").status_code == 403
    assert (
        client.post(
            "/api/applications/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=response.json()["csrf_token"],
        ).status_code
        == 201
    )


def test_foreign_origin_is_rejected():
    client, token = csrf_client()
    response = client.post(
        "/api/auth/demo/",
        {},
        format="json",
        HTTP_X_CSRFTOKEN=token,
        HTTP_ORIGIN="https://evil.example",
    )
    assert response.status_code == 403


@pytest.mark.parametrize("body", ["[]", '"string"', "null", "{invalid"])
def test_only_valid_json_objects(authenticated, body):
    response = authenticated.post("/api/applications/", body, content_type="application/json")
    assert response.status_code == 400 and response.json()["error"]["code"] == "PARSE_ERROR"


def test_large_body_rejected_before_auth(client):
    response = client.post(
        "/api/auth/register/", '{"notes":"' + "x" * 65536 + '"}', content_type="application/json"
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_security_headers_and_database_health(client):
    response = client.get("/api/health/")
    assert response.json() == {"status": "ok"}
    assert "script-src 'self'" in response["Content-Security-Policy"]
    assert "'unsafe-inline'" not in response["Content-Security-Policy"]
    assert response["X-Frame-Options"] == "DENY"
    assert response["X-Content-Type-Options"] == "nosniff"


def test_database_failure_is_sanitized(client):
    with patch(
        "config.urls.connection.cursor", side_effect=RuntimeError("SECRET DATABASE PASSWORD")
    ):
        response = client.get("/api/health/")
    assert response.status_code == 503
    assert "SECRET" not in response.content.decode()


def test_unexpected_api_error_is_sanitized(authenticated):
    with patch("tracker.views.stats_for", side_effect=RuntimeError("SECRET CUSTOMER DATA")):
        response = authenticated.get("/api/applications/stats/")
    assert response.status_code == 503
    assert "SECRET" not in response.content.decode()


def test_cookie_flags_for_https(user):
    with override_settings(SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True):
        client = APIClient()
        response = client.post(
            "/api/auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
            secure=True,
        )
        assert response.cookies["nextstep_session"]["secure"]
        assert response.cookies["nextstep_session"]["httponly"]
        assert response.cookies["nextstep_csrf"]["secure"]


def test_authentication_endpoint_is_throttled(client):
    for _ in range(10):
        response = client.post(
            "/api/auth/login/",
            {"email": "missing@example.invalid", "password": PASSWORD},
            format="json",
        )
        assert response.status_code == 400
    response = client.post(
        "/api/auth/login/",
        {"email": "missing@example.invalid", "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 429
    assert "Retry-After" in response
