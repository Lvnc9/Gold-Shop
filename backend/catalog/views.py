from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from solenne.permissions import IsOwner

from .serializers import SpotSerializer
from .spot import current_spot, etag, set_spot


class SpotView(APIView):
    """GET is public and conditional (pages poll it); PUT is the owner's price update."""

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsOwner()]

    def get_throttles(self):
        # Cheap, cached and polled by every open page: nginx rate-limits it, DRF does not.
        return [] if self.request.method == "GET" else super().get_throttles()

    def get(self, request):
        spot = current_spot()
        tag = etag(spot)
        if request.headers.get("If-None-Match") == tag:
            resp = Response(status=304)
        else:
            resp = Response(spot)
        resp["ETag"] = tag
        resp["Cache-Control"] = "public, max-age=30"
        return resp

    def put(self, request):
        s = SpotSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        spot = set_spot(s.validated_data["perGram"], s.validated_data["asOf"], request.user)
        from monitoring.events import emit

        emit("spot", {"type": "spot.updated", **spot})
        return Response(spot)
