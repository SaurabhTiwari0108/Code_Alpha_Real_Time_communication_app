import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

interface PeerStreamMap {
  [socketId: string]: MediaStream;
}

export const useWebRTC = (socket: Socket | null, roomId: string | undefined) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<PeerStreamMap>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const peerConnections = useRef<PeerConnectionMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const createPeerConnection = useCallback((socketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          to: socketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming streams
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [socketId]: event.streams[0],
      }));
    };

    peerConnections.current[socketId] = pc;
    return pc;
  }, [socket]);

  // Initialize media
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        setMediaStatus('success');
      } catch (err) {
        console.error('Error accessing media devices.', err);
        setMediaStatus('error');
      }
    };

    startMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Only run once on mount

  // WebRTC Signaling Events
  useEffect(() => {
    if (!socket || mediaStatus === 'loading') return;

    const handleUserConnected = async ({ socketId }: { socketId: string }) => {
      console.log('New user connected, creating offer for:', socketId);
      const pc = createPeerConnection(socketId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      
      socket.emit('offer', {
        to: socketId,
        offer,
      });
    };

    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', from);
      const pc = createPeerConnection(from);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('answer', {
        to: from,
        answer,
      });
    };

    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Received answer from:', from);
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    };

    const handleUserDisconnected = ({ socketId }: { socketId: string }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    };

    // Attach listeners
    socket.on('user-connected', handleUserConnected);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-disconnected', handleUserDisconnected);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-disconnected', handleUserDisconnected);
    };
  }, [socket, mediaStatus, createPeerConnection]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace track for all peers
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Replace local video preview
        setLocalStream(new MediaStream([screenTrack, localStreamRef.current!.getAudioTracks()[0]]));
        setIsScreenSharing(true);

        // Handle native "Stop Sharing" button
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Error sharing screen', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      // Revert track for all peers
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Revert local video preview
      setLocalStream(new MediaStream([videoTrack, localStreamRef.current!.getAudioTracks()[0]]));
    }
    setIsScreenSharing(false);
  };

  return {
    localStream,
    remoteStreams,
    isScreenSharing,
    mediaStatus,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
};
