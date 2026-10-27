from django.core.exceptions import RequestDataTooBig
from django.http import JsonResponse

CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"


class RequestBoundaryMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = None
        if request.path.startswith("/api/") and request.method in {
            "POST",
            "PATCH",
            "PUT",
            "DELETE",
        }:
            try:
                if int(request.META.get("CONTENT_LENGTH") or 0) > 65536:
                    raise RequestDataTooBig
                # Read a bounded amount even when CONTENT_LENGTH is absent/unreliable.
                body = request.read(65537)
                if len(body) > 65536:
                    raise RequestDataTooBig
                request._body = body
                from io import BytesIO

                request._stream = BytesIO(body)
            except (RequestDataTooBig, ValueError):
                response = JsonResponse(
                    {
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": "Keep requests below 64 KB.",
                        }
                    },
                    status=413,
                )
        if response is None:
            response = self.get_response(request)
        response["Content-Security-Policy"] = CSP
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response["X-Frame-Options"] = "DENY"
        response["X-Content-Type-Options"] = "nosniff"
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "no-store"
        return response
