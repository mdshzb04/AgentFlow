"""Resolve n8n base URLs for Docker dev and format connection errors."""

from __future__ import annotations

import os
from urllib.parse import urlparse, urlunparse


def is_running_in_docker() -> bool:
    return os.path.exists("/.dockerenv")


def resolve_n8n_base_url(base_url: str) -> str:
    """
    When the API runs inside Docker, localhost points at the container — not the host
    where n8n usually runs. Rewrite to host.docker.internal (requires extra_hosts in compose).
    """
    normalized = base_url.rstrip("/")
    if not is_running_in_docker():
        return normalized

    parsed = urlparse(normalized)
    if parsed.hostname not in ("localhost", "127.0.0.1"):
        return normalized

    port_suffix = f":{parsed.port}" if parsed.port else ""
    new_netloc = f"host.docker.internal{port_suffix}"
    return urlunparse(parsed._replace(netloc=new_netloc))


def format_n8n_connection_error(exc: Exception, base_url: str) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    hints: list[str] = []

    if "Connection refused" in message or "All connection attempts failed" in message:
        parsed = urlparse(base_url)
        if parsed.hostname in ("localhost", "127.0.0.1", "host.docker.internal"):
            hints.append("Make sure n8n is running locally (default port 5678).")
            if is_running_in_docker():
                hints.append(
                    "The API runs in Docker — use Base URL http://host.docker.internal:5678 "
                    "or restart the API container after updating docker-compose."
                )
        hints.append(
            "For n8n Cloud, use your instance URL (e.g. https://your-name.app.n8n.cloud), not localhost."
        )

    if hints:
        return f"Could not reach n8n at {base_url}: {message}. {' '.join(hints)}"
    return f"Could not reach n8n instance: {message}"
