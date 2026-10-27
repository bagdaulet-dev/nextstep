from datetime import date
from urllib.parse import urlsplit

from config.serializers import StrictModelSerializer, StrictSerializer, TextField
from django.utils import timezone
from rest_framework import serializers

from .models import Application, StatusEvent


class ApplicationSerializer(StrictModelSerializer):
    company = TextField(max_length=120)
    position = TextField(max_length=160)
    location = TextField(max_length=120, required=False, allow_blank=True)
    notes = TextField(max_length=4000, multiline=True, required=False, allow_blank=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "company",
            "position",
            "location",
            "work_mode",
            "job_url",
            "status",
            "notes",
            "applied_date",
            "follow_up_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_job_url(self, value):
        if not value:
            return value
        parts = urlsplit(value)
        if parts.scheme not in {"https", "http"} or parts.username or parts.password:
            raise serializers.ValidationError(
                "Use an HTTP or HTTPS job link without embedded credentials."
            )
        return value

    def validate(self, attrs):
        applied = attrs.get(
            "applied_date", getattr(self.instance, "applied_date", timezone.localdate())
        )
        follow_up = attrs.get("follow_up_date", getattr(self.instance, "follow_up_date", None))
        if not date(2000, 1, 1) <= applied <= date(2099, 12, 31):
            raise serializers.ValidationError(
                {"applied_date": "Choose a date between 2000 and 2099."}
            )
        if follow_up and (follow_up < applied or follow_up > date(2099, 12, 31)):
            raise serializers.ValidationError(
                {
                    "follow_up_date": "Choose a follow-up on or after the application date, no later than 2099."
                }
            )
        return attrs


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusEvent
        fields = ["id", "from_status", "to_status", "created_at"]
        read_only_fields = fields


class QuerySerializer(StrictSerializer):
    search = TextField(max_length=100, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Application.Status.choices, required=False)
    work_mode = serializers.ChoiceField(choices=Application.WorkMode.choices, required=False)
    ordering = serializers.ChoiceField(choices=["newest", "oldest", "company"], default="newest")
    page = serializers.IntegerField(min_value=1, max_value=10000, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=50, required=False)


class ActivitySerializer(serializers.Serializer):
    week = serializers.DateField()
    count = serializers.IntegerField()


class TotalsSerializer(serializers.Serializer):
    APPLIED = serializers.IntegerField()
    INTERVIEW = serializers.IntegerField()
    OFFER = serializers.IntegerField()
    REJECTED = serializers.IntegerField()


class StatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    active = serializers.IntegerField()
    applied_this_week = serializers.IntegerField()
    by_status = TotalsSerializer()
    activity = ActivitySerializer(many=True)
    follow_ups = ApplicationSerializer(many=True)


class ApplicationExportSerializer(ApplicationSerializer):
    events = EventSerializer(many=True, read_only=True)

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ["events"]
        read_only_fields = fields
