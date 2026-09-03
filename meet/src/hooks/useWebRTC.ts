import { useEffect, useRef, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { webRTCManager } from '../services/webrtc';
import { socketService } from '../services/socket';

export function useWebRTC() {
  const {
    localStream,
    setLocalStream,
    audioEnabled,
    setAudioEnabled,
    videoEnabled,
    setVideoEnabled,
    isScreenSharing,
    setScreenSharing,
    updateParticipant,
    setActiveSpeaker,
    addToast,
  } = useMeetingStore();

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    // Stage 1: Try HD video + audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      setupAudioAnalyser(stream);
      return stream;
    } catch (err: any) {
      console.warn('[WebRTC] Stage 1 media access error:', err);
    }

    // Stage 2: Try basic video + audio without resolution constraints
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      setupAudioAnalyser(stream);
      return stream;
    } catch (err: any) {
      console.warn('[WebRTC] Stage 2 basic video access error:', err);
    }

    // Stage 3: Try audio only
    try {
      const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalStream(audioOnlyStream);
      setAudioEnabled(true);
      setVideoEnabled(false);
      setupAudioAnalyser(audioOnlyStream);
      addToast('Camera đang bận hoặc bị khóa bởi ứng dụng khác. Phòng học tiếp tục với micro.', 'warning');
      return audioOnlyStream;
    } catch (audioErr: any) {
      console.warn('[WebRTC] Stage 3 audio access error:', audioErr);
      setLocalStream(null);
      setAudioEnabled(false);
      setVideoEnabled(false);
      addToast('Không thể truy cập camera và micro. Bạn đang tham gia ở chế độ xem.', 'warning');
      return null;
    }
  }, [setLocalStream, setAudioEnabled, setVideoEnabled, addToast]);

  // Audio Analyser for Active Speaker Detection
  const setupAudioAnalyser = (stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / dataArray.length;

        // If audio volume > threshold
        if (average > 25 && useMeetingStore.getState().audioEnabled) {
          const socket = socketService.getSocket();
          const socketId = socket?.id;
          if (socketId) {
            setActiveSpeaker(socketId);
          }
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error('[WebRTC] Audio analyser setup error:', e);
    }
  };

  // Toggle Audio Track Mute
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newStatus = !audioEnabled;
      audioTrack.enabled = newStatus;
      setAudioEnabled(newStatus);

      // Emit to server
      const socket = socketService.getSocket();
      socket?.emit('media:toggle', { type: 'audio', enabled: newStatus });
      addToast(newStatus ? 'Đã bật micro' : 'Đã tắt micro', 'info');
    }
  }, [localStream, audioEnabled, setAudioEnabled, addToast]);

  // Toggle Video Track Mute
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      const newStatus = !videoEnabled;
      videoTrack.enabled = newStatus;
      setVideoEnabled(newStatus);

      // Emit to server
      const socket = socketService.getSocket();
      socket?.emit('media:toggle', { type: 'video', enabled: newStatus });
      addToast(newStatus ? 'Đã bật camera' : 'Đã tắt camera', 'info');
    }
  }, [localStream, videoEnabled, setVideoEnabled, addToast]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      const currentScreenStream = useMeetingStore.getState().screenStream;
      if (currentScreenStream) {
        currentScreenStream.getTracks().forEach((track) => track.stop());
      }
      setScreenSharing(false, null);
      addToast('Đã dừng chia sẻ màn hình', 'info');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = () => {
          setScreenSharing(false, null);
          addToast('Đã dừng chia sẻ màn hình', 'info');
        };

        setScreenSharing(true, screenStream);
        addToast('Bắt đầu chia sẻ màn hình', 'success');
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error('[WebRTC] Screen share failed:', err);
          addToast('Không thể chia sẻ màn hình', 'error');
        }
      }
    }
  }, [isScreenSharing, setScreenSharing, addToast]);

  // Cleanup Media Streams on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      webRTCManager.closeAll();
    };
  }, []);

  return {
    localStream,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
  };
}
