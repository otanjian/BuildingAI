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
        ):
            result, ready = verifier.verify(live=False)
        self.assertFalse(ready)
        self.assertFalse(result["local_ready"])
        self.assertNotIn("live", result)

    def test_redacts_configured_password_from_errors(self) -> None:
        with patch.object(verifier, "load_config") as load_config:
            load_config.return_value.password = "super-secret"
            self.assertEqual(verifier._redact("failed: super-secret"), "failed: ***")


if __name__ == "__main__":
    unittest.main()
