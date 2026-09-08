from config.settings.base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = [
    host.strip()
    for host in config("ALLOWED_HOSTS", default="127.0.0.1,localhost").split(",")
    if host.strip()
]
