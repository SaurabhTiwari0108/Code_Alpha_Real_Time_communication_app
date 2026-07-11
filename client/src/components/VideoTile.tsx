import React, { useEffect, useRef } from 'react';
import { MicOff } from 'lucide-react';

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  name?: string;
  isMuted?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ stream, isLocal = false, name, isMuted = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-dark-900 rounded-2xl overflow-hidden shadow-lg border border-gray-700 aspect-video group">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video so you don't hear yourself
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Mirror local video
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white">
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
      )}

      {/* Name tag overlay */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center space-x-2">
        <span>{name || (isLocal ? 'You' : 'Participant')}</span>
        {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  );
};

export default VideoTile;
