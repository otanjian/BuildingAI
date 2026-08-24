#!/usr/bin/env python3
"""Verification result tests without SAP native dependencies."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sap_pyrfc_mcp import verify as verifier  # noqa: E402


class VerifyTests(unittest.TestCase):
    def test_offline_not_ready_does_not_attempt_live_connection(self) -> None:
        with (
            patch.object(verifier, "probe_sdk", return_value={"ready": False}),
            patch.object(verifier, "_extension_path", return_value=None),
            patch.object(verifier, "_native_architecture_mismatches", return_value=[]),
        ):
            result, ready = verifier.verify(live=False)
        self.assertFalse(ready)
        self.assertFalse(result["local_ready"])
        self.assertNotIn("live", result)

    def test_redacts_configured_password_from_errors(self) -> None:
        with patch.object(verifier, "load_config") as load_config:
            load_config.return_value.password = "super-secret"
            self.assertEqual(verifier._redact("failed: super-secret"), "failed: ***")

    def test_reports_selected_runtime_profile(self) -> None:
        profile = {
            "architecture": "x86_64",
            "execution_mode": "rosetta",
            "python_version": "3.10",
            "pyrfc_version": "3.3",
        }
        with (
            patch.object(verifier, "probe_sdk", return_value={"ready": False}),
            patch.object(verifier, "_extension_path", return_value=None),
            patch.object(verifier, "runtime_profile", return_value=profile),
            patch.object(verifier, "_native_architecture_mismatches", return_value=[]),
        ):
            result, _ = verifier.verify(live=False)

        self.assertEqual(result["runtime_profile"], profile)

    def test_rejects_mixed_native_extension_architectures(self) -> None:
        mismatch = [{"path": "/tmp/_rust.abi3.so", "expected": "x86_64", "detected": ["arm64"]}]
        with (
            patch.object(verifier, "probe_sdk", return_value={"ready": True}),
            patch.object(verifier, "_extension_path", return_value=Path("/tmp/_cyrfc.so")),
            patch.object(verifier, "_native_dependencies", return_value=[]),
            patch.object(verifier, "_native_architecture_mismatches", return_value=mismatch),
            patch.dict(sys.modules, {"pyrfc": type("FakePyrfc", (), {"__version__": "3.3", "Connection": object})}),
        ):
            result, ready = verifier.verify(live=False)

        self.assertFalse(ready)
        self.assertEqual(result["native_architecture_mismatches"], mismatch)


if __name__ == "__main__":
    unittest.main()
