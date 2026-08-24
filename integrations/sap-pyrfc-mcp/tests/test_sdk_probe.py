#!/usr/bin/env python3
"""Cross-platform SDK probe tests without licensed SAP binaries."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sap_pyrfc_mcp.sdk_probe import probe_sdk  # noqa: E402


class SdkProbeTests(unittest.TestCase):
    def _sdk(self, libraries: tuple[str, ...], *, crypto_api: bool = False) -> tempfile.TemporaryDirectory[str]:
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        (root / "lib").mkdir()
        (root / "include").mkdir()
        header = "void RfcLoadCryptoLibrary(void);" if crypto_api else "/* legacy */"
        (root / "include" / "sapnwrfc.h").write_text(header, encoding="utf-8")
        for name in libraries:
            (root / "lib" / name).write_bytes(b"native-placeholder")
        return temp

    def test_ready_macos_arm64_layout(self) -> None:
        temp = self._sdk(("libsapnwrfc.dylib", "libsapucum.dylib", "libsapcrypto.dylib"), crypto_api=True)
        self.addCleanup(temp.cleanup)

        result = probe_sdk(
            temp.name,
            platform_name="darwin",
            python_architecture="arm64",
            host_architecture="arm64",
            architecture_reader=lambda _path, _platform: ["arm64"],
        )

        self.assertTrue(result["present"])
        self.assertTrue(result["ready"])
        self.assertEqual(result["tier"], "modern")
        self.assertEqual(result["required_libraries"], ["libsapnwrfc.dylib", "libsapucum.dylib"])
        self.assertTrue(result["architecture_compatible"])

    def test_ready_linux_x86_64_legacy_layout(self) -> None:
        temp = self._sdk(("libsapnwrfc.so", "libsapucum.so"))
        self.addCleanup(temp.cleanup)

        result = probe_sdk(
            temp.name,
            platform_name="linux",
            python_architecture="x86_64",
            host_architecture="x86_64",
            architecture_reader=lambda _path, _platform: ["x86_64"],
        )

        self.assertTrue(result["ready"])
        self.assertEqual(result["tier"], "legacy")

    def test_reports_operating_system_mismatch(self) -> None:
        temp = self._sdk(("libsapnwrfc.so", "libsapucum.so"))
        self.addCleanup(temp.cleanup)

        result = probe_sdk(
            temp.name,
            platform_name="darwin",
            python_architecture="arm64",
            host_architecture="arm64",
            architecture_reader=lambda _path, _platform: ["x86_64"],
        )

        self.assertFalse(result["ready"])
        self.assertEqual(result["tier"], "platform_mismatch")
        self.assertIn("Linux", result["error"])
        self.assertIn("macOS", result["error"])

    def test_reports_python_and_library_architecture_mismatch(self) -> None:
        temp = self._sdk(("libsapnwrfc.dylib", "libsapucum.dylib"))
        self.addCleanup(temp.cleanup)

        result = probe_sdk(
            temp.name,
            platform_name="darwin",
            python_architecture="arm64",
            host_architecture="arm64",
            architecture_reader=lambda _path, _platform: ["x86_64"],
        )

        self.assertFalse(result["ready"])
        self.assertFalse(result["present"])
        self.assertFalse(result["architecture_compatible"])
        self.assertIn("arm64", result["error"])
        self.assertIn("x86_64", result["error"])

    def test_missing_required_library_is_not_present(self) -> None:
        temp = self._sdk(("libsapnwrfc.dylib",))
        self.addCleanup(temp.cleanup)

        result = probe_sdk(
            temp.name,
            platform_name="darwin",
            python_architecture="arm64",
            host_architecture="arm64",
            architecture_reader=lambda _path, _platform: ["arm64"],
        )

        self.assertFalse(result["present"])
        self.assertFalse(result["ready"])
        self.assertIn("libsapucum.dylib", result["missing_libraries"])


if __name__ == "__main__":
    unittest.main()
