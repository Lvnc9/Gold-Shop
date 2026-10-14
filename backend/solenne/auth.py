"""Owner sign-in. The access token goes to the page (kept in memory); the refresh token lives in an httpOnly,
SameSite=Strict cookie scoped to /api/v1/auth/, so page scripts never see it."""

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .errors import ApiError

COOKIE = settings.REFRESH_COOKIE


class Credentials(serializers.Serializer):
    email = serializers.CharField(max_length=200)
    password = serializers.CharField(max_length=200, trim_whitespace=False)


def _me(user):
    ok = bool(user and user.is_authenticated)
    return {"authenticated": ok, "isOwner": ok and user.is_staff and user.is_active, "email": user.email if ok else None}


def _with_tokens(user, refresh: RefreshToken):
    resp = Response({"access": str(refresh.access_token), "user": _me(user)})
    resp.set_cookie(COOKIE["key"], str(refresh), max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                    path=COOKIE["path"], httponly=COOKIE["httponly"], samesite=COOKIE["samesite"], secure=COOKIE["secure"])
    return resp


def _require_fetch(request):
    # Cookie-authenticated endpoints: a cross-site form can't set this header, a same-origin fetch does.
    if request.headers.get("X-Requested-With") != "fetch":
        raise ApiError("csrf", "Missing X-Requested-With header.", 403)


class TokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        c = Credentials(data=request.data)
        c.is_valid(raise_exception=True)
        user = authenticate(request, username=c.validated_data["email"], password=c.validated_data["password"])
        if user is None or not user.is_active:
            raise ApiError("bad-credentials", "That email and password don't match an owner account.", 401)
        return _with_tokens(user, RefreshToken.for_user(user))


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        _require_fetch(request)
        raw = request.COOKIES.get(COOKIE["key"])
        if not raw:
            raise ApiError("signed-out", "No session.", 401)
        try:
            old = RefreshToken(raw)
            user = get_user_model().objects.get(pk=old[jwt_settings.USER_ID_CLAIM], is_active=True)
            old.blacklist()  # rotation: each refresh token works once
        except (TokenError, KeyError, get_user_model().DoesNotExist):
            resp = Response({"error": "signed-out", "detail": "Session expired. Sign in again."}, status=401)
            resp.delete_cookie(COOKIE["key"], path=COOKIE["path"])
            return resp
        return _with_tokens(user, RefreshToken.for_user(user))


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        _require_fetch(request)
        raw = request.COOKIES.get(COOKIE["key"])
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        resp = Response(status=204)
        resp.delete_cookie(COOKIE["key"], path=COOKIE["path"], samesite=COOKIE["samesite"])
        return resp


class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_me(request.user))
