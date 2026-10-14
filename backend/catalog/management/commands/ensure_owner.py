import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the shop owner (staff + superuser) from OWNER_EMAIL / OWNER_PASSWORD."

    def handle(self, *args, **opts):
        email, password = os.environ.get("OWNER_EMAIL"), os.environ.get("OWNER_PASSWORD")
        if not email or not password:
            self.stdout.write("OWNER_EMAIL/OWNER_PASSWORD not set; skipping owner account")
            return
        User = get_user_model()
        # The username is the email, so the SPA's email/password form authenticates directly.
        user, created = User.objects.get_or_create(username=email, defaults={"email": email})
        user.email = email
        user.is_staff = user.is_superuser = user.is_active = True
        if created or not user.check_password(password):
            user.set_password(password)
        user.save()
        self.stdout.write(f"owner {'created' if created else 'updated'}: {email}")
