let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

function tone(frequency: number, duration: number, type: OscillatorType = "sine", gainValue = 0.08): void {
  const ctx = getContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export function playKeypadClick(): void {
  tone(440, 0.04, "square", 0.04);
}

export function playAdd(): void {
  tone(660, 0.08);
}

export function playRemove(): void {
  tone(220, 0.08, "square", 0.05);
}

export function playSuccess(): void {
  tone(523.25, 0.1);
  setTimeout(() => tone(659.25, 0.1), 100);
  setTimeout(() => tone(783.99, 0.15), 200);
}
