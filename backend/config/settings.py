"""Environment-based configuration for the local preview and full MySQL stack."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.core.management.utils import get_random_secret_key
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env", override=False)


def flag(name, default=False):
    value = os.environ.get(name, str(default)).lower()
    if value not in {"true", "false", "1", "0"}:
        raise ImproperlyConfigured(f"{name} must be true or false")
    return value in {"true", "1"}


APP_MODE = os.environ.get("APP_MODE", "preview")
if APP_MODE not in {"preview", "mysql"}:
    raise ImproperlyConfigured("APP_MODE must be preview or mysql")
DEBUG = flag("DJANGO_DEBUG", APP_MODE == "preview")
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY for production")
    local = ROOT_DIR / ".local"
    local.mkdir(mode=0o700, exist_ok=True)
    key_file = local / "secret-key"
    if not key_file.exists():
        # Exclusive creation avoids replacing an existing development key.
        try:
            with open(key_file, "x", opener=lambda path, flags: os.open(path, flags, 0o600)) as f:
                f.write(get_random_secret_key())
        except FileExistsError:
            pass
    SECRET_KEY = key_file.read_text().strip()
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith("change-me")):
    raise ImproperlyConfigured("Use a unique secret of at least 50 characters")
ALLOWED_HOSTS = [
    x.strip()
    for x in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
    if x.strip()
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "accounts",
    "tracker",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.RequestBoundaryMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", FRONTEND_DIST],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
            ]
        },
    }
]
AUTH_USER_MODEL = "accounts.User"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "OPTIONS": {"user_attributes": ["email", "name"]},
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
if APP_MODE == "mysql":
    DATABASES = {
        "default": {
            "ENGINE": "mysql.connector.django",
            "NAME": os.environ.get("MYSQL_DATABASE", "nextstep"),
            "USER": os.environ.get("MYSQL_USER", "nextstep"),
            "PASSWORD": os.environ.get("MYSQL_PASSWORD", ""),
            "HOST": os.environ.get("MYSQL_HOST", "127.0.0.1"),
            "PORT": os.environ.get("MYSQL_PORT", "3306"),
            "CONN_MAX_AGE": 30,
            "OPTIONS": {"charset": "utf8mb4", "init_command": "SET sql_mode='STRICT_TRANS_TABLES'"},
            "TEST": {"NAME": os.environ.get("MYSQL_TEST_DATABASE", "test_nextstep")},
        }
    }
    if not DATABASES["default"]["PASSWORD"]:
        raise ImproperlyConfigured("Set MYSQL_PASSWORD for MySQL mode")
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.db.DatabaseCache",
            "LOCATION": "api_cache",
            "TIMEOUT": 300,
            "OPTIONS": {"MAX_ENTRIES": 5000},
        }
    }
else:
    (ROOT_DIR / ".local").mkdir(exist_ok=True)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ROOT_DIR / ".local" / "preview.sqlite3",
            "OPTIONS": {"timeout": 20},
        }
    }
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "nextstep-preview",
            "OPTIONS": {"MAX_ENTRIES": 2000},
        }
    }
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["config.authentication.PrivateSessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["config.parsers.BoundedJSONParser"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "config.errors.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "300/min",
        "anon": "60/min",
        "auth": "10/min",
        "demo": "12/hour",
    },
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Nextstep API",
    "DESCRIPTION": "Private job application tracking with cookie sessions and CSRF.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "ApplicationStatus": "tracker.schema.application_status_choices",
        "WorkMode": "tracker.schema.work_mode_choices",
    },
}
LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("APP_TIME_ZONE", "Asia/Almaty")
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
STATIC_URL = "/static/"
STATIC_ROOT = Path(os.environ.get("STATIC_ROOT", ROOT_DIR / ".local" / "staticfiles"))
STATICFILES_DIRS = [FRONTEND_DIST] if FRONTEND_DIST.exists() else []
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
WHITENOISE_USE_FINDERS = DEBUG
SESSION_COOKIE_NAME = "nextstep_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 7 * 24 * 3600
CSRF_COOKIE_NAME = "nextstep_csrf"
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_FAILURE_VIEW = "config.errors.csrf_failure"
SESSION_COOKIE_SECURE = flag("DJANGO_SECURE_COOKIES", not DEBUG)
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
CSRF_TRUSTED_ORIGINS = [
    x.strip() for x in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if x.strip()
]
if DEBUG:
    CSRF_TRUSTED_ORIGINS += ["http://localhost:5173", "http://127.0.0.1:5173"]
SECURE_SSL_REDIRECT = flag("DJANGO_SSL_REDIRECT", not DEBUG)
SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
if flag("TRUST_PROXY", False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
DATA_UPLOAD_MAX_MEMORY_SIZE = 65536
DATA_UPLOAD_MAX_NUMBER_FIELDS = 40
DEMO_ENABLED = DEBUG and flag("DEMO_ENABLED", True)
API_DOCS_ENABLED = flag("API_DOCS_ENABLED", DEBUG)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
