import pytest
from accounts.models import User
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient
from tracker.models import Application
from tracker.services import record_status

PASSWORD = "Orbit!PineHills2026"


@pytest.fixture(autouse=True)
def test_environment(settings, db):
    settings.ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
    settings.DEMO_ENABLED = True
    settings.SECURE_SSL_REDIRECT = False
    call_command("createcachetable", verbosity=0)
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user("alex@example.invalid", PASSWORD, name="Alex Test")


@pytest.fixture
def other():
    return User.objects.create_user("other@example.invalid", PASSWORD, name="Other Test")


@pytest.fixture
def authenticated(client, user):
    client.force_authenticate(user)
    return client


@pytest.fixture
def application(user):
    app = Application.objects.create(owner=user, company="Northstar", position="Backend Engineer")
    record_status(app)
    return app


def csrf_client():
    client = APIClient(enforce_csrf_checks=True)
    token = client.get("/api/auth/session/").json()["csrf_token"]
    return client, token


def register(client, token, email="new@example.invalid"):
    return client.post(
        "/api/auth/register/",
        {"email": email, "name": "Nova Test", "password": PASSWORD},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
