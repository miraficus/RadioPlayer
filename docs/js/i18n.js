// Copyright (C) 2022-2026 miraficus and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

(function (root, factory) {
	const api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.RadioI18n = api;
})(globalThis, () => {
	const messages = {
		cs: {
			title: 'Radio Online', menu: 'Nabídka', appearance: 'Vzhled', language: 'Jazyk',
			source: 'Zdrojový kód', aboutLabel: 'O přehrávači Radio',
			'theme.light': 'Světlý vzhled', 'theme.dark': 'Tmavý vzhled',
			'theme.black': 'Černý vzhled', 'theme.blue': 'Modrý vzhled', 'theme.cyber': 'Cyber vzhled',
			quality: 'Kvalita', autoplay: 'Autoplay', volume: 'Hlasitost',
			play: 'Přehrát', stop: 'Zastavit', mute: 'Ztlumit', unmute: 'Zapnout zvuk',
			loading: 'Načítání stanic…', unavailable: 'Nedostupné', stationsUnavailable: 'Stanice nejsou dostupné',
			standard: 'Standardní', bitrate: '{value} kb/s',
			'group.Česky': 'Česky', 'group.Anglicky': 'Anglicky', 'group.Polsky': 'Polsky',
			'group.Německy': 'Německy', 'group.Rakousky': 'Rakousky', 'group.Jiné': 'Jiné',
			'state.loading': 'Načítání…', 'state.ready': 'Připraveno k přehrávání',
			'state.connecting': 'Připojování…', 'state.playing': 'Právě hraje',
			'state.stopped': 'Zastaveno', 'state.error': 'Stream není dostupný',
			'error.autoplay': 'Pro spuštění rádia stiskni Přehrát.',
			'error.play': 'Stream se nepodařilo spustit. Zkus jinou kvalitu nebo stanici.',
			'error.stream': 'Stream není dostupný. Zkus jinou kvalitu nebo stanici.',
			'error.stations': 'Seznam stanic se nepodařilo načíst. Zkus obnovit stránku.',
			about: 'Verze {version}\nLicence: GNU AGPLv3 nebo novější\nLicence kódu se nevztahuje na loga rádií.'
		},
		en: {
			title: 'Radio Online', menu: 'Menu', appearance: 'Appearance', language: 'Language',
			source: 'Source code', aboutLabel: 'About Radio player',
			'theme.light': 'Light theme', 'theme.dark': 'Dark theme',
			'theme.black': 'Black theme', 'theme.blue': 'Blue theme', 'theme.cyber': 'Cyber theme',
			quality: 'Quality', autoplay: 'Autoplay', volume: 'Volume',
			play: 'Play', stop: 'Stop', mute: 'Mute', unmute: 'Unmute',
			loading: 'Loading stations…', unavailable: 'Unavailable', stationsUnavailable: 'Stations unavailable',
			standard: 'Standard', bitrate: '{value} kbps',
			'group.Česky': 'Czech', 'group.Anglicky': 'English', 'group.Polsky': 'Polish',
			'group.Německy': 'German', 'group.Rakousky': 'Austrian', 'group.Jiné': 'Other',
			'state.loading': 'Loading…', 'state.ready': 'Ready to play',
			'state.connecting': 'Connecting…', 'state.playing': 'Now playing',
			'state.stopped': 'Stopped', 'state.error': 'Stream unavailable',
			'error.autoplay': 'Press Play to start the radio.',
			'error.play': 'Could not start the stream. Try another quality or station.',
			'error.stream': 'The stream is unavailable. Try another quality or station.',
			'error.stations': 'Could not load the station list. Try refreshing the page.',
			about: 'Version {version}\nLicense: GNU AGPLv3 or later\nThe code license does not cover radio station logos.'
		}
	};
	function resolveLanguage(saved, browser = globalThis.navigator) {
		if (saved === 'cs' || saved === 'en') return saved;
		// Use the PRIMARY preference: e.g. [de-DE, cs-CZ] must still select English.
		const primary = String(browser?.languages?.[0] || browser?.language || 'en').toLowerCase().split(/[-_]/)[0];
		return primary === 'cs' || primary === 'sk' ? 'cs' : 'en';
	}
	function translate(key, language, values = {}) {
		const text = messages[language]?.[key] ?? messages.en[key] ?? key;
		return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
	}
	return Object.freeze({messages, resolveLanguage, translate});
});
