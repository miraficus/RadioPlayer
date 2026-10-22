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
	const languageSelect = document.getElementById('language-choice');
	const playerLogo = document.getElementById('player-logo');
	const logoFallback = document.getElementById('player-logo-fallback');
	let stations = {};
	let activeStation = null;
	let streamUrl = '';
	let playRequest = 0;
	let lastStreamTimestamp = 0;
	let qualities = {};
	let language = RadioI18n.resolveLanguage(readSetting('uiLanguage'), navigator);
	let statusKey = '';
	let playbackState = 'loading';
	const t = (key, values) => RadioI18n.translate(key, language, values);

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
	themeSelect.value = RadioThemes.apply(readSetting('selectedTheme'));
	themeSelect.addEventListener('change', () => {
		RadioThemes.apply(themeSelect.value);
		saveSetting('selectedTheme', themeSelect.value);
	});
	languageSelect.addEventListener('change', () => {
		language = RadioI18n.resolveLanguage(languageSelect.value, navigator);
		saveSetting('uiLanguage', language);
		translatePage();
	});
	document.getElementById('left').addEventListener('click', () => alert(t('about', {version: '1.5'})));
	document.getElementById('year').textContent = '© ' + new Date().getFullYear();
	playerLogo.addEventListener('error', () => { playerLogo.hidden = true; logoFallback.hidden = false; });
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

	function showStatus(key = '') {
		statusKey = key;
		status.textContent = key ? t(key) : '';
		status.hidden = !key;
	}
	function setPlaybackState(state) {
		playbackState = state;
		document.getElementById('playback-state').dataset.state = state;
		document.getElementById('playback-state-text').textContent = t('state.' + state);
	}
	function qualityLabel(quality) {
		return /^\d+k$/.test(quality) ? t('bitrate', {value: parseInt(quality, 10)}) : t('standard');
	}
	function translatePage() {
		document.documentElement.lang = language;
		document.title = t('title');
		languageSelect.value = language;
		for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
		for (const attribute of ['aria-label', 'title']) {
			for (const element of document.querySelectorAll('[data-i18n-' + attribute + ']')) {
				element.setAttribute(attribute, t(element.getAttribute('data-i18n-' + attribute)));
			}
		}
		for (const heading of wrapper.querySelectorAll('[data-language]')) {
			const key = 'group.' + heading.dataset.language;
			heading.textContent = t(key) === key ? heading.dataset.language : t(key);
		}
		if (activeStation) for (const option of qualitySelector.options) option.textContent = qualityLabel(option.value);
		showStatus(statusKey);
		setPlaybackState(playbackState);
		updatePlayButton();
		updateMuteButton();
	}
	function updatePlayButton() {
		const playing = !audio.paused;
		playButton.classList.toggle('playing', playing);
		playButton.title = t(playing ? 'stop' : 'play');
		playButton.setAttribute('aria-label', playButton.title);
		playButton.querySelector('svg').innerHTML = playing
			? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
			: '<path d="M8 5v14l11-7z"/>';
	}
	function updateMuteButton() {
		const muted = audio.muted || audio.volume === 0;
		muteButton.setAttribute('aria-pressed', String(muted));
		muteButton.title = t(muted ? 'unmute' : 'mute');
		muteButton.setAttribute('aria-label', muteButton.title);
		document.getElementById('mute-icon').innerHTML = muted
			? '<path d="M3 9v6h4l5 5V4L7 9H3zm13-2 2.5 2.5L21 7l1 1-2.5 2.5L22 13l-1 1-2.5-2.5L16 14l-1-1 2.5-2.5L15 8z"/>'
			: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
	}
	async function startPlayback() {
		if (!streamUrl) return;
		const request = ++playRequest;
		showStatus();
		setPlaybackState('connecting');
		// Each connection needs a fresh URL so a restart cannot reuse cached audio.
		const source = new URL(streamUrl);
		lastStreamTimestamp = Math.max(Date.now(), lastStreamTimestamp + 1);
		source.searchParams.set('time', String(lastStreamTimestamp));
		audio.src = source.href;
		try { await audio.play(); } catch (error) {
			if (request !== playRequest || error.name === 'AbortError') return;
			setPlaybackState(error.name === 'NotAllowedError' ? 'ready' : 'error');
			showStatus(error.name === 'NotAllowedError' ? 'error.autoplay' : 'error.play');
		}
	}
	function stopPlayback() {
		++playRequest;
		audio.pause();
		audio.removeAttribute('src');
		audio.load();
		updatePlayButton();
		setPlaybackState('stopped');
	}
	playButton.addEventListener('click', () => {
		if (audio.paused) startPlayback();
		else { stopPlayback(); showStatus(); }
	});
	audio.addEventListener('play', () => { updatePlayButton(); setPlaybackState('connecting'); });
	audio.addEventListener('pause', () => { updatePlayButton(); setPlaybackState('stopped'); });
	audio.addEventListener('playing', () => setPlaybackState('playing'));
	audio.addEventListener('waiting', () => { if (!audio.paused) setPlaybackState('connecting'); });
	audio.addEventListener('error', () => {
		if (audio.hasAttribute('src')) { setPlaybackState('error'); showStatus('error.stream'); }
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
		setPlaybackState('ready');
		if (resume) startPlayback();
	}
	function changeStation(key) {
		if (!Object.hasOwn(stations, key)) return;
		const resume = !audio.paused || autoplay.checked;
		activeStation = key;
		const station = stations[key];
		const name = document.getElementById('player-name');
		name.removeAttribute('data-i18n');
		name.textContent = station.name;
		playerLogo.src = station.img;
		playerLogo.hidden = false;
		logoFallback.hidden = true;
		for (const card of wrapper.querySelectorAll('.radio-icon')) card.setAttribute('aria-pressed', String(card.dataset.station === key));
		qualitySelector.replaceChildren();
		const available = Object.keys(station.url);
		for (const quality of available) {
			qualitySelector.add(new Option(qualityLabel(quality), quality));
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
			heading.dataset.language = language;
			const headingKey = 'group.' + language;
			heading.textContent = t(headingKey) === headingKey ? language : t(headingKey);
			const group = document.createElement('div');
			group.className = 'language-group';
			for (const station of groups.get(language).sort((a, b) => a.name.localeCompare(b.name, 'cs', {sensitivity:'base'}))) {
				const card = document.createElement('button');
				card.type = 'button';
				card.dataset.station = station.key;
				card.setAttribute('aria-pressed', String(station.key === activeStation));
				card.className = 'radio-icon';
				card.setAttribute('aria-label', station.name);
				card.addEventListener('click', () => changeStation(station.key));
				const image = document.createElement('img');
				image.src = station.img;
				image.alt = '';
				const name = document.createElement('span');
				name.className = 'station-name';
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
			document.getElementById('player-name').dataset.i18n = 'stationsUnavailable';
			document.getElementById('player-name').textContent = t('stationsUnavailable');
			wrapper.replaceChildren();
			const unavailable = new Option(t('unavailable'), '');
			unavailable.dataset.i18n = 'unavailable';
			qualitySelector.replaceChildren(unavailable);
			setPlaybackState('error');
			showStatus('error.stations');
		} finally {
			wrapper.setAttribute('aria-busy', 'false');
		}
	}
	translatePage();
	loadStations();
});
