let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(ctx: AudioContext, frequency: number, startAt: number, duration: number, gainPeak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.05);
}

/** Chime de dos tonos para nuevas comandas que entran al board. */
export function playNewTicketChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 880, 0, 0.28, 0.22);
  tone(ctx, 1318.5, 0.12, 0.34, 0.18);
}

/** Confirmación suave al ejecutar una transición FSM. */
export function playTransitionSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 659.25, 0, 0.16, 0.15);
}

/** Feedback táctil del keypad de PIN. */
export function playKeypadClick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  tone(ctx, 440, 0, 0.06, 0.08);
}
