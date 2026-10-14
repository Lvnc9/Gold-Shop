"""Every API error has the same envelope: {"error": <code>, "detail": <message>, ...extra}."""

from rest_framework import exceptions
from rest_framework.views import exception_handler as drf_handler


class ApiError(exceptions.APIException):
    """An error with a stable machine code and optional extra payload for the client."""

    def __init__(self, code: str, detail: str, status_code: int = 400, **extra):
        super().__init__(detail=detail, code=code)
        self.status_code = status_code
        self.error_code = code
        self.extra = extra


def exception_handler(exc, context):
    response = drf_handler(exc, context)
    if response is None:
        return None
    if isinstance(exc, ApiError):
        body = {"error": exc.error_code, "detail": str(exc.detail), **exc.extra}
    elif isinstance(exc, exceptions.ValidationError):
        body = {"error": "invalid", "detail": "Some fields need fixing.", "fields": response.data}
    elif isinstance(exc, exceptions.Throttled):
        body = {"error": "throttled", "detail": "Too many requests. Try again shortly.", "retryAfter": exc.wait}
    else:
        detail = response.data.get("detail", "") if isinstance(response.data, dict) else str(response.data)
        code = getattr(getattr(exc, "detail", None), "code", None) or exc.default_code
        body = {"error": str(code), "detail": str(detail)}
    response.data = body
    return response

