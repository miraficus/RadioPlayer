#!/usr/bin/env python3
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

"""Generate fallback playlists from docs/stations.json, without contacting streams."""

import argparse
import difflib
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ('radios.m3u', 'radios.pls', 'radios-http.pls', 'radios-jellyfin.m3u')
LOGO_BASE = 'https://raw.githubusercontent.com/miraficus/RadioPlayer/main/docs/'


def text(value, label):
    if not isinstance(value, str) or not value.strip() or any(c in value for c in '\r\n"\x00'):
        raise ValueError(f'{label}: expected nonempty text without quotes or line breaks')
    return value


def stream_url(value, label, http_only=False):
    value = text(value, label)
    parts = urlsplit(value)
    if parts.scheme not in (('http',) if http_only else ('http', 'https')) or not parts.netloc or any(c.isspace() for c in value):
        raise ValueError(f'{label}: invalid {"HTTP " if http_only else ""}stream URL')
    return value


def load_stations(root=ROOT):
    data = json.loads((root / 'docs/stations.json').read_text(encoding='utf-8'))
    if not isinstance(data, dict) or not data:
        raise ValueError('stations.json must contain a nonempty station object')
    orders = set()
    for key, station in data.items():
        if not isinstance(station, dict):
            raise ValueError(f'{key}: expected a station object')
        text(station.get('name'), f'{key}.name')
        text(station.get('lang'), f'{key}.lang')
        image = text(station.get('img'), f'{key}.img')
        meta = station.get('playlist')
        urls, http_urls = station.get('url'), station.get('http_url')
        if not isinstance(meta, dict) or not isinstance(urls, dict) or not urls or not isinstance(http_urls, dict):
            raise ValueError(f'{key}: url, http_url and playlist objects are required')
        if urls.keys() != http_urls.keys():
            raise ValueError(f'{key}: every quality must have an explicit http_url fallback')
        for quality, url in urls.items():
            if not re.fullmatch(r'(?:[1-9]\d*k|standard)', quality):
                raise ValueError(f'{key}: invalid quality key {quality!r}')
            stream_url(url, f'{key}.url.{quality}')
            stream_url(http_urls[quality], f'{key}.http_url.{quality}', http_only=True)
        text(meta.get('name'), f'{key}.playlist.name')
        text(meta.get('lang'), f'{key}.playlist.lang')
        logo = text(meta.get('logo'), f'{key}.playlist.logo')
        order = meta.get('order')
        if type(order) is not int or order < 0 or order in orders:
            raise ValueError(f'{key}: playlist.order must be a unique nonnegative integer')
        orders.add(order)
        for asset in (image, logo):
            path = (root / 'docs' / asset).resolve()
            if not path.is_relative_to((root / 'docs/assets/covers').resolve()) or not path.is_file():
                raise ValueError(f'{key}: missing or invalid local cover: {asset}')
    return data


def render_playlists(stations):
    m3u = ['#EXTM3U', '#PLAYLIST:Mirova Rádia', '#EXTALB:Mirova Rádia', '']
    jellyfin = m3u.copy()
    pls, http_pls = ['[playlist]'], ['[playlist]']
    count = 0
    for station in sorted(stations.values(), key=lambda s: s['playlist']['order']):
        meta = station['playlist']
        for quality, url in station['url'].items():
            count += 1
            suffix = f' {quality[:-1]}' if quality.endswith('k') else ' (standard)'
            name = meta['name'] + suffix
            title = f"{meta['lang']} - {name}"
            m3u.extend([f'#EXTINF:0,{title}', url, ''])
            logo = LOGO_BASE + quote(meta['logo'], safe='/')
            jellyfin.extend([f'#EXTINF:-1 tvg-name="{name}" group-title="{meta["lang"]}" tvg-logo="{logo}",{name}', url, ''])
            for lines, address in ((pls, url), (http_pls, station['http_url'][quality])):
                lines.extend([f'File{count}={address}', f'Title{count}={title}', f'Length{count}=-1', ''])
    for lines in (pls, http_pls):
        lines.extend([f'NumberOfEntries={count}', 'Version=2'])
    return {name: ('\r\n' if name.endswith('.pls') else '\n').join(lines).rstrip() + ('\r\n' if name.endswith('.pls') else '\n')
            for name, lines in zip(OUTPUTS, (m3u, pls, http_pls, jellyfin))}


def sync(root=ROOT, check=False):
    generated = render_playlists(load_stations(root))
    changed = []
    for name, content in generated.items():
        path = root / name
        previous = path.read_bytes().decode('utf-8') if path.exists() else ''
        if previous == content:
            continue
        changed.append(name)
        if check:
            sys.stdout.writelines(difflib.unified_diff(previous.splitlines(True), content.splitlines(True), fromfile=name, tofile=f'{name} (generated)'))
        else:
            path.write_bytes(content.encode('utf-8'))
            print(f'Updated {name}')
    if check and changed:
        print('Playlists are out of sync. Run: python scripts/sync_playlists.py --write', file=sys.stderr)
        return 1
    if not changed:
        print('All four playlists match stations.json.')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='Report differences without writing files')
    mode.add_argument('--write', action='store_true', help='Update the four generated playlists')
    args = parser.parse_args()
    try:
        return sync(check=args.check)
    except (ValueError, OSError, KeyError) as error:
        parser.exit(2, f'Playlist generation failed: {error}\n')


if __name__ == '__main__':
    sys.exit(main())
