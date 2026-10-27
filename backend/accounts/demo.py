from datetime import timedelta

from django.utils import timezone
from tracker.models import Application, StatusEvent

DEMO_APPLICATIONS = [
    ("Linear", "Backend Engineer", "Remote", "REMOTE", "INTERVIEW", 2, 2),
    ("Notion", "Software Engineer", "San Francisco, CA", "HYBRID", "APPLIED", 3, 5),
    ("Vercel", "Developer Experience Engineer", "Remote", "REMOTE", "OFFER", 5, None),
    ("Stripe", "API Engineer", "London, UK", "HYBRID", "APPLIED", 7, 1),
    ("Figma", "Software Engineer Intern", "New York, NY", "ONSITE", "INTERVIEW", 9, 4),
    ("Raycast", "Backend Engineer", "Remote", "REMOTE", "APPLIED", 12, None),
    ("Spotify", "Platform Engineer", "Stockholm, Sweden", "HYBRID", "REJECTED", 15, None),
    ("Miro", "Python Engineer", "Remote", "REMOTE", "INTERVIEW", 18, 6),
    ("Canva", "Software Engineer", "Sydney, Australia", "HYBRID", "APPLIED", 22, None),
    ("Dropbox", "Infrastructure Engineer", "Remote", "REMOTE", "APPLIED", 27, None),
    ("Loom", "Backend Engineer", "Remote", "REMOTE", "OFFER", 33, None),
    ("Atlassian", "Graduate Software Engineer", "Remote", "REMOTE", "INTERVIEW", 38, None),
    ("GitLab", "Python Developer", "Remote", "REMOTE", "APPLIED", 44, None),
    ("Asana", "Software Engineer", "Dublin, Ireland", "ONSITE", "REJECTED", 50, None),
]


def populate_demo(user):
    today = timezone.localdate()
    applications = []
    for company, position, location, mode, status, days, follow_up in DEMO_APPLICATIONS:
        applications.append(
            Application(
                owner=user,
                company=company,
                position=position,
                location=location,
                work_mode=mode,
                status=status,
                applied_date=today - timedelta(days=days),
                follow_up_date=today + timedelta(days=follow_up) if follow_up is not None else None,
                notes="Fictional example for exploring Nextstep. Replace this with your own notes in a personal account.",
            )
        )
    Application.objects.bulk_create(applications)
    StatusEvent.objects.bulk_create(
        [StatusEvent(application=a, from_status="", to_status=a.status) for a in applications]
    )
