# Radio Player

Current version: **1.5**.
## Description
Website for listening to Online Radios. You can also use the radios.m3u or .pls files and listen to radios in VLC or other media player that supports theese files, or use the jellyfin version. I live in Czech Republic so i will have mostly Czech radios on this website.

## Disclaimer
This thing is in development. (It may be forever)

## Local Testing
### Windows
Open Terminal in the docs folder and type in: python -m http.server.
Website can be acessed on: http://localhost:8000


## Stations and stream quality
The website loads its station list from `docs/stations.json`. Add or edit stations there;
there is no second station list in `index.html`. Each station has a `name`, `img`,
`lang`, and a `url` object with quality keys such as `128k`, `64k`, or `standard`.

The player shows only the qualities configured for the selected station and remembers
the selection per station in the browser. The default is `standard` when present,
otherwise the highest configured bitrate. The selector is disabled for stations with
only one stream. Switching quality continues playback if the radio was playing;
it leaves a stopped radio stopped. Stream addresses and bitrate labels must be
checked with the broadcaster; the player does not measure or convert audio quality.

Use the local HTTP server described above rather than opening `index.html` as a
`file://` URL, because browsers need to fetch `stations.json` over HTTP.

On phones (up to 689px), open the hamburger menu for the theme selector and source
code link. On wider screens these controls stay visible in the header.

## Code Snipppets 

### Links
- [This website on Github Pages](https://miraficus.github.io/RadioPlayer/)



### Links (Just for me)
- [Language Switch](https://www.google.com/search?q=javascript+language+switch&hl=cs&source=hp&ei=K6S9YonFAdT1gQab7KmwAg&iflsig=AJiK0e8AAAAAYr2yO0TX0iXic_dyw-Rj01IMeEqSGGCY&oq=javascrpit+lang&gs_lcp=Cgdnd3Mtd2l6EAEYBTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIECAAQDTIGCAAQHhAWMgYIABAeEBYyBggAEB4QFjIGCAAQHhAWOgoIABDqAhC0AhBDOhAILhDHARDRAxDqAhC0AhBDOhQIABDqAhC0AhCKAxC3AxDUAxDlAjoFCC4QgAQ6CwgAEIAEELEDEIMBOg4ILhCABBCxAxDHARCjAjoICC4QgAQQsQM6CAgAEIAEELEDOggILhCxAxCDAToLCC4QgAQQsQMQgwE6BAgAEEM6BAguEEM6BwgAELEDEEM6DgguEIAEELEDEIMBENQCOgUIABCABDoECAAQCkoFCDsSATFQqQRYkjVghFBoAHAAeACAAdUCiAGFD5IBCDExLjIuMi4xmAEAoAEBsAEK&sclient=gws-wiz)
- [PWA Icon Builder](https://www.pwabuilder.com/imageGenerator)
- [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/)

## Playlist synchronization

`docs/stations.json` is the source of truth for the website and all four fallback
playlists. Edit station addresses and quality variants there, not in the generated
M3U/PLS files. Website loading and quality selection are implemented separately in PR #13.

- `url`: normal web/VLC/Jellyfin stream addresses, preserving HTTP where originally configured.
- `http_url`: explicit HTTP-only fallback addresses for PSP Go and other legacy devices.
  Add one for every quality. It may point to a different endpoint; the generator never
  downgrades HTTPS automatically. An HTTP address can still redirect to HTTPS, so
  compatibility must be checked on the target device.
- `playlist`: display name, language/group, local logo path and unique numeric `order`
  for exported playlists. This preserves the existing Jellyfin metadata and station order.
- `img`, `name`, `lang`: the web player's logo, title and language.

GitHub Actions **Sync radio playlists** validates station metadata and runs the generator
on pull requests, providing all four outputs as the `radio-playlists` artifact. After
changes reach `main`, it regenerates and commits the four root playlists with the
built-in `GITHUB_TOKEN`. Run it manually from **Actions → Sync radio playlists → Run
workflow** on `main` when needed. It does not modify or deploy the website.

The workflow needs repository Actions enabled and permission for `contents: write`.
Branch rules can block its bot commit; in that case run the commands below locally,
commit the generated files through a pull request, or rerun the workflow after resolving
the push conflict. It never force pushes and requires no personal access token.

Local use (Python 3.10+; no extra dependencies):

```sh
python scripts/sync_playlists.py --write
python scripts/sync_playlists.py --check
python -m unittest discover -s tests -v
```

The generator preserves all configured variants, writes proper PLS entry numbers,
lengths, entry count and version, and includes Jellyfin `tvg-name`, `group-title` and
`tvg-logo`. These are generated files; manual playlist edits will be replaced.
Generation checks data and file consistency, not stream availability, real bitrate,
codec support, or whether an HTTP endpoint redirects to HTTPS.

## License
The original source code of Radio Player is licensed under the
**GNU Affero General Public License, version 3 or (at your option) any later
version** (`AGPL-3.0-or-later`). See [LICENSE](LICENSE) for the full license text.

Copyright (C) 2022-2026 miraficus and contributors.

This license applies to the project's original source code, scripts and
configuration. It does **not** apply to third-party radio station names, logos or
artwork, including the assets in `docs/assets/covers`. Rights in those materials
remain with their respective rights holders; no permission to reuse or redistribute
them is granted by the project's software license. See the
[third-party assets notice](docs/assets/covers/Files%20Downloaded%20From%20Internet).
Any other third-party components retain their own applicable licenses.

The application's **Zdrojový kód** link provides access to its source code.
If you publish a modified version, update that link to provide the corresponding
source of the version you actually operate and comply with the AGPL requirements.


