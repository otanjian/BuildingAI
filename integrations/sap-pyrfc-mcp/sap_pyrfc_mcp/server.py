"""SAP PyRFC MCP server (stdio transport, fronted by supergateway for HTTP)."""

from __future__ import annotations

import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from sap_pyrfc_mcp import connection

mcp = FastMCP(
    "sap-pyrfc-mcp",
    instructions=(
        "Call SAP via PyRFC (RFC/BAPI) or ADT HTTPS fallback. "
        "Run healthcheck first — shows active backend (pyrfc or adt). "
        "read_table works on both backends; call_rfc requires PyRFC; run_query requires ADT."
    ),
)


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


@mcp.tool()
def healthcheck() -> str:
    """Check SDK, PyRFC, ADT fallback, and SAP connectivity."""
    status = connection.pyrfc_status()
    active = status["active_backend"]
    result: dict[str, Any] = {"status": "ok", **status}

    if active == "none":
        result["status"] = "not_ready"
        result["next_steps"] = [
            "PyRFC: ./install-nwrfcsdk.sh --from-github && ./install-pyrfc.sh",
            "Set SAP_ASHOST / SAP_SYSNR (or SAP_URL — host auto-derived)",
            "Linux: add local hostname to /etc/hosts if RFC fails with hostname unknown",
            "ADT fallback: set SAP_URL + credentials",
        ]
        return _json(result)

    if status.get("local_hostname_warning"):
        result["hostname_hint"] = (
            f"Add to /etc/hosts: 127.0.1.1 {status['local_hostname_warning']}"
        )

    if active == "adt" and not status["pyrfc_installed"]:
        result["status"] = "adt_fallback"
        result["note"] = (
            "PyRFC not installed; using ADT HTTPS. read_table/run_query work; "
            "call_rfc requires PyRFC + NW RFC SDK."
        )
    elif active == "adt" and status.get("sap_rfc_configured") and status.get("pyrfc_installed"):
        result["note"] = (
            "RFC params are set but active backend is ADT. "
            "Set SAP_BACKEND=pyrfc for BAPI/call_rfc, or fix RFC connectivity."
        )

    try:
        ping = connection.ping_sap()
        result["status"] = "connected"
        result["ping"] = ping
    except Exception as exc:
        result["status"] = "connection_failed"
        result["error"] = str(exc)

    return _json(result)


@mcp.tool()
def call_rfc(function_name: str, parameters_json: str = "{}") -> str:
    """Invoke an RFC or BAPI function module (PyRFC backend only)."""
    try:
        parameters = json.loads(parameters_json or "{}")
        if not isinstance(parameters, dict):
            raise ValueError("parameters_json must decode to a JSON object")
    except (json.JSONDecodeError, ValueError) as exc:
        return _json({"error": f"Invalid parameters_json: {exc}"})

    try:
        data = connection.call_rfc(function_name.upper(), parameters)
        return _json({"function": function_name.upper(), "backend": "pyrfc", "result": data})
    except Exception as exc:
        return _json({"function": function_name.upper(), "error": str(exc)})


@mcp.tool()
def get_rfc_function_description(function_name: str) -> str:
    """Return metadata for an RFC function module (PyRFC backend only)."""
    try:
        data = connection.get_function_description(function_name.upper())
        return _json({"function": function_name.upper(), "backend": "pyrfc", "description": data})
    except Exception as exc:
        return _json({"function": function_name.upper(), "error": str(exc)})


@mcp.tool()
def read_table(
    table_name: str,
    fields: str = "",
    where: str = "",
    row_count: int = 20,
    row_skip: int = 0,
) -> str:
    """Read SAP table rows via PyRFC RFC_READ_TABLE or ADT datapreview."""
    field_list = [part.strip() for part in fields.split(",") if part.strip()] or None
    try:
        data = connection.read_table(
            table_name=table_name,
            fields=field_list,
            where=where,
            row_count=row_count,
            row_skip=row_skip,
        )
        return _json(data)
    except Exception as exc:
        return _json({"table": table_name.upper(), "error": str(exc)})


@mcp.tool()
def run_query(sql_query: str, row_count: int = 20) -> str:
    """Run freestyle SQL via ADT datapreview (ADT backend only)."""
    try:
        data = connection.run_query(sql_query, row_count=row_count)
        return _json(data)
    except Exception as exc:
        return _json({"error": str(exc)})


def main() -> None:
    mcp.run()
