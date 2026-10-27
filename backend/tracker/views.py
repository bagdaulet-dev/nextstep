from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Application
from .serializers import ApplicationSerializer, EventSerializer, QuerySerializer, StatsSerializer
from .services import record_status, stats_for


class ApplicationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class ApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ApplicationSerializer
    pagination_class = ApplicationPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Application.objects.none()
        return Application.objects.filter(owner=self.request.user)

    @extend_schema(parameters=[QuerySerializer])
    def list(self, request, *args, **kwargs):
        query = QuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        options = query.validated_data
        records = self.get_queryset()
        if options.get("search"):
            records = records.filter(
                Q(company__icontains=options["search"]) | Q(position__icontains=options["search"])
            )
        for field in ["status", "work_mode"]:
            if options.get(field):
                records = records.filter(**{field: options[field]})
        order = {
            "newest": ["-applied_date", "-created_at", "-id"],
            "oldest": ["applied_date", "created_at", "id"],
            "company": ["company", "-applied_date", "id"],
        }[options["ordering"]]
        page = self.paginate_queryset(records.order_by(*order))
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @transaction.atomic
    def perform_create(self, serializer):
        # Serialize account-level capacity checks without allowing the client to choose an owner.
        get_user_model().objects.select_for_update().get(pk=self.request.user.pk)
        if self.get_queryset().count() >= 1000:
            raise ValidationError(
                {
                    "non_field_errors": [
                        "Keep up to 1,000 applications. Export and remove older records before adding more."
                    ]
                }
            )
        application = serializer.save(owner=self.request.user)
        record_status(application)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        from rest_framework.generics import get_object_or_404

        application = get_object_or_404(self.get_queryset().select_for_update(), pk=kwargs["pk"])
        old_status = application.status
        serializer = self.get_serializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_status(application, old_status)
        return Response(serializer.data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        from rest_framework.generics import get_object_or_404

        application = get_object_or_404(self.get_queryset().select_for_update(), pk=kwargs["pk"])
        application.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses=EventSerializer(many=True))
    @action(detail=True, methods=["get"], pagination_class=None)
    def history(self, request, pk=None):
        application = self.get_object()
        return Response(EventSerializer(application.events.all(), many=True).data)

    @extend_schema(responses=StatsSerializer)
    @action(detail=False, methods=["get"], pagination_class=None, url_path="stats")
    def stats(self, request):
        return Response(stats_for(request.user), status=status.HTTP_200_OK)
