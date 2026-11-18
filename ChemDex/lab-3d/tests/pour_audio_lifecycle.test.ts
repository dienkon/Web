import { afterEach, expect, it, vi } from 'vitest';
import { pourAudio } from '../src/pour/audio/PourAudio';
import { useAppStore } from '../src/store/useAppStore';

const before = useAppStore.getState();
afterEach(() => { pourAudio.stopPourStream(); useAppStore.setState(before); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('restarts the stream during a fade without letting the old source disconnect the new one', () => {
  const sources: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended?: () => void }[] = [];
  const createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(10) }));
  const parameter = () => ({ setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const audio = {
    sampleRate: 48000, currentTime: 3, state: 'running', destination: {}, createBuffer,
    createBufferSource: () => {
      const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      sources.push(source);
      return source;
    },
    createGain: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), gain: parameter() })),
    createBiquadFilter: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), frequency: parameter(), Q: parameter() })),
  };
  vi.stubGlobal('window', { AudioContext: class { constructor() { return audio; } } });
  useAppStore.setState({ soundEnabled: false, isSimulationPaused: false });
  pourAudio.startPourStream();
  useAppStore.setState({ soundEnabled: true, isSimulationPaused: true });
  pourAudio.startPourStream();
  expect(sources).toHaveLength(0);

  useAppStore.setState({ isSimulationPaused: false });
  pourAudio.startPourStream();
  pourAudio.startPourStream();
  expect(sources).toHaveLength(1);
  pourAudio.stopPourStream();
  expect(sources[0].stop).toHaveBeenCalledExactlyOnceWith(3.08);
  pourAudio.startPourStream();
  expect(sources).toHaveLength(2);
  expect(createBuffer).toHaveBeenCalledOnce();
  sources[0].onended!();
  expect(sources[0].disconnect).toHaveBeenCalledOnce();
  expect(sources[1].disconnect).not.toHaveBeenCalled();
  pourAudio.updateFillRatio(1, 12);
  const currentFilter = audio.createBiquadFilter.mock.results[1].value;
  expect(currentFilter.frequency.setTargetAtTime).toHaveBeenCalledWith(1150, 3, 0.05);
  pourAudio.stopPourStream();
  expect(sources[1].stop).toHaveBeenCalledOnce();
});
