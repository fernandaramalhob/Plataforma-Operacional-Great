from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from http.cookiejar import CookieJar
from pathlib import Path
import sys
import time as time_module
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from zoneinfo import ZoneInfo

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

from report_automation_config import load_automation_settings


@dataclass(frozen=True)
class WeeklyWindow:
    since: str
    until: str


class AutomationError(RuntimeError):
    pass


class TransientAutomationError(AutomationError):
    pass


def _session_user_value(session: dict[str, Any], key: str) -> str:
    session_user = session.get("user")
    if not isinstance(session_user, dict):
        return ""

    return str(session_user.get(key, "")).strip()


class ApiSession:
    def __init__(
        self,
        base_url: str,
        timeout_seconds: float,
        max_retries: int,
        retry_backoff_seconds: float,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.cookie_jar = CookieJar()
        self.opener = urllib_request.build_opener(
            urllib_request.HTTPCookieProcessor(self.cookie_jar)
        )

    def authenticate(self, email: str, password: str) -> dict[str, Any]:
        csrf_payload = self.get_json("/api/auth/csrf")
        csrf_token = str(csrf_payload.get("csrfToken", "")).strip()

        if not csrf_token:
            raise AutomationError("Nao foi possivel obter o CSRF token do NextAuth.")

        callback_url = f"{self.base_url}/dashboard"
        self.post_form(
            "/api/auth/callback/credentials?json=true",
            {
                "csrfToken": csrf_token,
                "email": email,
                "password": password,
                "callbackUrl": callback_url,
                "json": "true",
                "redirect": "false",
            },
        )

        session = self.get_json("/api/auth/session")
        session_email = (
            _session_user_value(session, "email").lower()
            if isinstance(session, dict)
            else ""
        )
        session_role = (
            _session_user_value(session, "role").upper()
            if isinstance(session, dict)
            else ""
        )

        if session_email != email.strip().lower():
            raise AutomationError(
                "A autenticacao do usuario tecnico falhou. Verifique email e senha."
            )

        if session_role != "ADMIN":
            raise AutomationError(
                "O usuario tecnico precisa ter papel ADMIN para executar a automacao."
            )

        return session

    def get_json(self, path: str) -> Any:
        return self._request_json("GET", path)

    def post_json(self, path: str, payload: dict[str, Any]) -> Any:
        return self._request_json("POST", path, payload=payload)

    def post_form(self, path: str, payload: dict[str, str]) -> Any:
        encoded_body = urllib_parse.urlencode(payload).encode("utf-8")
        return self._request(
            method="POST",
            path=path,
            data=encoded_body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        data = None
        headers: dict[str, str] = {}

        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        raw = self._request(method=method, path=path, data=data, headers=headers)

        if not raw:
            return {}

        try:
            return json.loads(raw)
        except json.JSONDecodeError as error:
            raise AutomationError(f"Resposta invalida recebida em {path}.") from error

    def _request(
        self,
        method: str,
        path: str,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> str:
        for attempt in range(1, self.max_retries + 1):
            request = urllib_request.Request(
                url=f"{self.base_url}{path}",
                data=data,
                headers=headers or {},
                method=method,
            )

            try:
                with self.opener.open(request, timeout=self.timeout_seconds) as response:
                    return response.read().decode("utf-8")
            except urllib_error.HTTPError as error:
                body = error.read().decode("utf-8", errors="replace").strip()
                message = body

                if body:
                    try:
                        parsed = json.loads(body)
                    except json.JSONDecodeError:
                        parsed = None

                    if isinstance(parsed, dict):
                        message = str(
                            parsed.get("detail")
                            or parsed.get("error")
                            or parsed.get("message")
                            or body
                        )

                error_message = (
                    f"Falha HTTP {error.code} em {path}: {message or 'sem detalhes'}"
                )

                if self._is_transient_http_status(error.code):
                    self._retry_or_raise(
                        attempt=attempt,
                        path=path,
                        reason=error_message,
                        transient=True,
                    )
                    continue

                raise AutomationError(error_message) from error
            except urllib_error.URLError as error:
                reason = str(error.reason)
                error_message = (
                    f"Nao foi possivel acessar {self.base_url}: {reason or 'sem detalhes'}"
                )
                self._retry_or_raise(
                    attempt=attempt,
                    path=path,
                    reason=error_message,
                    transient=True,
                )
            except TimeoutError as error:
                error_message = f"Timeout ao acessar {self.base_url}{path}"
                self._retry_or_raise(
                    attempt=attempt,
                    path=path,
                    reason=error_message,
                    transient=True,
                )

        raise AutomationError(f"Falha inesperada ao acessar {path}.")

    def _retry_or_raise(
        self,
        attempt: int,
        path: str,
        reason: str,
        transient: bool,
    ) -> None:
        if not transient:
            raise AutomationError(reason)

        if attempt >= self.max_retries:
            raise TransientAutomationError(
                f"{reason}. Tentativas esgotadas apos {self.max_retries} tentativa(s)."
            )

        delay_seconds = self.retry_backoff_seconds * attempt
        print(
            f"[RETRY] {path}: tentativa {attempt}/{self.max_retries} falhou. "
            f"Nova tentativa em {delay_seconds:.1f}s."
        )
        time_module.sleep(delay_seconds)

    def _is_transient_http_status(self, status_code: int) -> bool:
        return status_code in {408, 409, 425, 429, 500, 502, 503, 504}


class JsonLineLogger:
    def __init__(self, output_path: Path) -> None:
        self.output_path = output_path
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

    def log(self, level: str, event: str, **payload: Any) -> None:
        entry = {
            "timestamp": datetime.now(tz=ZoneInfo("UTC")).isoformat(),
            "level": level,
            "event": event,
            **payload,
        }
        with self.output_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=True) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Orquestra a geracao e o envio semanal dos relatorios para os "
            "Doutores(as) ativos usando a API atual do GreatGo."
        )
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Autentica, lista os Doutores(as) ativos e encerra sem gerar envios.",
    )
    parser.add_argument(
        "--since",
        help="Data inicial no formato YYYY-MM-DD. Se ausente, usa a ultima semana completa.",
    )
    parser.add_argument(
        "--until",
        help="Data final no formato YYYY-MM-DD. Se ausente, usa a ultima semana completa.",
    )
    parser.add_argument(
        "--client-id",
        action="append",
        dest="client_ids",
        default=[],
        help="Limita a execucao a um ou mais clientIds especificos.",
    )
    parser.add_argument(
        "--max-clients",
        type=int,
        help="Processa somente os primeiros N clientes ativos apos a ordenacao alfabetica.",
    )
    parser.add_argument(
        "--all-active",
        action="store_true",
        help="Desativa o filtro de clientes conectados e processa todos os clientes ativos.",
    )
    parser.add_argument(
        "--allow-duplicate-week",
        action="store_true",
        help="Permite reenviar a mesma janela semanal mesmo que ja exista envio SENT.",
    )
    return parser.parse_args()


def resolve_weekly_window(
    timezone_name: str,
    since_override: str | None,
    until_override: str | None,
) -> WeeklyWindow:
    if bool(since_override) != bool(until_override):
        raise AutomationError("Informe --since e --until juntos.")

    if since_override and until_override:
        validate_iso_date(since_override)
        validate_iso_date(until_override)

        if since_override > until_override:
            raise AutomationError("--until precisa ser maior ou igual a --since.")

        return WeeklyWindow(since=since_override, until=until_override)

    timezone = ZoneInfo(timezone_name)
    now_local = datetime.now(timezone)
    today_local = now_local.date()
    start_of_current_week = today_local - timedelta(days=today_local.weekday())
    start_of_previous_week = start_of_current_week - timedelta(days=7)
    end_of_previous_week = start_of_current_week - timedelta(days=1)

    return WeeklyWindow(
        since=start_of_previous_week.isoformat(),
        until=end_of_previous_week.isoformat(),
    )


def validate_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise AutomationError(
            f"Data invalida '{value}'. Use o formato YYYY-MM-DD."
        ) from error


def build_run_log_path(logs_directory: Path, timezone_name: str) -> Path:
    timezone = ZoneInfo(timezone_name)
    stamp = datetime.now(timezone).strftime("%Y%m%d-%H%M%S")
    return logs_directory / f"weekly-report-run-{stamp}.jsonl"


def mask_group_id(group_id: str | None) -> str | None:
    if not group_id:
        return None

    normalized = group_id.strip()
    if len(normalized) <= 8:
        return "***"

    return f"{normalized[:4]}***{normalized[-4:]}"


def fetch_active_doctors(api_session: ApiSession) -> list[dict[str, Any]]:
    payload = api_session.get_json("/api/clients")
    if not isinstance(payload, list):
        raise AutomationError("A listagem de clientes retornou um formato invalido.")

    active_clients = [
        item
        for item in payload
        if isinstance(item, dict) and str(item.get("status", "")).upper() == "ACTIVE"
    ]
    active_clients.sort(key=lambda item: str(item.get("name", "")).lower())
    return active_clients


def filter_connected_clients(clients: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        client
        for client in clients
        if str(client.get("adAccountId") or "").strip()
    ]


def select_clients(
    active_clients: list[dict[str, Any]],
    requested_client_ids: list[str],
    max_clients: int | None,
) -> list[dict[str, Any]]:
    if not requested_client_ids:
        selected = active_clients
    else:
        requested_set = {client_id.strip() for client_id in requested_client_ids if client_id.strip()}
        selected = [
            client for client in active_clients if str(client.get("id", "")).strip() in requested_set
        ]

        missing = sorted(
            requested_set - {str(client.get("id", "")).strip() for client in selected}
        )
        if missing:
            missing_text = ", ".join(missing)
            raise AutomationError(
                f"Os seguintes clientIds ativos nao foram encontrados: {missing_text}"
            )

    if max_clients is not None:
        if max_clients <= 0:
            raise AutomationError("--max-clients precisa ser maior que zero.")
        return selected[:max_clients]

    return selected


def has_already_sent_for_window(
    api_session: ApiSession,
    client_id: str,
    reference_week: str,
) -> bool:
    history = api_session.get_json(f"/api/history?clientId={urllib_parse.quote(client_id)}")
    if not isinstance(history, list):
        raise AutomationError("O historico do cliente retornou um formato invalido.")

    for row in history:
        if not isinstance(row, dict):
            continue

        if str(row.get("status", "")).upper() != "SENT":
            continue

        if str(row.get("referenceWeek", "")).strip() == reference_week:
            return True

    return False


def queue_report_generation(
    api_session: ApiSession,
    client_id: str,
    window: WeeklyWindow,
    objective: str,
) -> str:
    response = api_session.post_json(
        "/api/reports",
        {
            "clientId": client_id,
            "since": window.since,
            "until": window.until,
            "objective": objective,
        },
    )
    report_id = str(response.get("reportId", "")).strip() if isinstance(response, dict) else ""

    if not report_id:
        raise AutomationError("A API nao retornou reportId para o cliente.")

    return report_id


def wait_until_report_is_ready(
    api_session: ApiSession,
    report_id: str,
    max_attempts: int,
    interval_seconds: float,
) -> dict[str, Any]:
    for attempt in range(1, max_attempts + 1):
        response = api_session.get_json(
            f"/api/reports/{urllib_parse.quote(report_id)}"
        )

        if not isinstance(response, dict):
            raise AutomationError(f"Status invalido recebido para o relatorio {report_id}.")

        if response.get("payload"):
            return response

        if str(response.get("status", "")).upper() == "FAILED":
            error_message = str(response.get("errorMessage") or "Falha na geracao.")
            raise AutomationError(
                f"Relatorio {report_id} falhou durante a geracao: {error_message}"
            )

        if attempt < max_attempts:
            time_module.sleep(interval_seconds)

    raise AutomationError(
        f"Relatorio {report_id} nao ficou pronto apos {max_attempts} tentativas."
    )


def dispatch_report(
    api_session: ApiSession,
    report_id: str,
    send_mode: str,
    group_id: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"mode": send_mode}
    if group_id:
        payload["groupId"] = group_id

    response = api_session.post_json(
        f"/api/reports/{urllib_parse.quote(report_id)}/send",
        payload,
    )

    if not isinstance(response, dict):
        raise AutomationError(f"Resposta invalida ao enviar o relatorio {report_id}.")

    if str(response.get("status", "")).upper() != "SENT":
        raise AutomationError(
            f"Envio do relatorio {report_id} retornou status inesperado: {response!r}"
        )

    return response


def print_active_doctors(active_clients: list[dict[str, Any]]) -> None:
    print(f"Doutores(as) ativos encontrados: {len(active_clients)}")

    for client in active_clients:
        group_id = mask_group_id(str(client.get("whatsappGroupId") or "").strip() or None)
        group_status = group_id if group_id else "sem grupo configurado"
        print(f"- {client.get('name', 'Sem nome')} | grupo: {group_status}")


def main() -> int:
    args = parse_args()
    settings = load_automation_settings()
    window = resolve_weekly_window(settings.timezone, args.since, args.until)
    reference_week = f"{window.since} ate {window.until}"
    log_path = build_run_log_path(settings.logs_directory, settings.timezone)
    logger = JsonLineLogger(log_path)
    api_session = ApiSession(
        base_url=settings.base_url,
        timeout_seconds=settings.request_timeout_seconds,
        max_retries=settings.request_max_retries,
        retry_backoff_seconds=settings.retry_backoff_seconds,
    )
    max_clients = args.max_clients if args.max_clients is not None else settings.max_clients

    logger.log(
        "INFO",
        "run_started",
        baseUrl=settings.base_url,
        timezone=settings.timezone,
        window={"since": window.since, "until": window.until},
        sendMode=settings.send_mode,
        groupId=settings.group_id,
        connectedOnly=settings.connected_only and not args.all_active,
        maxClients=max_clients,
        dryRun=args.dry_run,
    )

    print(
        f"Janela semanal selecionada: {window.since} ate {window.until} "
        f"({settings.timezone})"
    )

    session = api_session.authenticate(
        settings.credentials.email,
        settings.credentials.password,
    )
    logger.log(
        "INFO",
        "authenticated",
        technicalUser=_session_user_value(session, "email") if isinstance(session, dict) else "",
        technicalUserRole=_session_user_value(session, "role").upper()
        if isinstance(session, dict)
        else "",
    )

    active_clients = fetch_active_doctors(api_session)
    eligible_clients = (
        filter_connected_clients(active_clients)
        if settings.connected_only and not args.all_active
        else active_clients
    )
    print_active_doctors(eligible_clients)
    logger.log(
        "INFO",
        "active_doctors_loaded",
        totalActiveDoctors=len(active_clients),
        totalEligibleDoctors=len(eligible_clients),
    )

    selected_clients = select_clients(eligible_clients, args.client_ids, max_clients)
    if args.client_ids:
        print(f"Execucao filtrada para {len(selected_clients)} cliente(s) ativo(s).")
    elif max_clients is not None:
        print(
            f"Execucao limitada aos primeiros {len(selected_clients)} cliente(s) ativo(s)."
        )
    elif settings.connected_only and not args.all_active:
        print(
            f"Execucao configurada para clientes conectados: {len(selected_clients)} elegivel(is)."
        )

    if args.dry_run:
        print(f"Dry-run concluido. Logs em {log_path}")
        logger.log(
            "INFO",
            "run_finished",
            summary={
                "processed": len(selected_clients),
                "sent": 0,
                "skipped": 0,
                "failed": 0,
                "dryRun": True,
            },
        )
        return 0

    sent_count = 0
    skipped_count = 0
    failed_count = 0

    skip_if_already_sent = (
        settings.skip_if_already_sent and not args.allow_duplicate_week
    )

    for client in selected_clients:
        client_id = str(client.get("id", "")).strip()
        doctor_name = str(client.get("name", "Sem nome")).strip() or "Sem nome"
        effective_group_id = (
            settings.group_id
            or str(client.get("whatsappGroupId") or "").strip()
            or None
        )
        masked_group_id = mask_group_id(effective_group_id)

        logger.log(
            "INFO",
            "doctor_started",
            doctorName=doctor_name,
            clientId=client_id,
            whatsappGroupId=masked_group_id,
        )

        try:
            if not client_id:
                raise AutomationError("Registro ativo sem clientId.")

            if not effective_group_id:
                raise AutomationError(
                    "Cliente ativo sem grupo de WhatsApp configurado."
                )

            if skip_if_already_sent and has_already_sent_for_window(
                api_session,
                client_id,
                reference_week,
            ):
                skipped_count += 1
                print(f"[SKIP] {doctor_name}: envio ja concluido para {reference_week}.")
                logger.log(
                    "INFO",
                    "doctor_skipped",
                    doctorName=doctor_name,
                    clientId=client_id,
                    referenceWeek=reference_week,
                    reason="already-sent",
                )
                continue

            report_id = queue_report_generation(
                api_session=api_session,
                client_id=client_id,
                window=window,
                objective=settings.objective,
            )
            logger.log(
                "INFO",
                "report_queued",
                doctorName=doctor_name,
                clientId=client_id,
                reportId=report_id,
            )

            wait_until_report_is_ready(
                api_session=api_session,
                report_id=report_id,
                max_attempts=settings.polling_max_attempts,
                interval_seconds=settings.polling_interval_seconds,
            )
            logger.log(
                "INFO",
                "report_ready",
                doctorName=doctor_name,
                clientId=client_id,
                reportId=report_id,
            )

            dispatch_report(
                api_session=api_session,
                report_id=report_id,
                send_mode=settings.send_mode,
                group_id=settings.group_id,
            )
            sent_count += 1
            print(f"[OK] {doctor_name}: relatorio enviado com sucesso.")
            logger.log(
                "INFO",
                "doctor_sent",
                doctorName=doctor_name,
                clientId=client_id,
                reportId=report_id,
                referenceWeek=reference_week,
                whatsappGroupId=masked_group_id,
            )
        except AutomationError as error:
            failed_count += 1
            print(f"[ERRO] {doctor_name}: {error}")
            logger.log(
                "ERROR",
                "doctor_failed",
                doctorName=doctor_name,
                clientId=client_id,
                referenceWeek=reference_week,
                whatsappGroupId=masked_group_id,
                error=str(error),
            )

    summary = {
        "processed": len(selected_clients),
        "sent": sent_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "dryRun": False,
        "referenceWeek": reference_week,
    }
    logger.log("INFO", "run_finished", summary=summary)

    print(
        "Resumo da execucao:"
        f" processados={summary['processed']},"
        f" enviados={summary['sent']},"
        f" pulados={summary['skipped']},"
        f" falhas={summary['failed']}."
    )
    print(f"Logs em {log_path}")

    return 1 if failed_count > 0 else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AutomationError as error:
        print(f"[ERRO] {error}", file=sys.stderr)
        sys.exit(1)
