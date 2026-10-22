// Copyright (C) 2022-2026 miraficus and contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/js/player.js'), 'utf8');
const start = source.indexOf('\tasync function startPlayback()');
const end = source.indexOf('\tfunction stopPlayback()', start);
assert(start >= 0 && end > start, 'Find the actual playback implementation');

// Exercise the real startPlayback body with a clock and media sink, without
// contacting a broadcaster or depending on browser codec/autoplay support.
function player(url) {
	const audio = {src: 'https://old.example/cached', plays: 0, async play() { this.plays++; }};
	const context = vm.createContext({
		audio, streamUrl: url, playRequest: 0, lastStreamTimestamp: 0,
		URL, Math, clock: 1700000000000, showStatus() {}, setPlaybackState() {}
	});
	vm.runInContext('const Date = {now: () => clock};\n' + source.slice(start, end), context);
	return {audio, context, play: () => context.startPlayback()};
}

test('add the original time parameter before starting a plain stream', async () => {
	const p = player('https://radio.example/live.mp3');
	await p.play();
	assert.equal(p.audio.src, 'https://radio.example/live.mp3?time=1700000000000');
	assert.equal(p.audio.plays, 1);
});

test('preserve HTTP, port, existing parameters and fragment', async () => {
	const p = player('http://radio.example:8000/live?token=a%2Bb&quality=64#live');
	await p.play();
	const url = new URL(p.audio.src);
	assert.equal(url.protocol, 'http:');
	assert.equal(url.port, '8000');
	assert.equal(url.searchParams.get('token'), 'a+b');
	assert.equal(url.searchParams.get('quality'), '64');
	assert.equal(url.hash, '#live');
	assert.equal(url.searchParams.get('time'), '1700000000000');
});

test('replace an old time value without adding duplicate parameters', async () => {
	const p = player('https://radio.example/live?time=1&token=abc&time=2');
	await p.play();
	const url = new URL(p.audio.src);
	assert.deepEqual(url.searchParams.getAll('time'), ['1700000000000']);
	assert.equal(url.searchParams.get('token'), 'abc');
});

test('restarts and quality/station switches get unique URLs even with a fixed clock', async () => {
	const p = player('https://radio.example/live128');
	await p.play();
	const first = p.audio.src;
	await p.play();
	assert.notEqual(p.audio.src, first);
	assert.equal(new URL(p.audio.src).searchParams.get('time'), '1700000000001');
	p.context.streamUrl = 'https://radio.example/live64';
	await p.play();
	assert.equal(new URL(p.audio.src).pathname, '/live64');
	assert.equal(new URL(p.audio.src).searchParams.get('time'), '1700000000002');
	p.context.clock = 1;
	p.context.streamUrl = 'https://other.example/stream';
	await p.play();
	assert.equal(new URL(p.audio.src).hostname, 'other.example');
	assert.equal(new URL(p.audio.src).searchParams.get('time'), '1700000000003');
	assert.equal(p.audio.plays, 4);
});

test('no source selected means no playback request', async () => {
	const p = player('');
	await p.play();
	assert.equal(p.audio.plays, 0);
});
