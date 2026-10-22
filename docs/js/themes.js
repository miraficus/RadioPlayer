// Copyright (C) 2022-2026 miraficus and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Theme colors are independent of layout and interface language.
(function () {
	const palettes = {
		light: ['#f3f6fa', '#ffffff', '#f8fafc', '#2563eb', '#e7effb', '#d5dfeb', '#142033', '#4b6078', '#ffffff', 'light'],
		dark: ['#181b20', '#242930', '#20252c', '#7ab4ff', '#303c4d', '#3b4655', '#f2f5fa', '#b4c0cf', '#12243b', 'dark'],
		black: ['#000000', '#080808', '#000000', '#b8d8ff', '#161c24', '#303842', '#ffffff', '#b8c4d3', '#101f32', 'dark'],
		blue: ['#0a1929', '#103455', '#0c2945', '#55a7ff', '#194668', '#214b70', '#f5f9ff', '#b4cbe0', '#09233c', 'dark'],
		cyber: ['#090d10', '#101b20', '#0b1418', '#00ffc8', '#133c37', '#23544e', '#00ffc8', '#a2c9c3', '#051b16', 'dark']
	};
	const properties = ['--main-bg-color', '--sec-bg-color', '--ter-bg-color', '--accent-bg-color', '--hover-bg-color', '--accent-border-color', '--main-text-color', '--sec-text-color', '--control-text-color'];
	function apply(name) {
		if (!Object.hasOwn(palettes, name)) name = 'blue';
		const root = document.documentElement;
		properties.forEach((property, index) => root.style.setProperty(property, palettes[name][index]));
		root.style.colorScheme = palettes[name][9];
		root.style.setProperty('--surface-pattern', name === 'cyber' ? 'radial-gradient(rgba(0,255,200,0.09) 1px, transparent 1px)' : 'none');
		root.dataset.theme = name;
		const browserColor = document.querySelector('meta[name="theme-color"]');
		if (browserColor) browserColor.content = palettes[name][0];
		return name;
	}
	globalThis.RadioThemes = Object.freeze({apply});
	let saved;
	try { saved = localStorage.getItem('selectedTheme'); } catch { /* Use default. */ }
	apply(saved);
})();
