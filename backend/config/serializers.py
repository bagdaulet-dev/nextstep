import unicodedata

from rest_framework import serializers


class StrictFieldsMixin:
    def to_internal_value(self, data):
        if isinstance(data, dict):
            forbidden = set(data) - set(self.fields)
            forbidden |= {key for key in data if key in self.fields and self.fields[key].read_only}
            if forbidden:
                raise serializers.ValidationError(
                    {"non_field_errors": ["Unexpected or read-only fields were submitted."]}
                )
        return super().to_internal_value(data)


class StrictSerializer(StrictFieldsMixin, serializers.Serializer):
    pass


class StrictModelSerializer(StrictFieldsMixin, serializers.ModelSerializer):
    pass


class TextField(serializers.CharField):
    def __init__(self, *args, multiline=False, **kwargs):
        self.multiline = multiline
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        value = super().to_internal_value(data)
        allowed = {"\n", "\r", "\t"} if self.multiline else set()
        if any(unicodedata.category(c) in {"Cc", "Cs"} and c not in allowed for c in value):
            raise serializers.ValidationError("Remove control characters from this field.")
        return value.replace("\r\n", "\n")
