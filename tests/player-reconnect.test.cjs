// SPDX-License-Identifier: AGPL-3.0-or-later
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

const source = readFileSync(new URL('../docs/js/player.js', 'file://' + __filename), 'utf8');
function setup() {
	const timers = new Map();
	let next = 0;
	let starts = 0;
	const context = vm.createContext({
		audio: {paused: true, hasAttribute: () => true, pause() {}, removeAttribute() {}, load() {}},
		streamUrl: 'https://example.test/live', wantsPlayback: true, playRequest: 1,
		reconnectAttempts: 0, reconnectTimer: undefined,
		startPlayback: () => starts++,
		updatePlayButton() {}, setPlaybackState() {}, showStatus() {},
		setTimeout: callback => {timers.set(++next, callback); return next;},
		clearTimeout: id => timers.delete(id)
	});
	vm.runInContext(
		source.slice(source.indexOf('function requestPlayback()'), source.indexOf("playButton.addEventListener('click'")) +
		source.slice(source.indexOf('function handleStreamFailure()'), source.indexOf("audio.addEventListener('error', handleStreamFailure)")),
		context
	);
	return {context, timers, starts: () => starts, tick() {
		for (const [id, callback] of [...timers]) {timers.delete(id); callback();}
	}};
}

test('stream failure deduplicates retries and bounds reconnections', () => {
	const {context, timers, tick, starts} = setup();
	context.handleStreamFailure();
	context.handleStreamFailure();
	assert.equal(timers.size, 1);
	tick();
	context.handleStreamFailure();
	tick();
	context.handleStreamFailure();
	assert.equal(starts(), 2);
	assert.equal(timers.size, 0);
});

test('system pause cancels pending reconnection, play can restart live', () => {
	const {context, timers, tick, starts} = setup();
	context.handleStreamFailure();
	context.stopPlayback();
	assert.equal(timers.size, 0);
	tick();
	assert.equal(starts(), 0);
	context.requestPlayback();
	assert.equal(starts(), 1);
});
