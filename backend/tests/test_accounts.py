from datetime import timedelta

import pytest
from accounts.models import User
from django.contrib.sessions.models import Session
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from tracker.models import Application, StatusEvent

from .conftest import PASSWORD, csrf_client, register


def test_session_is_anonymous_and_sets_private_csrf_cookie(client):
    response = client.get("/api/auth/session/")
    assert response.status_code == 200
    assert response.json()["user"] is None
    cookie = response.cookies["nextstep_csrf"]
    assert cookie["httponly"] and cookie["samesite"] == "Lax"
    assert response["Cache-Control"] == "no-store"


@pytest.mark.parametrize("path", ["register", "login", "demo"])
def test_anonymous_account_writes_require_csrf(path):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post(f"/api/auth/{path}/", {}, format="json")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_FAILED"


def test_registration_hashes_password_rotates_csrf_and_persists_session():
    client, token = csrf_client()
    response = register(client, token, " NOVA@EXAMPLE.INVALID ")
    assert response.status_code == 201, response.content
    user = User.objects.get(email="nova@example.invalid")
    assert user.password.startswith("argon2$")
    assert user.check_password(PASSWORD)
    assert not user.is_staff and not user.is_superuser
    assert response.json()["csrf_token"] != token
    second = APIClient()
    second.cookies = client.cookies
    assert second.get("/api/auth/session/").json()["user"]["id"] == str(user.id)
    assert "password" not in response.json()["user"]


@pytest.mark.parametrize(
    "payload",
    [
        {"password": "password"},
        {"password": "123456789012"},
        {"password": "x" * 129},
        {"name": "\x01bad"},
        {"name": 123},
        {"email": "invalid"},
        {"is_superuser": True},
        {"is_demo": True},
    ],
)
def test_registration_rejects_invalid_and_privilege_fields(client, payload):
    data = {"name": "Nova", "email": "nova@example.invalid", "password": PASSWORD, **payload}
    response = client.post("/api/auth/register/", data, format="json")
    assert response.status_code == 400
    assert User.objects.count() == 0


def test_email_unique_and_login_normalizes_case(client, user):
    duplicate = client.post(
        "/api/auth/register/",
        {"name": "Different", "email": user.email.upper(), "password": PASSWORD},
        format="json",
    )
    assert duplicate.status_code == 400
    response = client.post(
        "/api/auth/login/", {"email": user.email.upper(), "password": PASSWORD}, format="json"
    )
    assert response.status_code == 200
    assert response.json()["user"]["id"] == str(user.id)


def test_login_failures_are_generic(client, user):
    responses = [
        client.post(
            "/api/auth/login/", {"email": email, "password": "Wrong!Password"}, format="json"
        )
        for email in [user.email, "missing@example.invalid"]
    ]
    assert responses[0].status_code == responses[1].status_code == 400
    assert responses[0].json() == responses[1].json()


def test_logout_requires_csrf_and_invalidates_session(user):
    client, token = csrf_client()
    signed_in = client.post(
        "/api/auth/login/",
        {"email": user.email, "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert signed_in.status_code == 200
    assert client.post("/api/auth/logout/", {}, format="json").status_code == 403
    response = client.post(
        "/api/auth/logout/", {}, format="json", HTTP_X_CSRFTOKEN=signed_in.json()["csrf_token"]
    )
    assert response.status_code == 200 and response.json()["user"] is None
    assert client.get("/api/applications/").status_code == 403


def test_demo_workspaces_are_private_and_not_password_accounts(client):
    first = client.post("/api/auth/demo/", {}, format="json").json()["user"]
    second = APIClient().post("/api/auth/demo/", {}, format="json").json()["user"]
    assert first["id"] != second["id"]
    assert User.objects.get(id=first["id"]).has_usable_password() is False
    assert Application.objects.filter(owner_id=first["id"]).count() == 14
    assert Application.objects.filter(owner_id=second["id"]).count() == 14


def test_disabled_demo_returns_not_found(client, settings):
    settings.DEMO_ENABLED = False
    assert client.post("/api/auth/demo/", {}, format="json").status_code == 404


def test_expired_demo_loses_access_and_cleanup_preserves_real_users(client, user):
    demo = client.post("/api/auth/demo/", {}, format="json").json()["user"]
    User.objects.filter(id=demo["id"]).update(date_joined=timezone.now() - timedelta(hours=25))
    assert client.get("/api/applications/").status_code == 403
    assert client.get("/api/auth/session/").json()["user"] is None
    call_command("purge_expired_data", verbosity=0)
    assert not User.objects.filter(id=demo["id"]).exists()
    assert not Application.objects.filter(owner_id=demo["id"]).exists()
    assert User.objects.filter(id=user.id).exists()


def test_export_only_owned_data_without_secrets(authenticated, application, other):
    Application.objects.create(owner=other, company="Private Other", position="Engineer")
    data = authenticated.get("/api/auth/export/").json()
    assert len(data["applications"]) == 1
    assert data["applications"][0]["id"] == str(application.id)
    assert len(data["applications"][0]["events"]) == 1
    assert "password" not in data["user"] and "owner" not in data["applications"][0]


@pytest.mark.parametrize(
    "payload",
    [
        {"confirmation": "DELETE"},
        {"confirmation": "DELETE", "password": "wrong"},
        {"confirmation": "delete", "password": PASSWORD},
    ],
)
def test_delete_requires_confirmation_and_current_password(authenticated, user, payload):
    assert authenticated.post("/api/auth/delete/", payload, format="json").status_code == 400
    assert User.objects.filter(pk=user.pk).exists()


def test_delete_cascades_and_logs_out(client, user, application):
    client.force_login(user)
    key = client.session.session_key
    response = client.post(
        "/api/auth/delete/", {"confirmation": "DELETE", "password": PASSWORD}, format="json"
    )
    assert response.status_code == 200 and response.json()["user"] is None
    assert not User.objects.filter(id=user.id).exists()
    assert not Application.objects.exists() and not StatusEvent.objects.exists()
    assert not Session.objects.filter(session_key=key).exists()
