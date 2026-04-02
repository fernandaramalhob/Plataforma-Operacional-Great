from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

SUPPORTED_OBJECTIVES = {
    "ALL",
    "LINK_CLICKS",
    "CONVERSIONS",
    "MESSAGES",
}
SUPPORTED_SEND_MODES = {
    "PDF_AND_MESSAGE",
    "PDF_ONLY",
    "MESSAGE_ONLY",
}
DEFAULT_TIMEZONE = "America/Sao_Paulo"


@dataclass(frozen=True)
class TechnicalUserCredentials:
    email: str
    password: str


@dataclass(frozen=True)
class AutomationSettings:
    base_url: str
    timezone: str
    objective: str
    send_mode: str
    group_id: str | None
    connected_only: bool
    max_clients: int | None
    request_timeout_seconds: float
    request_max_retries: int
    retry_backoff_seconds: float
    polling_interval_seconds: float
    polling_max_attempts: int
    skip_if_already_sent: bool
    logs_directory: Path
    credentials: TechnicalUserCredentials


def _read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _require_env(name: str, fallback_name: str | None = None) -> str:
    value = _read_env(name)
    if value:
        return value

    if fallback_name:
        fallback_value = _read_env(fallback_name)
        if fallback_value:
            return fallback_value

    fallback_label = f" ou {fallback_name}" if fallback_name else ""
    raise RuntimeError(
        f"Defina a variavel de ambiente {name}{fallback_label} para executar a automacao."
    )


def _read_float(name: str, default: float) -> float:
    value = _read_env(name)
    if not value:
        return default

    try:
        parsed = float(value)
    except ValueError as error:
        raise RuntimeError(f"{name} precisa ser numerico.") from error

    if parsed <= 0:
        raise RuntimeError(f"{name} precisa ser maior que zero.")

    return parsed


def _read_int(name: str, default: int) -> int:
    value = _read_env(name)
    if not value:
        return default

    try:
        parsed = int(value)
    except ValueError as error:
        raise RuntimeError(f"{name} precisa ser inteiro.") from error

    if parsed <= 0:
        raise RuntimeError(f"{name} precisa ser maior que zero.")

    return parsed


def _read_optional_int(name: str) -> int | None:
    value = _read_env(name)
    if not value:
        return None

    try:
        parsed = int(value)
    except ValueError as error:
        raise RuntimeError(f"{name} precisa ser inteiro.") from error

    if parsed <= 0:
        raise RuntimeError(f"{name} precisa ser maior que zero quando informado.")

    return parsed


def _read_bool(name: str, default: bool) -> bool:
    value = _read_env(name)
    if not value:
        return default

    return value.lower() in {"1", "true", "yes", "sim", "on"}


def _validate_choice(name: str, value: str, supported_values: set[str]) -> str:
    normalized = value.strip().upper()
    if normalized not in supported_values:
        supported = ", ".join(sorted(supported_values))
        raise RuntimeError(f"{name} precisa ser um destes valores: {supported}.")

    return normalized


def _read_optional_string(name: str) -> str | None:
    value = _read_env(name)
    return value or None


def load_automation_settings() -> AutomationSettings:
    project_root = Path(__file__).resolve().parent.parent
    base_url = _read_env("REPORT_AUTOMATION_BASE_URL") or _read_env("NEXTAUTH_URL")
    if not base_url:
        raise RuntimeError(
            "Defina REPORT_AUTOMATION_BASE_URL ou NEXTAUTH_URL para executar a automacao."
        )

    email = _require_env("REPORT_AUTOMATION_EMAIL", "ADMIN_EMAIL")
    password = _require_env("REPORT_AUTOMATION_PASSWORD", "ADMIN_PASSWORD")

    return AutomationSettings(
        base_url=base_url.rstrip("/"),
        timezone=_read_env("REPORT_AUTOMATION_TIMEZONE", DEFAULT_TIMEZONE)
        or DEFAULT_TIMEZONE,
        objective=_validate_choice(
            "REPORT_AUTOMATION_OBJECTIVE",
            _read_env("REPORT_AUTOMATION_OBJECTIVE", "ALL") or "ALL",
            SUPPORTED_OBJECTIVES,
        ),
        send_mode=_validate_choice(
            "REPORT_AUTOMATION_SEND_MODE",
            _read_env("REPORT_AUTOMATION_SEND_MODE", "PDF_AND_MESSAGE")
            or "PDF_AND_MESSAGE",
            SUPPORTED_SEND_MODES,
        ),
        group_id=_read_optional_string("REPORT_AUTOMATION_GROUP_ID"),
        connected_only=_read_bool("REPORT_AUTOMATION_CONNECTED_ONLY", True),
        max_clients=_read_optional_int("REPORT_AUTOMATION_MAX_CLIENTS"),
        request_timeout_seconds=_read_float(
            "REPORT_AUTOMATION_REQUEST_TIMEOUT_SECONDS", 30.0
        ),
        request_max_retries=_read_int("REPORT_AUTOMATION_REQUEST_MAX_RETRIES", 3),
        retry_backoff_seconds=_read_float(
            "REPORT_AUTOMATION_RETRY_BACKOFF_SECONDS", 3.0
        ),
        polling_interval_seconds=_read_float(
            "REPORT_AUTOMATION_POLL_INTERVAL_SECONDS", 5.0
        ),
        polling_max_attempts=_read_int("REPORT_AUTOMATION_POLL_MAX_ATTEMPTS", 24),
        skip_if_already_sent=_read_bool(
            "REPORT_AUTOMATION_SKIP_IF_ALREADY_SENT", True
        ),
        logs_directory=project_root
        / "automacao"
        / "relatorios-doutores"
        / "logs",
        credentials=TechnicalUserCredentials(
            email=email,
            password=password,
        ),
    )
