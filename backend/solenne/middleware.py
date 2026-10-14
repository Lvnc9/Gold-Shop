"""Request correlation: nginx sets X-Request-ID; every log line and Kafka event for the request carries it."""

import logging
import re
import socket
import uuid
from contextvars import ContextVar

request_id: ContextVar[str] = ContextVar("request_id", default="-")
INSTANCE = socket.gethostname()
_VALID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.META.get("HTTP_X_REQUEST_ID", "")
        rid = incoming if _VALID.match(incoming) else uuid.uuid4().hex
        token = request_id.set(rid)
        request.request_id = rid
        try:
            response = self.get_response(request)
        finally:
            request_id.reset(token)
        response["X-Request-ID"] = rid
        # Which replica answered: makes nginx load balancing visible from the client side.
        response["X-Served-By"] = INSTANCE
        return response


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id.get()
        return True
