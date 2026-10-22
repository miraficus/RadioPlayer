/*
Copyright (C) 2022-2026 miraficus and contributors
SPDX-License-Identifier: AGPL-3.0-or-later

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

Radio station artwork is excluded; see the notice in docs/assets/covers.
*/

document.addEventListener('DOMContentLoaded', () => {
	const audio = document.getElementById('audio');
	const playButton = document.getElementById('custom-play-btn');
	const muteButton = document.getElementById('custom-mute-btn');
	const volumeSlider = document.getElementById('volume-slider');
	const qualitySelector = document.getElementById('quality-selector');
	const autoplay = document.getElementById('autoplay');
	const status = document.getElementById('player-status');
	const wrapper = document.querySelector('.wrapper');
	let stations = {};
	let activeStation = null;
	let streamUrl = '';
	let playRequest = 0;
	let lastStreamTimestamp = 0;
	let qualities = {};

	// A blocked/full localStorage must not prevent the player from starting.
	function readSetting(key) {
		try { return localStorage.getItem(key); } catch { return null; }
	}
	function saveSetting(key, value) {
		try { localStorage.setItem(key, value); } catch { /* Settings are optional. */ }
	}
	try {
		const saved = JSON.parse(readSetting('stationQualities'));
		if (saved && typeof saved === 'object' && !Array.isArray(saved)) qualities = saved;
	} catch { /* Ignore an invalid saved preference. */ }

	const themeSelect = document.getElementById('themechoice');
	const savedTheme = readSetting('selectedTheme');
	if ([...themeSelect.options].some(option => option.value === savedTheme)) {
		themeSelect.value = savedTheme;
		themechange();
	}
	themeSelect.addEventListener('change', () => saveSetting('selectedTheme', themeSelect.value));
	autoplay.checked = readSetting('autoplayChecked') === 'true';
	autoplay.addEventListener('change', () => saveSetting('autoplayChecked', String(autoplay.checked)));

	const menu = document.getElementById('header-menu');
	const narrowScreen = matchMedia('(max-width: 689px)');
	const syncMenu = () => { menu.open = !narrowScreen.matches; };
	syncMenu();
	narrowScreen.addEventListener('change', syncMenu);
	document.addEventListener('click', event => {
		if (narrowScreen.matches && !menu.contains(event.target)) menu.open = false;
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && narrowScreen.matches && menu.open) {
			menu.open = false;
			menu.querySelector('summary').focus();
		}
	});

	function showStatus(message = '') {
		status.textContent = message;
		status.hidden = !message;
	}
	function updatePlayButton() {
		const playing = !audio.paused;
		playButton.classList.toggle('playing', playing);
		playButton.title = playing ? 'Zastavit' : 'Přehrát';
		playButton.setAttribute('aria-label', playButton.title);
		playButton.querySelector('svg').innerHTML = playing
			? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
			: '<path d="M8 5v14l11-7z"/>';
	}
	function updateMuteButton() {
		const muted = audio.muted || audio.volume === 0;
		muteButton.setAttribute('aria-pressed', String(muted));
		muteButton.title = muted ? 'Zapnout zvuk' : 'Ztlumit';
		muteButton.setAttribute('aria-label', muteButton.title);
		document.getElementById('mute-icon').innerHTML = muted
			? '<path d="M3 9v6h4l5 5V4L7 9H3zm13-2 2.5 2.5L21 7l1 1-2.5 2.5L22 13l-1 1-2.5-2.5L16 14l-1-1 2.5-2.5L15 8z"/>'
			: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
	}
	async function startPlayback() {
		if (!streamUrl) return;
		const request = ++playRequest;
		showStatus();
		// Each connection needs a fresh URL so a restart cannot reuse cached audio.
		const source = new URL(streamUrl);
		lastStreamTimestamp = Math.max(Date.now(), lastStreamTimestamp + 1);
		source.searchParams.set('time', String(lastStreamTimestamp));
		audio.src = source.href;
		try { await audio.play(); } catch (error) {
			if (request !== playRequest || error.name === 'AbortError') return;
			showStatus(error.name === 'NotAllowedError'
				? 'Pro spuštění rádia stiskni Přehrát.'
				: 'Stream se nepodařilo spustit. Zkus jinou kvalitu nebo stanici.');
		}
	}
	function stopPlayback() {
		++playRequest;
		audio.pause();
		audio.removeAttribute('src');
		audio.load();
		updatePlayButton();
	}
	playButton.addEventListener('click', () => {
		if (audio.paused) startPlayback();
		else { stopPlayback(); showStatus(); }
	});
	audio.addEventListener('play', updatePlayButton);
	audio.addEventListener('pause', updatePlayButton);
	audio.addEventListener('error', () => {
		if (audio.hasAttribute('src')) showStatus('Stream není dostupný. Zkus jinou kvalitu nebo stanici.');
	});
	audio.volume = Number(volumeSlider.value) / 100;
	volumeSlider.addEventListener('input', () => {
		audio.volume = Number(volumeSlider.value) / 100;
		if (audio.volume > 0) audio.muted = false;
	});
	muteButton.addEventListener('click', () => {
		if (audio.volume === 0) { audio.volume = 0.8; volumeSlider.value = 80; audio.muted = false; }
		else audio.muted = !audio.muted;
	});
	audio.addEventListener('volumechange', updateMuteButton);
	updateMuteButton();

	function applyStream(resume) {
		const source = stations[activeStation].url[qualitySelector.value];
		stopPlayback();
		streamUrl = source;
		showStatus();
		if (resume) startPlayback();
	}
	function changeStation(key) {
		if (!Object.hasOwn(stations, key)) return;
		const resume = !audio.paused || autoplay.checked;
		activeStation = key;
		const station = stations[key];
		document.getElementById('player-name').textContent = station.name;
		qualitySelector.replaceChildren();
		const available = Object.keys(station.url);
		for (const quality of available) {
			qualitySelector.add(new Option(/^\d+k$/.test(quality)
				? `${parseInt(quality, 10)} kb/s` : 'Standardní', quality));
		}
		const preferred = qualities[key];
		qualitySelector.value = available.includes(preferred) ? preferred
			: available.includes('standard') ? 'standard'
			: available.slice().sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0))[0];
		qualitySelector.disabled = available.length === 1;
		saveSetting('lastStation', key);
		applyStream(resume);
	}
	qualitySelector.addEventListener('change', () => {
		const resume = !audio.paused;
		qualities[activeStation] = qualitySelector.value;
		saveSetting('stationQualities', JSON.stringify(qualities));
		applyStream(resume);
	});

	function renderStations() {
		wrapper.replaceChildren();
		const groups = new Map();
		for (const [key, station] of Object.entries(stations)) {
			const language = station.lang || 'Jiné';
			if (!groups.has(language)) groups.set(language, []);
			groups.get(language).push({key, ...station});
		}
		const preferred = ['Česky', 'Anglicky'];
		const languages = [...preferred.filter(language => groups.has(language)),
			...[...groups.keys()].filter(language => !preferred.includes(language)).sort((a, b) => a.localeCompare(b, 'cs'))];
		for (const language of languages) {
			const heading = document.createElement('h2');
			heading.className = 'language-header';
			heading.textContent = language;
			const group = document.createElement('div');
			group.className = 'language-group';
			for (const station of groups.get(language).sort((a, b) => a.name.localeCompare(b.name, 'cs', {sensitivity:'base'}))) {
				const card = document.createElement('div');
				card.className = 'radio-icon';
				card.setAttribute('role', 'button');
				card.tabIndex = 0;
				card.setAttribute('aria-label', station.name);
				card.addEventListener('click', () => changeStation(station.key));
				card.addEventListener('keydown', event => {
					if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); changeStation(station.key); }
				});
				const image = document.createElement('img');
				image.src = station.img;
				image.alt = '';
				const name = document.createElement('a');
				name.textContent = station.name;
				card.append(image, name);
				group.append(card);
			}
			wrapper.append(heading, group);
		}
	}
	async function loadStations() {
		try {
			const response = await fetch('stations.json');
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) throw new Error('Empty station list');
			for (const station of Object.values(data)) {
				if (!station || typeof station.name !== 'string' || typeof station.img !== 'string'
					|| !station.url || typeof station.url !== 'object' || Array.isArray(station.url)
					|| !Object.keys(station.url).length || !Object.values(station.url).every(url => typeof url === 'string' && /^https?:\/\//.test(url))) {
					throw new Error('Invalid station data');
				}
			}
			stations = data;
			renderStations();
			playButton.disabled = muteButton.disabled = volumeSlider.disabled = false;
			const saved = readSetting('lastStation');
			changeStation(Object.hasOwn(stations, saved) ? saved : Object.hasOwn(stations, 'krokodyl') ? 'krokodyl' : Object.keys(stations)[0]);
		} catch (error) {
			console.error('Failed to load stations:', error);
			document.getElementById('player-name').textContent = 'Stanice nejsou dostupné';
			wrapper.replaceChildren();
			qualitySelector.replaceChildren(new Option('Nedostupné', ''));
			showStatus('Seznam stanic se nepodařilo načíst. Zkus obnovit stránku.');
		} finally {
			wrapper.setAttribute('aria-busy', 'false');
		}
	}
	loadStations();
});
