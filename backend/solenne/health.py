from django.core.cache import cache
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .middleware import INSTANCE


class HealthView(APIView):
    """Liveness + dependencies, for nginx/compose health checks. Redis is reported but not fatal (see CACHES)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request):
        try:
            with connection.cursor() as c:
                c.execute("SELECT 1")
            db = "ok"
        except Exception:  # noqa: BLE001
            db = "down"
        cache.set("health:ping", 1, 5)
        redis = "ok" if cache.get("health:ping") == 1 else "degraded"
        return Response({"status": "ok" if db == "ok" else "down", "db": db, "cache": redis, "instance": INSTANCE},
                        status=200 if db == "ok" else 503)
