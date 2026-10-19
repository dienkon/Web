import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../audio/soundManager';
import { spatialSound } from '../../audio/SpatialSoundEngine';
import { useStore } from '../../store/useStore';

interface OrientationGateState {
  isBlocked: boolean;
  isTouchDevice: boolean;
  isPortrait: boolean;
  needsFullscreen?: boolean;
  enterLandscape?: () => Promise<void>;
  entryMessage?: string;
}

const EMPTY_STATE: OrientationGateState = {
  isBlocked: false,
  isTouchDevice: false,
  isPortrait: false,
};

const readDeviceState = () => {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches || height > width;

  document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
  document.documentElement.style.setProperty('--app-height', `${height}px`);

  return { width, isTouchDevice, isPortrait };
};

export const requestLandscapeFullscreen = async () => {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // iOS Safari and embedded browsers may reject fullscreen.
  }

  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch {
    // The blocking portrait overlay remains the supported fallback.
  }
};

export const useOrientationGate = (): OrientationGateState => {
  const view = useStore((state) => state.view);
  const setRunState = useStore((state) => state.setRunState);
  const [state, setState] = useState<OrientationGateState>(EMPTY_STATE);
  const pausedByGate = useRef(false);
  const [entered, setEntered] = useState(false);
  const [entryMessage, setEntryMessage] = useState('Chạm để mở toàn màn hình và yêu cầu khóa xoay ngang.');
  const enterLandscape = async () => {
    await requestLandscapeFullscreen();
    setEntered(true);
    if (!document.fullscreenElement) setEntryMessage('Trình duyệt này không cho khóa toàn màn hình. Hãy xoay máy ngang để tiếp tục.');
  };

  useEffect(() => {
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    let timer: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      const device = readDeviceState();
      setState({
        isBlocked: device.isTouchDevice && Math.min(window.innerWidth, window.innerHeight) < 1024 && (device.isPortrait || (!entered && !document.fullscreenElement)),
        needsFullscreen: !entered && !document.fullscreenElement,
        isTouchDevice: device.isTouchDevice,
        isPortrait: device.isPortrait,
      });
    };
    const scheduleUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 100);
    };

    update();
    orientationQuery.addEventListener('change', scheduleUpdate);
    pointerQuery.addEventListener('change', scheduleUpdate);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);
    const fullscreenChanged = () => { if (!document.fullscreenElement) setEntered(false); scheduleUpdate(); };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);

    return () => {
      clearTimeout(timer);
      orientationQuery.removeEventListener('change', scheduleUpdate);
      pointerQuery.removeEventListener('change', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
    };
  }, [view, entered]);

  useEffect(() => {
    if (state.isBlocked) {
      const runState = useStore.getState().runState;
      if (view === 'game' && runState === 'RUNNING') {
        pausedByGate.current = true;
        setRunState('PAUSED');
        void soundManager.suspend();
        void spatialSound.suspend();
      }
      return;
    }

    if (pausedByGate.current) {
      pausedByGate.current = false;
      if (view === 'game' && useStore.getState().runState === 'PAUSED') {
        setRunState('RUNNING');
        void soundManager.resume();
        void spatialSound.resume();
      }
    }
  }, [setRunState, state.isBlocked, view]);

  return { ...state, enterLandscape, entryMessage };
};
