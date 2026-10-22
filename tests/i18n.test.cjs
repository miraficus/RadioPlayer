// Copyright (C) 2022-2026 miraficus and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

const assert = require('node:assert/strict');
const test = require('node:test');
const {messages, resolveLanguage, translate} = require('../docs/js/i18n.js');

for (const [locale, expected] of [['cs', 'cs'], ['cs-CZ', 'cs'], ['sk', 'cs'], ['sk-SK', 'cs'], ['CS-cz', 'cs'], ['en-US', 'en'], ['de-DE', 'en'], ['pl-PL', 'en'], ['ja', 'en'], ['', 'en']]) {
	test(`primary browser locale ${locale || '(missing)'} defaults to ${expected}`, () => {
		assert.equal(resolveLanguage(null, {languages: [locale], language: locale}), expected);
	});
}
test('only the primary preference decides the default', () => {
	assert.equal(resolveLanguage(null, {languages: ['de-DE', 'cs-CZ']}), 'en');
	assert.equal(resolveLanguage(null, {languages: ['sk-SK', 'en-US']}), 'cs');
	assert.equal(resolveLanguage(null, {languages: [], language: 'cs-CZ'}), 'cs');
	assert.equal(resolveLanguage(null, {}), 'en');
});
test('manual preference wins; unsupported saved values fall back to the browser', () => {
	assert.equal(resolveLanguage('en', {language: 'cs-CZ'}), 'en');
	assert.equal(resolveLanguage('cs', {language: 'en-US'}), 'cs');
	assert.equal(resolveLanguage('invalid', {language: 'sk-SK'}), 'cs');
});
test('both dictionaries translate the same keys and interpolation fields', () => {
	assert.deepEqual(Object.keys(messages.cs).sort(), Object.keys(messages.en).sort());
	for (const key of Object.keys(messages.en)) {
		assert.equal(typeof messages.cs[key], 'string');
		assert.equal(typeof messages.en[key], 'string');
		assert.deepEqual((messages.cs[key].match(/\{\w+\}/g) || []).sort(), (messages.en[key].match(/\{\w+\}/g) || []).sort(), key);
	}
	assert.equal(translate('bitrate', 'cs', {value: 128}), '128 kb/s');
	assert.equal(translate('bitrate', 'en', {value: 128}), '128 kbps');
	assert.match(translate('about', 'en', {version: '1.5'}), /Version 1\.5/);
	assert.equal(translate('play', 'unsupported'), 'Play');
	assert.equal(translate('unknown.key', 'en'), 'unknown.key');
});
