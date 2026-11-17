import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeNode {
  connect: (dest: FakeNode) => FakeNode;
  start: (when: number) => void;
  stop: (when: number) => void;
  frequency: { value: number };
  gain: { value: number; setValueAtTime: (v: number, t: number) => void; exponentialRampToValueAtTime: (v: number, t: number) => void };
  type: string;
}

async function freshSounds() {
  vi.resetModules();
  return await import("../src/lib/sounds");
}

function installFakeAudio() {
  const created: FakeNode[] = [];
  const ctx = {
    state: "running",
    currentTime: 0,
    destination: {} as FakeNode,
    resume: vi.fn(),
    createOscillator: vi.fn(() => {
      const node: FakeNode = {
        type: "sine",
        frequency: { value: 0 },
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn((dest: FakeNode) => dest),
        start: vi.fn(),
        stop: vi.fn(),
      };
      created.push(node);
      return node;
    }),
    createGain: vi.fn(() => ({
      connect: vi.fn((dest: FakeNode) => dest),
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    })),
  };
  vi.stubGlobal("AudioContext", vi.fn(function () { return ctx; }));
  return { ctx, created };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("sounds", () => {
  it("chime de nueva comanda crea dos osciladores", async () => {
    const sounds = await freshSounds();
    const { created } = installFakeAudio();
    sounds.playNewTicketChime();
    expect(created).toHaveLength(2);
  });

  it("transicion y keypad crean un oscilador", async () => {
    const sounds = await freshSounds();
    const a = installFakeAudio();
    sounds.playTransitionSound();
    expect(a.created).toHaveLength(1);

    const sounds2 = await freshSounds();
    const b = installFakeAudio();
    sounds2.playKeypadClick();
    expect(b.created).toHaveLength(1);
  });

  it("reanuda contexto suspendido", async () => {
    const sounds = await freshSounds();
    const { ctx } = installFakeAudio();
    ctx.state = "suspended";
    sounds.playTransitionSound();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("es no-op seguro sin AudioContext", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const sounds = await freshSounds();
    expect(() => sounds.playNewTicketChime()).not.toThrow();
  });
});
