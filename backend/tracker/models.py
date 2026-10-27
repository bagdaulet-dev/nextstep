import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Application(models.Model):
    class Status(models.TextChoices):
        APPLIED = "APPLIED", "Applied"
        INTERVIEW = "INTERVIEW", "Interview"
        OFFER = "OFFER", "Offer"
        REJECTED = "REJECTED", "Rejected"

    class WorkMode(models.TextChoices):
        REMOTE = "REMOTE", "Remote"
        HYBRID = "HYBRID", "Hybrid"
        ONSITE = "ONSITE", "On-site"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications"
    )
    company = models.CharField(max_length=120)
    position = models.CharField(max_length=160)
    location = models.CharField(max_length=120, blank=True)
    work_mode = models.CharField(max_length=10, choices=WorkMode.choices, default=WorkMode.REMOTE)
    job_url = models.URLField(max_length=2048, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.APPLIED)
    notes = models.TextField(max_length=4000, blank=True)
    applied_date = models.DateField(default=timezone.localdate)
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-applied_date", "-created_at", "-id"]
        indexes = [
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["owner", "applied_date"]),
        ]


class StatusEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="events")
    from_status = models.CharField(max_length=12, choices=Application.Status.choices, blank=True)
    to_status = models.CharField(max_length=12, choices=Application.Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
