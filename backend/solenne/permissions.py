from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """The shop owner is any active staff user (created by `manage.py ensure_owner`)."""

    message = "Sign in as the shop owner."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_active and u.is_staff)
