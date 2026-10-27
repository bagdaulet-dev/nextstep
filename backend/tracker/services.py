from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from .models import Application, StatusEvent
from .serializers import ApplicationSerializer


def stats_for(user):
    owned = Application.objects.filter(owner=user)
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    start = monday - timedelta(weeks=7)
    by_status = {status: 0 for status in Application.Status.values}
    by_status.update(
        {row["status"]: row["count"] for row in owned.values("status").annotate(count=Count("id"))}
    )
    weeks = {start + timedelta(weeks=i): 0 for i in range(8)}
    for row in (
        owned.filter(applied_date__gte=start, applied_date__lt=monday + timedelta(weeks=1))
        .values("applied_date")
        .annotate(count=Count("id"))
    ):
        week = row["applied_date"] - timedelta(days=row["applied_date"].weekday())
        weeks[week] += row["count"]
    upcoming = owned.filter(
        status__in=[Application.Status.APPLIED, Application.Status.INTERVIEW],
        follow_up_date__isnull=False,
    ).order_by("follow_up_date", "id")[:4]
    return {
        "total": sum(by_status.values()),
        "active": by_status["APPLIED"] + by_status["INTERVIEW"],
        "applied_this_week": weeks[monday],
        "by_status": by_status,
        "activity": [{"week": week, "count": count} for week, count in weeks.items()],
        "follow_ups": ApplicationSerializer(upcoming, many=True).data,
    }


def record_status(application, old_status=""):
    if old_status == application.status:
        return
    StatusEvent.objects.create(
        application=application, from_status=old_status, to_status=application.status
    )
    # Keep a bounded audit trail while preserving the current application indefinitely.
    expired = list(application.events.values_list("id", flat=True)[100:])
    if expired:
        StatusEvent.objects.filter(id__in=expired).delete()
