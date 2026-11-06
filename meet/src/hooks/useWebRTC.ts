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
    setActiveSpeaker,
    addToast,
  } = useMeetingStore();

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Audio Analyser for Active Speaker Detection & Volume Metering
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();

      // Resume on user interaction if suspended by browser autoplay policy
      if (audioCtx.state === 'suspended') {
        const resumeCtx = () => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          window.removeEventListener('click', resumeCtx);
          window.removeEventListener('keydown', resumeCtx);
        };
        window.addEventListener('click', resumeCtx);
        window.addEventListener('keydown', resumeCtx);
        audioCtx.resume().catch(() => {});
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / dataArray.length;

        const isAudible = average > 14 && useMeetingStore.getState().audioEnabled;

        if (isAudible) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setActiveSpeaker('local_user');
            socketService.emit('speaker:active', { isSpeaking: true });
          }
        } else if (isSpeakingRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            isSpeakingRef.current = false;
            const currentSpeaker = useMeetingStore.getState().activeSpeakerId;
            if (currentSpeaker === 'local_user' || currentSpeaker === socketService.id) {
              setActiveSpeaker(null);
            }
            socketService.emit('speaker:active', { isSpeaking: false });
            silenceTimerRef.current = null;
          }, 600);
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('[WebRTC] Audio analyser setup warning:', e);
    }
  }, [setActiveSpeaker]);

  // Initialize Local Media Stream
  const initLocalStream = useCallback(async () => {
    // Check if we already have an active live stream in store
    const existing = useMeetingStore.getState().localStream;
    if (existing && existing.getTracks().some((t) => t.readyState === 'live')) {
      const hasVideo = existing.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);
      const hasAudio = existing.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled);
      setAudioEnabled(hasAudio);
      setVideoEnabled(hasVideo);
      setupAudioAnalyser(existing);
      webRTCManager.updateLocalStream(existing);
      return existing;
    }

    // Stage 1: Try HD video + audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
      webRTCManager.updateLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('[WebRTC] Stage 1 media access error:', err?.message || err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDismissedError') {
        // User dismissed or denied permission prompt: gracefully switch to View-Only mode
        setLocalStream(null);
        setAudioEnabled(false);
        setVideoEnabled(false);
        addToast('Bạn đang tham gia ở chế độ xem (Chưa cấp quyền Camera / Micro). Bấm icon mic/cam để bật lại.', 'info');
        return null;
      }
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
      webRTCManager.updateLocalStream(stream);
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
      webRTCManager.updateLocalStream(audioOnlyStream);
      addToast('Camera không khả dụng. Phòng học tiếp tục với micro.', 'warning');
      return audioOnlyStream;
    } catch (audioErr: any) {
      console.warn('[WebRTC] Stage 3 audio access error:', audioErr);
      setLocalStream(null);
      setAudioEnabled(false);
      setVideoEnabled(false);
      addToast('Không thể truy cập camera và micro. Bạn đang ở chế độ xem.', 'warning');
      return null;
    }
  }, [setLocalStream, setAudioEnabled, setVideoEnabled, addToast, setupAudioAnalyser]);

  // Toggle Audio Track Mute
  const toggleAudio = useCallback(async () => {
    let stream = useMeetingStore.getState().localStream;
    let audioTrack = stream?.getAudioTracks()[0];

    // Check if we need to obtain a new audio track:
    // Either no stream, no audio track in stream, or the audio track has ended
    const needsNewAudioTrack = !stream || !audioTrack || audioTrack.readyState === 'ended';

    if (needsNewAudioTrack) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const newTrack = audioStream.getAudioTracks()[0];
        if (!newTrack) {
          addToast('Không tìm thấy thiết bị micro trên máy của bạn', 'warning');
          return;
        }

        if (stream) {
          const activeStream = stream;
          // Remove old ended audio tracks if any
          activeStream.getAudioTracks().forEach((oldTrack) => {
            try {
              oldTrack.stop();
              activeStream.removeTrack(oldTrack);
            } catch (e) {}
          });
          activeStream.addTrack(newTrack);
          stream = new MediaStream(activeStream.getTracks());
          setLocalStream(stream);
        } else {
          stream = audioStream;
          setLocalStream(stream);
        }

        setAudioEnabled(true);
        setupAudioAnalyser(stream);
        webRTCManager.replaceTrack('audio', newTrack);
        socketService.emit('media:toggle', { type: 'audio', enabled: true });
        addToast('Đã bật micro thành công', 'success');
        return;
      } catch (err: any) {
        console.warn('[WebRTC] Request mic error:', err);
        if (err.name === 'NotAllowedError') {
          addToast('Vui lòng cho phép quyền Micro trên trình duyệt', 'warning');
        } else {
          addToast('Không thể bật micro: thiết bị đang bận hoặc không hỗ trợ', 'error');
        }
        return;
      }
    }

    // Toggle existing valid audio track
    const newStatus = !audioEnabled;
    audioTrack.enabled = newStatus;
    setAudioEnabled(newStatus);

    if (newStatus) {
      webRTCManager.replaceTrack('audio', audioTrack);
    } else {
      isSpeakingRef.current = false;
      const currentSpeaker = useMeetingStore.getState().activeSpeakerId;
      if (currentSpeaker === 'local_user' || currentSpeaker === socketService.id) {
        setActiveSpeaker(null);
      }
      socketService.emit('speaker:active', { isSpeaking: false });
    }

    socketService.emit('media:toggle', { type: 'audio', enabled: newStatus });
    addToast(newStatus ? 'Đã bật micro' : 'Đã tắt micro', 'info');
  }, [audioEnabled, setAudioEnabled, addToast, setupAudioAnalyser, setLocalStream, setActiveSpeaker]);

  // Toggle Video Track Mute
  const toggleVideo = useCallback(async () => {
    let stream = useMeetingStore.getState().localStream;
    let videoTrack = stream?.getVideoTracks()[0];

    const needsNewVideoTrack = !stream || !videoTrack || videoTrack.readyState === 'ended';

    if (needsNewVideoTrack) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        if (!newTrack) {
          addToast('Không tìm thấy thiết bị camera trên máy của bạn', 'warning');
          return;
        }

        if (stream) {
          const activeStream = stream;
          activeStream.getVideoTracks().forEach((oldTrack) => {
            try {
              oldTrack.stop();
              activeStream.removeTrack(oldTrack);
            } catch (e) {}
          });
          activeStream.addTrack(newTrack);
          stream = new MediaStream(activeStream.getTracks());
          setLocalStream(stream);
        } else {
          stream = videoStream;
          setLocalStream(stream);
        }

        setVideoEnabled(true);
        webRTCManager.replaceTrack('video', newTrack);
        socketService.emit('media:toggle', { type: 'video', enabled: true });
        addToast('Đã bật camera thành công', 'success');
        return;
      } catch (err: any) {
        console.warn('[WebRTC] Request camera error:', err);
        if (err.name === 'NotAllowedError') {
          addToast('Vui lòng cho phép quyền Camera trên trình duyệt', 'warning');
        } else {
          addToast('Không thể bật camera: thiết bị đang bận hoặc không hỗ trợ', 'error');
        }
        return;
      }
    }

    const newStatus = !videoEnabled;
    videoTrack.enabled = newStatus;
    setVideoEnabled(newStatus);

    if (newStatus) {
      webRTCManager.replaceTrack('video', videoTrack);
    }

    socketService.emit('media:toggle', { type: 'video', enabled: newStatus });
    addToast(newStatus ? 'Đã bật camera' : 'Đã tắt camera', 'info');
  }, [videoEnabled, setVideoEnabled, addToast, setLocalStream]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
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

  // Stop all media when permanently leaving meeting
  const stopAllMedia = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    const stream = useMeetingStore.getState().localStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    const screenStream = useMeetingStore.getState().screenStream;
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenSharing(false, null);
    }
    webRTCManager.closeAll();
  }, [setLocalStream, setScreenSharing]);

  // Only clean up the animation frame & audio context node on component unmount;
  // do NOT stop the shared localStream tracks so navigating between JoinPage and MeetingPage works seamlessly!
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    localStream,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopAllMedia,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
  };
}
