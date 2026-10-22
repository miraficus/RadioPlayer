# Copyright (C) 2022-2026 miraficus and contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.
#
# Radio station artwork is excluded; see the notice in docs/assets/covers.

import copy
import importlib.util
import io
from pathlib import Path
import re
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync_playlists', ROOT / 'scripts/sync_playlists.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class PlaylistTests(unittest.TestCase):
    def setUp(self):
        self.stations = sync.load_stations()
        self.generated = {name: content.replace('\r\n', '\n') for name, content in sync.render_playlists(self.stations).items()}
        self.urls = [url for station in sorted(self.stations.values(), key=lambda s: s['playlist']['order']) for url in station['url'].values()]

    def test_all_formats_include_every_quality(self):
        count = len(self.urls)
        for name in ('radios.m3u', 'radios-jellyfin.m3u'):
            urls = [line for line in self.generated[name].splitlines() if line.startswith(('http://', 'https://'))]
            self.assertEqual(urls, self.urls)
        for name in ('radios.pls', 'radios-http.pls'):
            entries = re.findall(r'^File(\d+)=(.+)$', self.generated[name], re.M)
            self.assertEqual([int(number) for number, _ in entries], list(range(1, count + 1)))
            self.assertEqual(len(re.findall(r'^Title\d+=', self.generated[name], re.M)), count)
            self.assertEqual(len(re.findall(r'^Length\d+=-1$', self.generated[name], re.M)), count)
            self.assertIn(f'NumberOfEntries={count}\nVersion=2\n', self.generated[name])
        self.assertEqual([url for _, url in re.findall(r'^File(\d+)=(.+)$', self.generated['radios.pls'], re.M)], self.urls)

    def test_http_fallback_uses_explicit_urls(self):
        station = next(iter(self.stations.values()))
        quality = next(iter(station['url']))
        station['http_url'][quality] = 'http://legacy.example:8000/different-endpoint'
        rendered = sync.render_playlists(self.stations)
        self.assertIn('http://legacy.example:8000/different-endpoint', rendered['radios-http.pls'])
        self.assertNotIn('http://legacy.example', rendered['radios.pls'])
        urls = re.findall(r'^File\d+=(.+)$', rendered['radios-http.pls'], re.M)
        self.assertTrue(all(url.startswith('http://') for url in urls))

    def test_jellyfin_metadata_and_labels_match(self):
        lines = self.generated['radios-jellyfin.m3u'].splitlines()
        for line in lines:
            if not line.startswith('#EXTINF:'):
                continue
            name = re.search(r'tvg-name="([^"]+)"', line).group(1)
            self.assertTrue(line.endswith(',' + name))
            self.assertIn('group-title="', line)
            self.assertIn('tvg-logo="https://raw.githubusercontent.com/', line)
        self.assertIn('Metal Heart Radio CZSK 128', self.generated['radios.m3u'])
        self.assertIn('Fajn Radio (standard)', self.generated['radios.m3u'])

    def test_generation_is_repeatable_and_check_does_not_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(sync, 'load_stations', return_value=self.stations), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(sync.sync(root, check=True), 1)
                self.assertFalse(any(root.iterdir()))
                self.assertEqual(sync.sync(root), 0)
                self.assertEqual(sync.sync(root, check=True), 0)
                previous = {path.name: path.read_bytes() for path in root.iterdir()}
                self.assertEqual(sync.sync(root), 0)
                self.assertEqual(previous, {path.name: path.read_bytes() for path in root.iterdir()})
                (root / 'radios.pls').write_text('manual edit', encoding='utf-8')
                self.assertEqual(sync.sync(root, check=True), 1)
                self.assertEqual((root / 'radios.pls').read_text(), 'manual edit')

    def test_rejects_missing_fallback_bad_quality_and_injected_metadata(self):
        cases = [
            lambda station: station['http_url'].clear(),
            lambda station: station['http_url'].update({'128k': 'https://not-http.example/stream'}),
            lambda station: station['playlist'].update({'name': 'bad\n#EXTINF:injection'}),
            lambda station: station.update({'img': '../index.html'}),
            lambda station: station['url'].update({'dstandard': 'https://example.test/stream'}),
        ]
        for mutate in cases:
            data = copy.deepcopy(self.stations)
            mutate(data['beat'])
            with self.subTest(mutate=mutate), patch.object(sync.json, 'loads', return_value=data):
                with self.assertRaises(ValueError):
                    sync.load_stations()


if __name__ == '__main__':
    unittest.main()
