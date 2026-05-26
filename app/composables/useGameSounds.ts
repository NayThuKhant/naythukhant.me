// Web Audio API sound effects — no external assets required.
// All sounds are synthesised procedurally via oscillators + noise.

let _ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx || _ctx.state === 'closed')
      _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (_ctx.state === 'suspended') _ctx.resume()
    return _ctx
  } catch { return null }
}

function beep(freq: number, type: OscillatorType = 'sine', dur = 0.12, vol = 0.22, ramp?: number) {
  const ctx = ac(); if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (ramp !== undefined) osc.frequency.exponentialRampToValueAtTime(ramp, ctx.currentTime + dur)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.02)
  } catch {}
}

function noise(dur = 0.08, vol = 0.1) {
  const ctx = ac(); if (!ctx) return
  try {
    const n   = Math.ceil(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf
    const g   = ctx.createGain()
    src.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    src.start(ctx.currentTime); src.stop(ctx.currentTime + dur + 0.02)
  } catch {}
}

export function useGameSounds() {
  return {
    // ── UI ────────────────────────────────────────────────────────────────────
    click:     () => beep(700, 'square', 0.05, 0.07),
    move:      () => beep(440, 'sine',   0.06, 0.1),
    place:     () => beep(330, 'sine',   0.08, 0.12),
    // ── Positive ──────────────────────────────────────────────────────────────
    score:     () => beep(880, 'sine',    0.1, 0.18),
    correct:   () => { beep(600, 'sine', 0.08, 0.18); setTimeout(() => beep(900, 'sine', 0.12, 0.2), 80) },
    wordFound: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 'sine', 0.12, 0.2), i * 90)) },
    levelUp:   () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 'triangle', 0.14, 0.24), i * 100)) },
    win:       () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 'triangle', 0.16, 0.26), i * 110)) },
    // ── Negative ──────────────────────────────────────────────────────────────
    wrong:     () => beep(180, 'sawtooth', 0.18, 0.14, 90),
    miss:      () => beep(260, 'square',   0.1,  0.1),
    die:       () => { beep(380, 'sawtooth', 0.1, 0.16); setTimeout(() => beep(200, 'sawtooth', 0.22, 0.16, 100), 110) },
    lose:      () => { [380, 280, 190, 140].forEach((f, i) => setTimeout(() => beep(f, 'sawtooth', 0.18, 0.2), i * 120)) },
    // ── Mechanics ─────────────────────────────────────────────────────────────
    shoot:     () => beep(1100, 'square', 0.07, 0.08, 550),
    pop:       () => { beep(480, 'sine', 0.04, 0.16, 880); noise(0.04, 0.07) },
    drop:      () => beep(200, 'sine',  0.1, 0.14, 140),
    jump:      () => beep(320, 'sine',  0.11, 0.17, 640),
    bounce:    () => beep(420, 'sine',  0.06, 0.14, 580),
    explosion: () => { noise(0.14, 0.18); beep(80, 'sawtooth', 0.14, 0.18) },
    chomp:     () => { beep(190, 'square', 0.04, 0.1); setTimeout(() => beep(140, 'square', 0.04, 0.08), 50) },
    // ── Special ───────────────────────────────────────────────────────────────
    piano:  (col: number) => { const f = [261, 330, 392, 523]; beep(f[col] ?? 392, 'triangle', 0.26, 0.3) },
    simon:  (i: number)   => { const f = [415, 310, 252, 209]; beep(f[i % 4] ?? 310, 'sine', 0.36, 0.26) },
    roll:   ()            => { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.03, 0.07), i * 22) },
  }
}
