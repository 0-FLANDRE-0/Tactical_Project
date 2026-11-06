const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../src/look-animation.js');
const near = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('idle scans both sides and the gaze scans wider than the turret', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.advance(2); let pose = animation.view(avatar);
  assert(pose.turret > 0); assert(pose.gaze > pose.turret);
  animation.advance(4); pose = animation.view(avatar);
  assert(pose.turret < 0); assert(pose.gaze < pose.turret);
});
test('focusing is continuous and converges to the requested world bearing', () => {
  const animation = create(), avatar = { heading: 0 }, before = animation.view(avatar);
  assert(animation.focus(avatar, Math.PI / 2, 5));
  near(animation.view(avatar).turret, before.turret);
  animation.advance(.5); near(animation.view(avatar).gaze, Math.PI / 2);
});
test('a fixed bearing is not a tracked point or hull-relative heading', () => {
  const animation = create(), avatar = { heading: 0, x: 0, y: 0 };
  animation.focus(avatar, 1, 10); animation.advance(1);
  avatar.heading = -2; avatar.x = 50; avatar.y = 90;
  const pose = animation.view(avatar); near(pose.turret, 1); near(pose.gaze, 1); near(pose.direction, 1);
});
test('expiration occurs at the deadline and blends back into idle', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.focus(avatar, 1, 5); animation.advance(4.999);
  assert.equal(animation.view(avatar).mode, 'fixed');
  animation.advance(.001); const expired = animation.view(avatar);
  assert.equal(expired.mode, 'idle'); near(expired.remaining, 0); near(expired.turret, 1);
  animation.advance(.5); assert.notEqual(animation.view(avatar).turret, 1);
});
test('late samples do not restart the expiration blend', () => {
  const animation = create(), idle = create(), avatar = { heading: .4 };
  animation.focus(avatar, 1, 5); animation.advance(20); idle.advance(20);
  assert.deepEqual(animation.view(avatar), idle.view(avatar));
});
test('repeated commands replace direction and deadline', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.focus(avatar, .5, 5); animation.advance(4);
  animation.focus(avatar, -.5, 10); animation.advance(2);
  assert.equal(animation.view(avatar).mode, 'fixed'); near(animation.view(avatar).remaining, 8);
  near(animation.view(avatar).gaze, -.5);
});
test('resume blends immediately to idle and discards the old deadline', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.focus(avatar, 1, 10); animation.advance(1);
  animation.resume(avatar); const pose = animation.view(avatar);
  assert.equal(pose.mode, 'idle'); near(pose.turret, 1); assert.equal(pose.direction, null);
});
test('avatars and replacement objects with the same ID are independent', () => {
  const animation = create(), a = { id: 'a', heading: 0 }, b = { id: 'b', heading: 0 };
  animation.focus(a, 1, 10); animation.advance(1);
  assert.equal(animation.view(b).mode, 'idle');
  assert.equal(animation.view({ id: 'a', heading: 0 }).mode, 'idle');
  assert.equal(animation.view(a).mode, 'fixed');
});
test('reset removes all poses and resets the presentation clock', () => {
  const animation = create(), avatar = { heading: .4 };
  animation.focus(avatar, 1, 10); animation.advance(4); animation.reset();
  assert.deepEqual(animation.view(avatar), create().view(avatar));
});
test('invalid inputs cannot poison pose values or replace a valid command', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.focus(avatar, .4, 5);
  for (const angle of [NaN, Infinity, -Infinity]) assert.equal(animation.focus(avatar, angle, 5), false);
  for (const duration of [NaN, Infinity, -1, 0]) assert.equal(animation.focus(avatar, 0, duration), false);
  for (const seconds of [NaN, Infinity, -1, 0]) animation.advance(seconds);
  near(animation.view(avatar).remaining, 5); near(animation.view(avatar).direction, .4);
});
test('shortest-angle blending crosses the wrap boundary', () => {
  const animation = create(), avatar = { heading: Math.PI - .1 };
  animation.focus(avatar, -Math.PI + .1, 10); animation.advance(.225);
  assert(Math.abs(animation.view(avatar).turret) > 3);
});
test('reading and animating a frozen avatar never changes simulation state', () => {
  const animation = create(), avatar = Object.freeze({ heading: .3, turret: .7, path: Object.freeze([]), x: 1, y: 2 });
  const before = JSON.stringify(avatar);
  animation.focus(avatar, 1, 5);
  for (let i = 0; i < 100; i++) { animation.advance(.1); animation.view(avatar); }
  animation.resume(avatar); animation.reset();
  assert.equal(JSON.stringify(avatar), before);
});
test('the presentation timer remains still until explicitly advanced', () => {
  const animation = create(), avatar = { heading: 0 };
  animation.focus(avatar, 1, 5); const before = animation.view(avatar);
  for (let i = 0; i < 100; i++) assert.deepEqual(animation.view(avatar), before);
});

test('reduced motion removes automatic sway and transition motion', () => {
  const animation = create({ reducedMotion: true }), avatar = { heading: .2 };
  animation.advance(2); near(animation.view(avatar).turret, .2); near(animation.view(avatar).gaze, .2);
  animation.focus(avatar, 1, 5); near(animation.view(avatar).gaze, 1);
  animation.advance(5); near(animation.view(avatar).gaze, .2);
  animation.setReducedMotion(false); assert.notEqual(animation.view(avatar).gaze, .2);
});
