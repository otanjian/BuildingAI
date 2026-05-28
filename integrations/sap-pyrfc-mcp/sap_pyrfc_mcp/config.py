"""Load SAP RFC and ADT connection settings from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

BackendMode = Literal["auto", "pyrfc", "adt"]

_INTEGRATION_ROOT = Path(__file__).resolve().parents[1]
_LOCAL_ENV = _INTEGRATION_ROOT / ".env"
_LOCAL_SDK_ENV = _INTEGRATION_ROOT / ".env.local-sdk"
_SIBLING_ADT_ENV = _INTEGRATION_ROOT.parent / "sap-abap-adt-mcp" / ".env"

_ENV_KEYS = frozenset(
    {
        "SAP_URL",
        "SAP_USER",
        "SAP_PASSWORD",
        "SAP_CLIENT",
        "SAP_LANGUAGE",
        "SAP_SESSION_TYPE",
        "SAP_BACKEND",
        "SAP_ASHOST",
        "SAP_SYSNR",
        "SAP_SAPROUTER",
        "SAP_MSHOST",
        "SAP_MSSERV",
        "SAP_GROUP",
        "SAP_R3NAME",
        "SAP_TLS_VERIFY",
        "SAP_ADT_TIMEOUT",
        "SAPNWRFC_HOME",
    }
)


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _apply_env_file(path: Path, *, only_if_missing: bool) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if key not in _ENV_KEYS:
            continue
        if only_if_missing and _env(key):
            continue
        os.environ[key] = val


def _derive_rfc_from_url() -> None:
    """Infer SAP_ASHOST / SAP_SYSNR from SAP_URL when RFC host is not set explicitly."""
    if _env("SAP_ASHOST") or not _env("SAP_URL"):
        return
    from urllib.parse import urlparse

    parsed = urlparse(_env("SAP_URL"))
    host = parsed.hostname or ""
    if host:
        os.environ["SAP_ASHOST"] = host
    port = parsed.port or 0
    if port >= 44300 and not _env("SAP_SYSNR"):
        os.environ.setdefault("SAP_SYSNR", f"{port - 44300:02d}")


def _ensure_local_hostname_resolvable() -> None:
    """NW RFC SDK requires the local hostname to resolve (see SAP note / Linux /etc/hosts)."""
    import socket

    local = socket.gethostname()
    if not local:
        return
    try:
        socket.getaddrinfo(local, None)
    except socket.gaierror:
        os.environ.setdefault("SAP_LOCAL_HOSTNAME_WARNING", local)


def _bootstrap_env() -> None:
    """Load .env into the MCP process (supergateway stdio child may not inherit shell exports)."""
    _apply_env_file(_LOCAL_ENV, only_if_missing=False)
    _apply_env_file(_LOCAL_SDK_ENV, only_if_missing=True)
    _apply_env_file(_SIBLING_ADT_ENV, only_if_missing=True)
    _derive_rfc_from_url()
    _ensure_local_hostname_resolvable()

    home = _env("SAPNWRFC_HOME")
    if home:
        lib_dir = Path(home) / "lib"
        if lib_dir.is_dir():
            current = os.environ.get("LD_LIBRARY_PATH", "")
            lib_path = str(lib_dir)
            if lib_path not in current.split(":"):
                os.environ["LD_LIBRARY_PATH"] = f"{lib_path}:{current}" if current else lib_path


_bootstrap_env()


@dataclass(frozen=True)
class SapConnectionConfig:
    ashost: str
    sysnr: str
    client: str
    user: str
    password: str
    lang: str
    saprouter: str
    mshost: str
    msserv: str
    group: str
    r3name: str

    def to_connection_params(self) -> dict[str, Any]:
        params: dict[str, Any] = {
            "client": self.client,
            "user": self.user,
            "passwd": self.password,
            "lang": self.lang,
        }

        if self.mshost:
            params["mshost"] = self.mshost
            if self.msserv:
                params["msserv"] = self.msserv
            if self.group:
                params["group"] = self.group
            if self.r3name:
                params["r3name"] = self.r3name
        else:
            params["ashost"] = self.ashost
            params["sysnr"] = self.sysnr

        if self.saprouter:
            params["saprouter"] = self.saprouter

        return params

    def redacted(self) -> dict[str, Any]:
        params = self.to_connection_params()
        if "passwd" in params:
            params["passwd"] = "***" if params["passwd"] else ""
        return params


@dataclass(frozen=True)
class AdtConnectionConfig:
    url: str
    user: str
    password: str
    client: str
    language: str
    session_type: str
    tls_verify: bool
    timeout: int

    def redacted(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "user": self.user,
            "password": "***" if self.password else "",
            "client": self.client,
            "language": self.language,
            "session_type": self.session_type,
            "tls_verify": self.tls_verify,
        }


def load_config() -> SapConnectionConfig:
    return SapConnectionConfig(
        ashost=_env("SAP_ASHOST"),
        sysnr=_env("SAP_SYSNR", "00"),
        client=_env("SAP_CLIENT", "100"),
        user=_env("SAP_USER"),
        password=_env("SAP_PASSWORD"),
        lang=_env("SAP_LANGUAGE", "EN"),
        saprouter=_env("SAP_SAPROUTER"),
        mshost=_env("SAP_MSHOST"),
        msserv=_env("SAP_MSSERV"),
        group=_env("SAP_GROUP"),
        r3name=_env("SAP_R3NAME"),
    )


def load_adt_config() -> AdtConnectionConfig:
    tls_verify = _env("SAP_TLS_VERIFY", "false").lower() in ("1", "true", "yes")
    timeout_raw = _env("SAP_ADT_TIMEOUT", "60")
    return AdtConnectionConfig(
        url=_env("SAP_URL"),
        user=_env("SAP_USER"),
        password=_env("SAP_PASSWORD"),
        client=_env("SAP_CLIENT", "100"),
        language=_env("SAP_LANGUAGE", "EN"),
        session_type=_env("SAP_SESSION_TYPE", "stateless"),
        tls_verify=tls_verify,
        timeout=int(timeout_raw) if timeout_raw.isdigit() else 60,
    )


def backend_mode() -> BackendMode:
    mode = _env("SAP_BACKEND", "auto").lower()
    if mode in ("pyrfc", "adt", "auto"):
        return mode  # type: ignore[return-value]
    return "auto"


def is_sap_configured(config: SapConnectionConfig | None = None) -> bool:
    cfg = config or load_config()
    if not cfg.user or not cfg.password:
        return False
    if cfg.mshost:
        return True
    return bool(cfg.ashost)


def is_adt_configured(config: AdtConnectionConfig | None = None) -> bool:
    cfg = config or load_adt_config()
    return bool(cfg.url and cfg.user and cfg.password)


def sdk_home() -> str:
    return _env("SAPNWRFC_HOME")
