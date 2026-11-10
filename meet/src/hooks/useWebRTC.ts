import { useEffect, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { webRTCManager } from '../services/webrtc';
import { socketService } from '../services/socket';
import { useAudioLevelStore } from '../store/audioLevelStore';

let initialRequest: Promise<MediaStream | null> | null = null;
let mediaGeneration = 0;
let sharingPending = false;
let mediaInitialized = false;
const busy = new Set<string>();
const state = () => useMeetingStore.getState();

function constraints(kind: 'audio' | 'video', deviceId?: string): MediaStreamConstraints {
  const s = state();
  return kind === 'audio'
    ? {
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: s.noiseSuppression,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      }
    : {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: s.cameraFacingMode || 'user' } }),
        },
      };
}

function reportError(error: unknown, label: string) {
  const name = error instanceof DOMException ? error.name : '';
  state().addToast(
    name === 'NotAllowedError'
      ? `Hãy cấp quyền ${label} trong cài đặt trình duyệt.`
      : `Không thể sử dụng ${label}. Kiểm tra kết nối thiết bị hoặc chọn thiết bị khác.`,
    'warning'
  );
}

async function acquire(kind: 'audio' | 'video', deviceId?: string, enabled = true) {
  const generation = mediaGeneration;
  const fresh = await navigator.mediaDevices.getUserMedia(constraints(kind, deviceId));
  const track = fresh.getTracks()[0];
  if (generation !== mediaGeneration) {
    fresh.getTracks().forEach((t) => t.stop());
    return;
  }
  const permission = kind === 'audio' ? state().hostSettings.allowMic : state().hostSettings.allowVideo;
  track.enabled = enabled && (!state().joined || state().isHost || permission);
  enabled = track.enabled;
  try {
    await webRTCManager.replaceTrack(kind, track);
  } catch (error) {
    fresh.getTracks().forEach((t) => t.stop());
    throw error;
  }
  const old = state().localStream;
  const next = new MediaStream([
    ...(old?.getTracks().filter((t) => t.kind !== kind && t.readyState === 'live') || []),
    track,
  ]);
  old?.getTracks().filter((t) => t.kind === kind).forEach((t) => t.stop());
  state().setLocalStream(next);
  if (kind === 'audio') state().setAudioEnabled(enabled);
  else state().setVideoEnabled(enabled);

  track.onended = () => {
    if (!state().localStream?.getTracks().includes(track)) return;
    if (kind === 'audio') state().setAudioEnabled(false);
    else state().setVideoEnabled(false);
    socketService.getSocket()?.emit('media:toggle', { type: kind, enabled: false });
    state().addToast(
      `${kind === 'audio' ? 'Micro' : 'Camera'} đã ngắt kết nối. Bấm để kết nối lại.`,
      'warning'
    );
  };
  socketService.getSocket()?.emit('media:toggle', { type: kind, enabled });
}

export function stopAllMedia() {
  mediaGeneration++;
  mediaInitialized = false;
  state().localStream?.getTracks().forEach((t) => t.stop());
  state().screenStream?.getTracks().forEach((t) => {
    t.onended = null;
    t.stop();
  });
  state().setLocalStream(null);
  state().setScreenSharing(false, null);
  useAudioLevelStore.setState({ level: 0 });
  webRTCManager.closeAll();
}

export function useWebRTC() {
  const localStream = useMeetingStore((s) => s.localStream);
  const audioEnabled = useMeetingStore((s) => s.audioEnabled);
  const videoEnabled = useMeetingStore((s) => s.videoEnabled);
  const isScreenSharing = useMeetingStore((s) => s.isScreenSharing);
  const cameraFacingMode = useMeetingStore((s) => s.cameraFacingMode);

  // Audio level analyser follows the shared stream across preview -> meeting navigation.
  useEffect(() => {
    if (!localStream?.getAudioTracks().some((t) => t.readyState === 'live')) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(localStream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let speaking = false;
    let lastLoud = 0;
    const resume = () => {
      void context.resume().catch(() => {});
    };
    document.addEventListener('pointerdown', resume);
    document.addEventListener('keydown', resume);
    resume();
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / samples.length
      );
      const level = state().audioEnabled ? Math.min(1, rms * 5) : 0;
      useAudioLevelStore.setState({ level });
      if (level > 0.06) lastLoud = Date.now();
      const next = state().audioEnabled && Date.now() - lastLoud < 500;
      if (next !== speaking) {
        speaking = next;
        if (next) state().setActiveSpeaker('local_user');
        else if (state().activeSpeakerId === 'local_user') state().setActiveSpeaker(null);
        if (state().joined) socketService.emit('speaker:active', { isSpeaking: next });
      }
    }, 100);
    return () => {
      clearInterval(timer);
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
      void context.close().catch(() => {});
      useAudioLevelStore.setState({ level: 0 });
    };
  }, [localStream]);

  // Periodic network quality & latency measurement
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!state().joined) return;
      const stats = await webRTCManager.getAllPeerStats();
      state().setNetworkStats(stats.overallQuality, stats.averageRtt);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const initLocalStream = useCallback(async () => {
    if (state().localStream || mediaInitialized) return state().localStream;
    if (initialRequest) return initialRequest;
    if (!navigator.mediaDevices?.getUserMedia) {
      state().setAudioEnabled(false);
      state().setVideoEnabled(false);
      state().addToast('Để dùng mic và camera, hãy mở ứng dụng qua HTTPS hoặc localhost.', 'warning');
      return null;
    }
    // Request separately: a denied or missing camera must never prevent microphone access.
    initialRequest = (async () => {
      const generation = mediaGeneration;
      try {
        await acquire('audio', state().inputDeviceId);
      } catch (error) {
        state().setAudioEnabled(false);
        reportError(error, 'micro');
      }
      if (generation !== mediaGeneration) return null;
      try {
        await acquire('video', state().cameraDeviceId);
      } catch (error) {
        state().setVideoEnabled(false);
        reportError(error, 'camera');
      }
      if (generation === mediaGeneration) mediaInitialized = true;
      return state().localStream;
    })();
    try {
      return await initialRequest;
    } finally {
      initialRequest = null;
    }
  }, []);

  const toggle = useCallback(async (kind: 'audio' | 'video') => {
    if (busy.has(kind)) return;
    const permission = kind === 'audio' ? state().hostSettings.allowMic : state().hostSettings.allowVideo;
    if (state().joined && !state().isHost && !permission) {
      state().addToast('Chủ phòng đã khóa quyền sử dụng thiết bị này.', 'warning'); return;
    }
    busy.add(kind);
    try {
      const track = state()
        .localStream?.getTracks()
        .find((t) => t.kind === kind && t.readyState === 'live');
      if (!track) {
        await acquire(kind, kind === 'audio' ? state().inputDeviceId : state().cameraDeviceId);
      } else {
        track.enabled = !track.enabled;
        if (kind === 'audio') state().setAudioEnabled(track.enabled);
        else state().setVideoEnabled(track.enabled);
        socketService.getSocket()?.emit('media:toggle', { type: kind, enabled: track.enabled });
      }
    } catch (error) {
      reportError(error, kind === 'audio' ? 'micro' : 'camera');
    } finally {
      busy.delete(kind);
    }
  }, []);

  const toggleAudio = useCallback(() => toggle('audio'), [toggle]);
  const toggleVideo = useCallback(() => toggle('video'), [toggle]);

  const toggleCameraFacingMode = useCallback(async () => {
    if (busy.has('video')) return;
    busy.add('video');
    try {
      const currentMode = state().cameraFacingMode;
      const nextMode = currentMode === 'user' ? 'environment' : 'user';
      state().setCameraFacingMode(nextMode);
      await acquire('video', undefined, state().videoEnabled);
      state().addToast(
        `Đã chuyển sang camera ${nextMode === 'user' ? 'trước' : 'sau'}`,
        'info'
      );
    } catch (error) {
      reportError(error, 'camera');
    } finally {
      busy.delete('video');
    }
  }, []);

  const togglePictureInPicture = useCallback(async (videoEl: HTMLVideoElement | null) => {
    if (!videoEl || !document.pictureInPictureEnabled) {
      state().addToast('Trình duyệt chưa hỗ trợ Picture-in-Picture cho video này.', 'warning');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoEl.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  }, []);

  const changeDevice = useCallback(async (kind: 'audio' | 'video', deviceId: string) => {
    if (busy.has(kind)) return;
    busy.add(kind);
    try {
      await acquire(kind, deviceId, kind === 'audio' ? state().audioEnabled : state().videoEnabled);
      state().setPreferences(
        kind === 'audio' ? { inputDeviceId: deviceId } : { cameraDeviceId: deviceId }
      );
    } catch (error) {
      reportError(error, kind === 'audio' ? 'micro' : 'camera');
    } finally {
      busy.delete(kind);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (sharingPending) return;
    const stop = async () => {
      const stream = state().screenStream;
      state().setScreenSharing(false, null);
      stream?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      await webRTCManager.updateScreenStream(null).catch(() => {});
      socketService.getSocket()?.emit('media:toggle', { type: 'screen', enabled: false });
    };
    if (state().isScreenSharing) {
      await stop();
      return;
    }
    if (state().joined && !state().isHost && !state().hostSettings.allowScreenShare) {
      state().addToast('Chủ phòng đã tắt quyền chia sẻ màn hình.', 'warning'); return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      state().addToast(
        'Trình duyệt này chưa hỗ trợ chia sẻ màn hình. Hãy dùng Chrome hoặc Edge trên máy tính.',
        'warning'
      );
      return;
    }
    sharingPending = true;
    const generation = mediaGeneration;
    let screen: MediaStream | null = null;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      if (generation !== mediaGeneration) {
        screen.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = screen.getVideoTracks()[0];
      video.contentHint = state().shareQuality;
      await webRTCManager.updateScreenStream(screen);
      state().setScreenSharing(true, screen);
      video.onended = () => {
        void stop();
      };
      socketService.emit('media:toggle', { type: 'screen', enabled: true });
      state().addToast(
        screen.getAudioTracks().length
          ? 'Đang chia sẻ màn hình và âm thanh.'
          : 'Đang chia sẻ màn hình. Để gửi tiếng của tab, chọn “Chia sẻ âm thanh” trong hộp chọn.',
        'success'
      );
    } catch (error) {
      screen?.getTracks().forEach((t) => t.stop());
      await webRTCManager.updateScreenStream(null).catch(() => {});
      if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
        reportError(error, 'chia sẻ màn hình');
      }
    } finally {
      sharingPending = false;
    }
  }, []);

  return {
    localStream,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    cameraFacingMode,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    toggleCameraFacingMode,
    togglePictureInPicture,
    toggleScreenShare,
    changeDevice,
    stopAllMedia,
  };
}
