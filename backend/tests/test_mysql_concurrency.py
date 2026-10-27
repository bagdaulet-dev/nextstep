from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import close_old_connections, connection
from rest_framework.test import APIClient
from tracker.models import Application

pytestmark = pytest.mark.django_db(transaction=True)


def worker(user, method, path, payload):
    close_old_connections()
    try:
        client = APIClient()
        client.force_authenticate(user)
        return getattr(client, method)(path, payload, format="json").status_code
    finally:
        close_old_connections()


def test_mysql_serializes_concurrent_status_updates(user, application):
    if connection.vendor != "mysql":
        pytest.skip("Row locking requires the MySQL test profile")
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(
                worker, user, "patch", f"/api/applications/{application.id}/", {"status": state}
            )
            for state in ["OFFER", "REJECTED"]
        ]
        assert [future.result() for future in futures] == [200, 200]
    application.refresh_from_db()
    history = list(application.events.order_by("created_at", "id"))
    assert len(history) == 3
    assert history[1].from_status == "APPLIED"
    assert history[2].from_status == history[1].to_status
    assert history[2].to_status == application.status


def test_mysql_serializes_concurrent_capacity_checks(user):
    if connection.vendor != "mysql":
        pytest.skip("Row locking requires the MySQL test profile")
    Application.objects.bulk_create(
        [Application(owner=user, company="Archive", position=str(index)) for index in range(999)]
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(
                worker,
                user,
                "post",
                "/api/applications/",
                {"company": "Nova", "position": "Engineer"},
            )
            for _ in range(2)
        ]
        assert sorted(future.result() for future in futures) == [201, 400]
    assert Application.objects.filter(owner=user).count() == 1000
