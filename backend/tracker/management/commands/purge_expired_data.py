from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Remove expired demo accounts and expired session rows. Real accounts are retained."

    def handle(self, *args, **options):
        expired = get_user_model().objects.filter(
            is_demo=True, date_joined__lt=timezone.now() - timedelta(hours=24)
        )
        count = expired.count()
        expired.delete()
        call_command("clearsessions", verbosity=0)
        self.stdout.write(f"Removed {count} expired demo accounts and cleared expired sessions.")
