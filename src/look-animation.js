// Cosmetic animation only. This module never reads terrain, targets, visibility,
// vehicle specifications, or weapons, and never writes to a simulation object.
const TacticalLookAnimation = (() => {
  const TAU = Math.PI * 2, BLEND_SECONDS = 0.45;
  const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const mix = (from, to, weight) => wrap(from + wrap(to - from) * weight);
  const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  function create({ reducedMotion = false } = {}) {
    let time = 0, states = new WeakMap();
    function view(avatar) {
      const phase = reducedMotion ? 0 : time * TAU / 8;
      // Deliberately artistic angles/timing, not physical traverse capabilities.
      const idle = { turret: wrap(avatar.heading + Math.sin(phase) * Math.PI / 9),
        gaze: wrap(avatar.heading + Math.sin(phase) * Math.PI * 5 / 18) };
      let state = states.get(avatar);
      if (state?.mode === 'fixed' && time >= state.expiresAt) {
        state = { mode: 'idle', startedAt: state.expiresAt, fromTurret: state.angle, fromGaze: state.angle };
        states.set(avatar, state);
      }
      const fixed = state?.mode === 'fixed', target = fixed ? { turret: state.angle, gaze: state.angle } : idle;
      const weight = state && !reducedMotion ? ease((time - state.startedAt) / BLEND_SECONDS) : 1;
      return { mode: fixed ? 'fixed' : 'idle', turret: state ? mix(state.fromTurret, target.turret, weight) : target.turret,
        gaze: state ? mix(state.fromGaze, target.gaze, weight) : target.gaze,
        direction: fixed ? state.angle : null, remaining: fixed ? Math.max(0, state.expiresAt - time) : 0 };
    }
    return Object.freeze({
      view,
      setReducedMotion(value) { reducedMotion = !!value; },
      advance(seconds) { if (Number.isFinite(seconds) && seconds > 0) time += seconds; },
      focus(avatar, angle, duration = 10) {
        if (!Number.isFinite(angle) || !Number.isFinite(duration) || duration <= 0) return false;
        const from = view(avatar);
        states.set(avatar, { mode: 'fixed', angle: wrap(angle), startedAt: time, expiresAt: time + duration,
          fromTurret: from.turret, fromGaze: from.gaze });
        return true;
      },
      resume(avatar) {
        const from = view(avatar);
        states.set(avatar, { mode: 'idle', startedAt: time, fromTurret: from.turret, fromGaze: from.gaze });
      },
      reset() { time = 0; states = new WeakMap(); }
    });
  }
  return Object.freeze({ create });
})();
if (typeof module !== 'undefined') module.exports = TacticalLookAnimation;
