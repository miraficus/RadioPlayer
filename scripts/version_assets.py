#!/usr/bin/env python3
# Copyright (C) 2022-2026 miraficus and contributors
# SPDX-License-Identifier: AGPL-3.0-or-later

"""Keep CSS/JS URLs in index.html tied to their file contents, avoiding stale assets."""

import argparse
import hashlib
from pathlib import Path
import re
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
ASSET = re.compile(r'''\b(?:src|href)=(?P<quote>["'])(?P<url>(?:css|js)/[^"'?#]+\.(?:css|js)(?:\?[^"'#]*)?(?:\#[^"']*)?)(?P=quote)''')


def versioned_html(root=ROOT):
    docs = root / 'docs'
    original = (docs / 'index.html').read_bytes().decode('utf-8')

    def replace(match):
        url = urlsplit(match['url'])
        path = (docs / url.path).resolve()
        if not path.is_relative_to(docs.resolve()) or not path.is_file():
            raise ValueError(f'Missing or invalid asset: {url.path}')
        version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        query = [(key, value) for key, value in parse_qsl(url.query, keep_blank_values=True) if key != 'v']
        query.append(('v', version))
        updated = urlunsplit(('', '', url.path, urlencode(query), url.fragment))
        return match[0].replace(match['url'], updated, 1)

    updated, count = ASSET.subn(replace, original)
    if not count:
        raise ValueError('No local CSS/JS asset references found in index.html')
    return original, updated


def sync(root=ROOT, check=False):
    original, updated = versioned_html(root)
    if original == updated:
        print('CSS/JS URLs match their file content hashes.')
        return 0
    if check:
        print('Asset versions are stale. Run: python scripts/version_assets.py --write', file=sys.stderr)
        return 1
    (root / 'docs/index.html').write_bytes(updated.encode('utf-8'))
    print('Updated CSS/JS content hashes in docs/index.html.')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        return sync(check=args.check)
    except (ValueError, OSError) as error:
        parser.exit(2, f'Cannot version assets: {error}\n')


if __name__ == '__main__':
    sys.exit(main())
