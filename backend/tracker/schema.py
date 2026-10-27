from .models import Application


def application_status_choices():
    return Application.Status.choices


def work_mode_choices():
    return Application.WorkMode.choices
