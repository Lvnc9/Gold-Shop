import time

from .events import emit


class RequestMetricsMiddleware:
    """One event per API request: route pattern (not raw path, so /orders/SLN-X/ groups), status, latency."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        if request.path.startswith("/api/") and not request.path.startswith("/api/v1/health"):
            match = getattr(request, "resolver_match", None)
            route = "/" + match.route if match and match.route else "unmatched"
            emit("requests", {
                "type": "http.request",
                "method": request.method,
                "route": route,
                "status": response.status_code,
                "durationMs": round((time.perf_counter() - start) * 1000, 2),
            }, key=route)
        return response
