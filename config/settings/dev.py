from config.settings.base import *  # noqa: F401, F403
from decouple import config

DEBUG = True
ALLOWED_HOSTS = [
    host.strip()
    for host in config("ALLOWED_HOSTS", default="127.0.0.1,localhost").split(",")
    if host.strip()
]

CORS_ALLOW_ALL_ORIGINS = config(
    "CORS_ALLOW_ALL_ORIGINS", default=False, cast=bool
)

for host in ALLOWED_HOSTS:
    if host not in ("*", "127.0.0.1", "localhost"):
        for scheme in ("http", "https"):
            origin = f"{scheme}://{host}:5173"
            if origin not in CORS_ALLOWED_ORIGINS:  # noqa: F405
                CORS_ALLOWED_ORIGINS.append(origin)  # noqa: F405
