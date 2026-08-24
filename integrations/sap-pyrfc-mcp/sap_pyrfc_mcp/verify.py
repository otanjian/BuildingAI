"""Verify local PyRFC readiness and optionally perform RFC_PING."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

from sap_pyrfc_mcp.config import is_sap_configured, load_config
from sap_pyrfc_mcp.sdk_probe import normalize_platform, probe_sdk


def _extension_path() -> Path | None:
    try:
        for item in importlib.metadata.files("pyrfc") or []:
            name = item.name
            if (name.endswith("-darwin.so") or name.startswith("_cyrfc")) and name.endswith(".so"):
                return Path(item.locate()).resolve()
    except importlib.metadata.PackageNotFoundError:
        return None
    return None


def _native_dependencies(extension: Path | None) -> list[str]:
    if extension is None:
        return []
    command = ["otool", "-L", str(extension)] if normalize_platform() == "darwin" else ["ldd", str(extension)]
    try:
        output = subprocess.run(command, check=True, capture_output=True, text=True, timeout=10).stdout
    except (FileNotFoundError, subprocess.SubprocessError):
        return []
    return [line.strip() for line in output.splitlines()[1:] if line.strip()]


def _redact(value: str) -> str:
    redacted = value
    for secret in (os.environ.get("SAP_PASSWORD", ""), load_config().password):
        if secret:
            redacted = redacted.replace(secret, "***")
    return redacted


def verify(*, live: bool = False) -> tuple[dict[str, Any], bool]:
    sdk = probe_sdk()
    extension = _extension_path()
    result: dict[str, Any] = {
        "status": "not_ready",
        "python": {"executable": sys.executable, "version": platform.python_version(), "architecture": platform.machine()},
        "sdk": sdk,
        "pyrfc": {"package_present": extension is not None, "extension": str(extension) if extension else None},
        "live_requested": live,
    }
    import_ready = False
    try:
        import pyrfc
        from pyrfc import Connection

        result["pyrfc"].update(
            {"import_ready": True, "version": getattr(pyrfc, "__version__", None), "connection_class": Connection.__name__}
        )
        import_ready = True
    except Exception as exc:  # Native loaders can raise subclasses other than ImportError.
        result["pyrfc"].update({"import_ready": False, "error_type": type(exc).__name__, "error": _redact(str(exc))})
    result["pyrfc"]["native_dependencies"] = _native_dependencies(extension)

    local_ready = bool(sdk.get("ready")) and import_ready
    result["local_ready"] = local_ready
    if not local_ready:
        return result, False

    if live:
        if not is_sap_configured():
            result["live"] = {"status": "not_configured", "error": "RFC credentials are not configured."}
            return result, False
        try:
            from sap_pyrfc_mcp.connection import ping_sap

            ping = ping_sap(rfc=load_config(), adt=None, preferred="pyrfc")
            result["live"] = {"status": "connected", "ping": ping}
        except Exception as exc:
            result["live"] = {"status": "failed", "error_type": type(exc).__name__, "error": _redact(str(exc))}
            return result, False
    result["status"] = "ready"
    return result, True


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify SAP PyRFC local runtime")
    parser.add_argument("--live", action="store_true", help="Also connect and invoke RFC_PING")
    args = parser.parse_args()
    result, ready = verify(live=args.live)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
