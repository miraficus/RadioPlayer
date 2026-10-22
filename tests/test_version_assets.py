# Copyright (C) 2022-2026 miraficus and contributors
# SPDX-License-Identifier: AGPL-3.0-or-later

from contextlib import redirect_stderr, redirect_stdout
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('version_assets', ROOT / 'scripts/version_assets.py')
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


class AssetVersionsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / 'docs/css').mkdir(parents=True)
        (self.root / 'docs/js').mkdir()
        (self.root / 'docs/css/base.css').write_bytes(b'body { color: blue; }')
        (self.root / 'docs/js/player.js').write_bytes(b'console.log("player");')
        self.index = self.root / 'docs/index.html'
        self.index.write_bytes(b'<link href="css/base.css">\r\n<script src="js/player.js"></script>\r\n')

    def test_content_changes_update_only_the_changed_asset_url(self):
        with redirect_stdout(io.StringIO()):
            assets.sync(self.root)
            before = self.index.read_bytes()
            (self.root / 'docs/js/player.js').write_bytes(b'console.log("updated");')
            assets.sync(self.root)
        after = self.index.read_bytes()
        self.assertEqual(before.splitlines()[0], after.splitlines()[0])
        self.assertNotEqual(before.splitlines()[1], after.splitlines()[1])
        self.assertIn(b'\r\n', after)
        digest = hashlib.sha256(b'console.log("updated");').hexdigest()[:12]
        self.assertIn(f'player.js?v={digest}', after.decode())

    def test_check_does_not_write_and_write_is_repeatable(self):
        before = self.index.read_bytes()
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            self.assertEqual(assets.sync(self.root, check=True), 1)
            self.assertEqual(self.index.read_bytes(), before)
            self.assertEqual(assets.sync(self.root), 0)
            after = self.index.read_bytes()
            self.assertEqual(assets.sync(self.root, check=True), 0)
            self.assertEqual(assets.sync(self.root), 0)
            self.assertEqual(self.index.read_bytes(), after)

    def test_preserves_other_parameters_fragments_and_external_urls(self):
        self.index.write_text("<script src='js/player.js?mode=mobile&v=old&v=older#entry'></script>\n<link href='https://example.org/style.css'>")
        _, updated = assets.versioned_html(self.root)
        self.assertIn('mode=mobile&v=', updated)
        self.assertIn('#entry', updated)
        self.assertEqual(updated.count('&v='), 1)
        self.assertIn("href='https://example.org/style.css'", updated)

    def test_missing_assets_are_reported(self):
        (self.root / 'docs/js/player.js').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing or invalid asset'):
            assets.versioned_html(self.root)

    def test_mobile_menu_is_closed_in_initial_html(self):
        source = (ROOT / 'docs/index.html').read_text()
        import re
        menu = re.search(r'<details\b[^>]*id="header-menu"[^>]*>', source)[0]
        self.assertNotRegex(menu, r'\sopen(?:\s|=|>)')


if __name__ == '__main__':
    unittest.main()
