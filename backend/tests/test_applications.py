from datetime import timedelta

import pytest
from django.utils import timezone
from tracker.models import Application, StatusEvent
from tracker.services import record_status


def url(application, suffix=""):
    return f"/api/applications/{application.id}/{suffix}"


@pytest.mark.parametrize(
    "path",
    [
        "/api/applications/",
        "/api/applications/stats/",
        "/api/auth/export/",
        "/api/auth/logout/",
        "/api/auth/delete/",
    ],
)
def test_private_endpoints_reject_anonymous(client, path):
    response = (
        client.post(path, {}, format="json")
        if path.endswith(("logout/", "delete/"))
        else client.get(path)
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_create_update_history_delete(authenticated, user):
    response = authenticated.post(
        "/api/applications/",
        {
            "company": "Nova",
            "position": "Python Engineer",
            "notes": "<script>alert('literal')</script>\r\nInterview notes",
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    data = response.json()
    application = Application.objects.get(id=data["id"])
    assert application.owner == user and "owner" not in data
    assert data["notes"].endswith("\nInterview notes")
    assert application.events.get().from_status == ""
    updated = authenticated.patch(url(application), {"status": "INTERVIEW"}, format="json")
    assert updated.status_code == 200
    events = authenticated.get(url(application, "history/")).json()
    assert len(events) == 2 and events[0]["from_status"] == "APPLIED"
    assert events[0]["to_status"] == "INTERVIEW"
    authenticated.patch(
        url(application), {"status": "INTERVIEW", "notes": "Keep a note"}, format="json"
    )
    assert application.events.count() == 2
    assert authenticated.delete(url(application)).status_code == 204
    assert not Application.objects.exists() and not StatusEvent.objects.exists()


@pytest.mark.parametrize(
    "method,suffix", [("get", ""), ("patch", ""), ("delete", ""), ("get", "history/")]
)
def test_other_account_cannot_access_record(authenticated, other, method, suffix):
    private = Application.objects.create(owner=other, company="Secret", position="Private")
    response = (
        getattr(authenticated, method)(url(private, suffix), {"status": "OFFER"}, format="json")
        if method == "patch"
        else getattr(authenticated, method)(url(private, suffix))
    )
    assert response.status_code == 404
    private.refresh_from_db()
    assert private.status == "APPLIED"


@pytest.mark.parametrize(
    "payload",
    [
        {"company": ""},
        {"company": 123},
        {"company": "x" * 121},
        {"position": "bad\nrole"},
        {"location": "bad\x01city"},
        {"notes": "x" * 4001},
        {"status": "UNKNOWN"},
        {"work_mode": "UNKNOWN"},
        {"job_url": "javascript:alert(1)"},
        {"job_url": "ftp://example.com/file"},
        {"job_url": "https://user:password@example.com/"},
        {"job_url": "https://[bad"},
        {"applied_date": "1999-12-31"},
        {"applied_date": "2100-01-01"},
        {"applied_date": "2026-02-30"},
        {"applied_date": "2026-10-10", "follow_up_date": "2026-10-09"},
        {"owner": "another-user"},
        {"id": "fake-id"},
        {"created_at": "2020-01-01"},
    ],
)
def test_invalid_inputs_have_no_side_effects(authenticated, payload):
    response = authenticated.post(
        "/api/applications/", {"company": "Nova", "position": "Engineer", **payload}, format="json"
    )
    assert response.status_code == 400, response.content
    assert not Application.objects.exists() and not StatusEvent.objects.exists()


def test_partial_update_revalidates_existing_followup_and_is_atomic(authenticated, application):
    application.applied_date = timezone.localdate()
    application.follow_up_date = application.applied_date + timedelta(days=2)
    application.save()
    response = authenticated.patch(
        url(application),
        {"applied_date": str(application.follow_up_date + timedelta(days=1)), "status": "OFFER"},
        format="json",
    )
    assert response.status_code == 400
    application.refresh_from_db()
    assert application.status == "APPLIED" and application.events.count() == 1


def test_search_filters_and_pagination_are_owner_scoped(authenticated, user, other):
    for index in range(5):
        Application.objects.create(
            owner=user,
            company=f"Nova {index}",
            position="Engineer",
            status="INTERVIEW",
            work_mode="HYBRID",
        )
    Application.objects.create(owner=user, company="Elsewhere", position="Designer")
    Application.objects.create(
        owner=other,
        company="Nova Other",
        position="Engineer",
        status="INTERVIEW",
        work_mode="HYBRID",
    )
    query = {
        "search": "nOvA",
        "status": "INTERVIEW",
        "work_mode": "HYBRID",
        "page_size": 2,
        "ordering": "company",
    }
    first = authenticated.get("/api/applications/", query).json()
    second = authenticated.get("/api/applications/", {**query, "page": 2}).json()
    assert first["count"] == 5 and len(first["results"]) == 2
    assert not {a["id"] for a in first["results"]} & {a["id"] for a in second["results"]}
    assert first["results"][0]["company"] == "Nova 0"
    assert authenticated.get("/api/applications/", {"search": "Designer"}).json()["count"] == 1


@pytest.mark.parametrize(
    "query",
    [
        {"page": 0},
        {"page_size": 51},
        {"status": "bad"},
        {"ordering": "unsafe"},
        {"owner": "fake"},
        {"search": "x" * 101},
    ],
)
def test_query_contract_is_bounded(authenticated, query):
    assert authenticated.get("/api/applications/", query).status_code == 400


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_bad_uuid_is_not_found(authenticated, method):
    args = ({"status": "OFFER"},) if method == "patch" else ()
    assert (
        getattr(authenticated, method)(
            "/api/applications/not-a-uuid/", *args, format="json"
        ).status_code
        == 404
    )


def test_status_history_is_bounded(application):
    for index in range(105):
        old = application.status
        application.status = "INTERVIEW" if index % 2 == 0 else "APPLIED"
        application.save(update_fields=["status"])
        record_status(application, old)
    assert application.events.count() == 100
    assert application.events.first().to_status == application.status


def test_stats_are_owned_and_followups_only_include_active_records(authenticated, user, other):
    today = timezone.localdate()
    for state in Application.Status.values:
        Application.objects.create(
            owner=user,
            company=state,
            position="Engineer",
            status=state,
            applied_date=today,
            follow_up_date=today + timedelta(days=1),
        )
    Application.objects.create(
        owner=other, company="Private Other", position="Engineer", status="OFFER"
    )
    data = authenticated.get("/api/applications/stats/").json()
    assert data["total"] == 4 and data["active"] == 2
    assert data["by_status"] == dict.fromkeys(Application.Status.values, 1)
    assert len(data["activity"]) == 8 and data["activity"][-1]["count"] == 4
    assert data["applied_this_week"] == 4
    assert {a["status"] for a in data["follow_ups"]} == {"APPLIED", "INTERVIEW"}


def test_application_capacity_is_enforced(authenticated, user):
    Application.objects.bulk_create(
        [Application(owner=user, company="Archive", position=str(i)) for i in range(1000)]
    )
    response = authenticated.post(
        "/api/applications/", {"company": "Extra", "position": "Engineer"}, format="json"
    )
    assert response.status_code == 400 and Application.objects.count() == 1000
