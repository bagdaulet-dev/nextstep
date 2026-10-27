from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser


class BoundedJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        # The outer middleware caps JSON bytes before the parser allocates objects.
        result = super().parse(stream, media_type=media_type, parser_context=parser_context)
        if not isinstance(result, dict):
            raise ParseError("Send a JSON object.")
        return result
