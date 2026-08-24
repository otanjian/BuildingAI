"""Detect SAP NW RFC SDK layout and native compatibility."""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

from sap_pyrfc_mcp.config import sdk_home

ArchitectureReader = Callable[[Path, str], list[str]]


def normalize_platform(value: str | None = None) -> str:
    raw = (value or os.environ.get("SAP_PYRFC_PLATFORM") or sys.platform).strip().lower()
    if raw.startswith("darwin") or raw.startswith("mac"):
        return "darwin"
    if raw.startswith("linux"):
        return "linux"
    if raw.startswith("win"):
        return "windows"
    return raw


def normalize_architecture(value: str | None) -> str:
    raw = (value or "unknown").strip().lower().replace("-", "_")
    aliases = {"aarch64": "arm64", "amd64": "x86_64", "x64": "x86_64", "i386": "x86", "i686": "x86"}
    return aliases.get(raw, raw)


def required_library_names(platform_name: str) -> tuple[str, str]:
    if platform_name == "darwin":
        return ("libsapnwrfc.dylib", "libsapucum.dylib")
    if platform_name == "linux":
        return ("libsapnwrfc.so", "libsapucum.so")
    if platform_name == "windows":
        return ("sapnwrfc.dll", "sapucum.dll")
    return ("libsapnwrfc.so", "libsapucum.so")


def _platform_label(platform_name: str) -> str:
    return {"darwin": "macOS", "linux": "Linux", "windows": "Windows"}.get(platform_name, platform_name)


def _sdk_lib_dir(home: str) -> Path:
    return Path(home) / "lib"


def _sdk_include_dir(home: str) -> Path:
    return Path(home) / "include"


def _read_architectures(path: Path, platform_name: str) -> list[str]:
    commands: list[list[str]] = []
    if platform_name == "darwin":
        commands.append(["lipo", "-archs", str(path)])
    commands.append(["file", str(path)])
    for command in commands:
        try:
            output = subprocess.run(command, check=True, capture_output=True, text=True, timeout=5).stdout
        except (FileNotFoundError, subprocess.SubprocessError):
            continue
        found: list[str] = []
        for pattern, name in (
            (r"\b(?:arm64|aarch64)\b", "arm64"),
            (r"\b(?:x86_64|x86-64|amd64)\b", "x86_64"),
            (r"\b(?:i386|i686)\b", "x86"),
        ):
            if re.search(pattern, output, re.IGNORECASE):
                found.append(name)
        if found:
            return sorted(set(found))
    return []


def _opposite_platform(lib_dir: Path, platform_name: str) -> str | None:
    candidates = {
        "darwin": (("libsapnwrfc.so", "Linux"), ("sapnwrfc.dll", "Windows")),
        "linux": (("libsapnwrfc.dylib", "macOS"), ("sapnwrfc.dll", "Windows")),
        "windows": (("libsapnwrfc.dylib", "macOS"), ("libsapnwrfc.so", "Linux")),
    }
    for filename, label in candidates.get(platform_name, ()):
        if (lib_dir / filename).exists():
            return label
    return None


def probe_sdk(
    home: str | None = None,
    *,
    platform_name: str | None = None,
    python_architecture: str | None = None,
    host_architecture: str | None = None,
    architecture_reader: ArchitectureReader | None = None,
) -> dict[str, Any]:
    root = (home or sdk_home()).strip()
    target_platform = normalize_platform(platform_name)
    python_arch = normalize_architecture(python_architecture or platform.machine())
    host_arch = normalize_architecture(host_architecture or platform.machine())
    required = list(required_library_names(target_platform))
    base: dict[str, Any] = {
        "present": False,
        "ready": False,
        "home": root or None,
        "platform": target_platform,
        "platform_label": _platform_label(target_platform),
        "host_architecture": host_arch,
        "python_architecture": python_arch,
        "library_architectures": [],
        "architecture_compatible": None,
        "required_libraries": required,
        "missing_libraries": required,
        "libraries": [],
        "tier": "missing",
        "has_sapcrypto": False,
        "has_crypto_api": False,
        "error": None,
    }
    if not root:
        base["error"] = "SAPNWRFC_HOME is not configured."
        base["pyrfc_recommendation"] = (
            f"Install an official SAP NW RFC SDK for {_platform_label(target_platform)} {python_arch}: "
            "./install-nwrfcsdk.sh <archive-or-directory>"
        )
        return base

    lib_dir = _sdk_lib_dir(root)
    include_dir = _sdk_include_dir(root)
    if lib_dir.is_dir():
        base["libraries"] = sorted(path.name for path in lib_dir.iterdir() if path.is_file())
    header = include_dir / "sapnwrfc.h"
    missing = [name for name in required if not (lib_dir / name).exists()]
    if not header.is_file():
        missing.append("include/sapnwrfc.h")
    base["missing_libraries"] = missing

    other_platform = _opposite_platform(lib_dir, target_platform) if lib_dir.is_dir() else None
    if missing:
        if other_platform:
            base["tier"] = "platform_mismatch"
            base["error"] = (
                f"Detected a {other_platform} SAP NW RFC SDK, but this runtime requires "
                f"{_platform_label(target_platform)} libraries: {', '.join(required)}."
            )
        else:
            base["tier"] = "invalid"
            base["error"] = "SDK layout is incomplete; missing: " + ", ".join(missing)
        base["pyrfc_recommendation"] = base["error"]
        return base

    content = header.read_text(encoding="utf-8", errors="ignore")
    has_crypto_api = "RfcLoadCryptoLibrary" in content
    crypto_suffix = {"darwin": ".dylib", "linux": ".so", "windows": ".dll"}.get(target_platform, "")
    has_sapcrypto = any(
        name.startswith("libsapcrypto") or name == "sapcrypto.dll"
        for name in base["libraries"]
        if not crypto_suffix or name.endswith(crypto_suffix)
    )
    base["has_crypto_api"] = has_crypto_api
    base["has_sapcrypto"] = has_sapcrypto
    base["tier"] = "modern" if has_crypto_api and has_sapcrypto else "legacy"

    reader = architecture_reader or _read_architectures
    architectures_by_library = {name: reader(lib_dir / name, target_platform) for name in required}
    known_architectures = sorted(
        {normalize_architecture(arch) for values in architectures_by_library.values() for arch in values}
    )
    base["library_architectures"] = known_architectures
    base["library_architectures_by_file"] = architectures_by_library
    compatible = bool(known_architectures) and all(
        python_arch in {normalize_architecture(value) for value in values}
        for values in architectures_by_library.values()
    )
    base["architecture_compatible"] = compatible
    if not known_architectures:
        base["error"] = "Could not determine the native architecture of the SAP SDK libraries."
    elif not compatible:
        base["error"] = (
            f"Python uses {python_arch}, but SAP SDK libraries contain {', '.join(known_architectures)}. "
            "Install a matching SDK or use matching Python."
        )
    else:
        base["present"] = True
        base["ready"] = True

    base["pyrfc_recommendation"] = (
        "Install the pinned PyRFC runtime: ./install-pyrfc.sh" if base["ready"] else base["error"]
    )
    return base


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect SAP NW RFC SDK compatibility")
    parser.add_argument("--home", default=None, help="SDK root; defaults to SAPNWRFC_HOME")
    parser.add_argument("--require-ready", action="store_true", help="Exit non-zero unless ready")
    args = parser.parse_args()
    result = probe_sdk(args.home)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ready"] or not args.require_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
