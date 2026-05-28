"""Unified SAP access: PyRFC when available, ADT HTTPS fallback otherwise."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Iterator, Literal

from sap_pyrfc_mcp import adt_fallback
from sap_pyrfc_mcp.config import (
    SapConnectionConfig,
    backend_mode,
    is_adt_configured,
    is_sap_configured,
    load_adt_config,
    load_config,
    sdk_home,
)
from sap_pyrfc_mcp.sdk_probe import probe_sdk

BackendName = Literal["pyrfc", "adt", "none"]

_pyrfc_import_error: str | None = None
_pyrfc_version: str | None = None
_pyrfc_checked = False


def _check_pyrfc_import() -> None:
    global _pyrfc_checked, _pyrfc_import_error, _pyrfc_version
    if _pyrfc_checked:
        return
    try:
        import pyrfc

        _pyrfc_version = getattr(pyrfc, "__version__", None)
    except ImportError as exc:
        _pyrfc_import_error = str(exc)
    _pyrfc_checked = True


def pyrfc_installed() -> bool:
    _check_pyrfc_import()
    return _pyrfc_import_error is None


def resolve_backend(preferred: str | None = None) -> BackendName:
    mode = (preferred or backend_mode()).lower()
    rfc_ready = pyrfc_installed() and is_sap_configured()
    adt_ready = adt_fallback.adt_available()

    if mode == "pyrfc":
        return "pyrfc" if rfc_ready else ("adt" if adt_ready else "none")
    if mode == "adt":
        return "adt" if adt_ready else ("pyrfc" if rfc_ready else "none")

    if rfc_ready:
        return "pyrfc"
    if adt_ready:
        return "adt"
    return "none"


def pyrfc_status() -> dict[str, Any]:
    _check_pyrfc_import()
    sdk = probe_sdk()
    configured = is_sap_configured()
    adt_configured = is_adt_configured()
    active = resolve_backend()

    return {
        "backend_mode": backend_mode(),
        "active_backend": active,
        "pyrfc_installed": _pyrfc_import_error is None,
        "pyrfc_version": _pyrfc_version,
        "pyrfc_error": _pyrfc_import_error,
        "sapnwrfc_home": sdk_home() or None,
        "sdk": sdk,
        "sap_rfc_configured": configured,
        "sap_adt_configured": adt_configured,
        "connection_params": load_config().redacted() if configured else None,
        "adt_params": load_adt_config().redacted() if adt_configured else None,
        "local_hostname_warning": os.environ.get("SAP_LOCAL_HOSTNAME_WARNING"),
    }


def _require_pyrfc():
    from pyrfc import Connection

    return Connection


def connection_error_message(backend: BackendName | None = None) -> str:
    active = backend or resolve_backend()
    if active == "pyrfc":
        return ""
    if active == "adt":
        return adt_fallback.adt_error_message()

    _check_pyrfc_import()
    if not _pyrfc_import_error and is_sap_configured():
        return ""
    if is_adt_configured():
        return adt_fallback.adt_error_message()

    parts = []
    if not pyrfc_installed():
        parts.append(
            f"PyRFC unavailable ({_pyrfc_import_error or 'not installed'}). "
            "Run ./install-nwrfcsdk.sh && ./install-pyrfc.sh"
        )
    if not is_sap_configured() and not is_adt_configured():
        parts.append(
            "Configure SAP_ASHOST + credentials for RFC, or SAP_URL (ADT HTTPS) for fallback."
        )
    return " ".join(parts)


@contextmanager
def sap_connection(config: SapConnectionConfig | None = None) -> Iterator[Any]:
    if resolve_backend() != "pyrfc":
        raise RuntimeError(connection_error_message())

    Connection = _require_pyrfc()
    cfg = config or load_config()
    conn = Connection(**cfg.to_connection_params())
    try:
        yield conn
    finally:
        conn.close()


def ping_sap() -> dict[str, Any]:
    backend = resolve_backend()
    if backend == "adt":
        return adt_fallback.AdtClient().ping()
    with sap_connection() as conn:
        result = conn.call("RFC_PING")
        return {"backend": "pyrfc", "result": result}


def call_rfc(function_name: str, parameters: dict[str, Any] | None = None) -> Any:
    if resolve_backend() == "adt":
        raise RuntimeError(
            f"call_rfc({function_name}) requires PyRFC backend. "
            "Arbitrary RFC/BAPI calls are not available via ADT. "
            "Install PyRFC (./install-pyrfc.sh) or use sap-abap-adt-mcp for ADT tools."
        )
    params = parameters or {}
    with sap_connection() as conn:
        return conn.call(function_name, **params)


def get_function_description(function_name: str) -> dict[str, Any]:
    if resolve_backend() == "adt":
        raise RuntimeError(
            "get_rfc_function_description requires PyRFC backend. "
            "Use sap-abap-adt-mcp searchObject / DDIC tools via ADT instead."
        )
    with sap_connection() as conn:
        description = conn.get_function_description(function_name)
        parameters = []
        for param in description.parameters:
            type_desc = param.type_description
            parameters.append(
                {
                    "name": param.name,
                    "parameter_type": param.parameter_type,
                    "direction": param.direction,
                    "nuc_length": param.nuc_length,
                    "uc_length": param.uc_length,
                    "decimals": param.decimals,
                    "default_value": param.default_value,
                    "parameter_text": param.parameter_text,
                    "optional": param.optional,
                    "type_description": type_desc.name if type_desc else None,
                }
            )
        return {
            "function_name": function_name,
            "parameters": parameters,
        }


def read_table(
    table_name: str,
    fields: list[str] | None = None,
    where: str = "",
    row_count: int = 20,
    row_skip: int = 0,
) -> dict[str, Any]:
    backend = resolve_backend()
    if backend == "none":
        raise RuntimeError(connection_error_message())
    if backend == "adt":
        if row_skip:
            raise RuntimeError("ADT fallback does not support row_skip; refine SQL WHERE instead.")
        return adt_fallback.AdtClient().read_table(
            table_name=table_name,
            fields=fields,
            where=where,
            row_count=row_count,
        )

    options = [{"TEXT": where}] if where else []
    field_rows = [{"FIELDNAME": name.upper()} for name in (fields or [])]
    params: dict[str, Any] = {
        "QUERY_TABLE": table_name.upper(),
        "DELIMITER": "|",
        "ROWCOUNT": max(1, min(row_count, 500)),
        "ROWSKIPS": max(0, row_skip),
    }
    if options:
        params["OPTIONS"] = options
    if field_rows:
        params["FIELDS"] = field_rows

    result = call_rfc("RFC_READ_TABLE", params)
    columns = [item.get("FIELDNAME", "") for item in result.get("FIELDS", [])]
    rows = []
    for raw in result.get("DATA", []):
        line = raw.get("WA", "")
        rows.append(dict(zip(columns, line.split("|"), strict=False)) if columns else {"WA": line})

    return {
        "table": table_name.upper(),
        "backend": "pyrfc",
        "row_count": len(rows),
        "columns": columns,
        "rows": rows,
    }


def run_query(sql_query: str, row_count: int = 20) -> dict[str, Any]:
    if resolve_backend() != "adt":
        raise RuntimeError("run_query is available only when active backend is ADT.")
    return adt_fallback.AdtClient().run_query(sql_query, row_count=row_count)
