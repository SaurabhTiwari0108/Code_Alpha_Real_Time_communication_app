import React, { useEffect, useContext, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { Users, Copy, Check, Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff, Paperclip, Download, PenTool, LayoutGrid } from 'lucide-react';
import api from '../services/api';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoTile from '../components/VideoTile';
import Whiteboard from '../components/Whiteboard';

type ViewMode = 'video' | 'whiteboard';

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, isConnected } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [participants, setParticipants] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<{ from: string; file: any }[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('video');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { localStream, remoteStreams, isScreenSharing, mediaStatus, toggleAudio, toggleVideo, toggleScreenShare } = useWebRTC(socket, roomId);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Only join the room once we know the media state (success or error)
    if (socket && isConnected && user && mediaStatus !== 'loading') {
      // Join the room
      socket.emit('join-room', roomId, user.id, user.name);
      setParticipants([{ userId: user.id, userName: `${user.name} (You)`, socketId: 'local' }]);

      // Listen for existing users when joining
      const handleRoomUsers = (existingUsers: any[]) => {
        setParticipants((prev) => {
          const newParticipants = [...prev];
          existingUsers.forEach((eu) => {
            if (!newParticipants.find(p => p.socketId === eu.socketId)) {
              newParticipants.push(eu);
            }
          });
          return newParticipants;
        });
      };

      // Listen for others joining
      const handleUserConnected = (newUser: any) => {
        setParticipants((prev) => {
          if (prev.find(p => p.socketId === newUser.socketId)) return prev;
          return [...prev, newUser];
        });
      };

      // Listen for others leaving
      const handleUserDisconnected = ({ socketId }: { socketId: string }) => {
        setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      };

      // Listen for file shares
      const handleFileShared = (data: { from: string; file: any }) => {
        setSharedFiles((prev) => [...prev, data]);
      };

      socket.on('room-users', handleRoomUsers);
      socket.on('user-connected', handleUserConnected);
      socket.on('user-disconnected', handleUserDisconnected);
      socket.on('file-shared', handleFileShared);

      return () => {
        socket.off('room-users', handleRoomUsers);
        socket.off('user-connected', handleUserConnected);
        socket.off('user-disconnected', handleUserDisconnected);
        socket.off('file-shared', handleFileShared);
      };
    }
  }, [socket, isConnected, roomId, user, navigate, mediaStatus]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAudio = () => {
    const isEnabled = toggleAudio();
    setIsAudioMuted(!isEnabled);
  };

  const handleToggleVideo = () => {
    const isEnabled = toggleVideo();
    setIsVideoOff(!isEnabled);
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !user) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const fileData = res.data.file;
      setSharedFiles((prev) => [...prev, { from: 'You', file: fileData }]);
      socket.emit('file-shared', fileData);
    } catch (err) {
      console.error('File upload failed', err);
    }
  };

  return (
    <div className="h-screen bg-dark-900 text-white flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-dark-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Room:</h1>
          <div className="flex items-center space-x-2 bg-dark-900 px-3 py-1 rounded-lg border border-gray-700">
            <span className="font-mono text-primary-400">{roomId}</span>
            <button
              onClick={copyRoomId}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy Room ID"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300">{participants.length}</span>
        </div>
      </header>

      {/* Main Content Area (Video Grid / Whiteboard + Files Sidebar) */}
      <main className="flex-1 p-6 overflow-hidden flex gap-6">
        
        {/* Primary View */}
        <div className="flex-1 h-full max-h-[80vh]">
          {viewMode === 'video' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr h-full">
              <VideoTile stream={localStream} isLocal={true} name={user?.name} isMuted={isAudioMuted} />
              {participants.filter(p => p.socketId !== 'local').map((participant) => {
                const stream = remoteStreams[participant.socketId] || null;
                return (
                  <VideoTile key={participant.socketId} stream={stream} name={participant.userName} />
                );
              })}
            </div>
          ) : (
            <Whiteboard />
          )}
        </div>

        {/* Shared Files Sidebar */}
        {sharedFiles.length > 0 && (
          <div className="w-80 bg-dark-800 rounded-2xl border border-gray-700 p-4 flex flex-col h-full max-h-[80vh] shrink-0">
            <h3 className="font-semibold text-lg mb-4 text-gray-200">Shared Files</h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              {sharedFiles.map((item, index) => (
                <div key={index} className="bg-dark-900 p-3 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">From: {item.from}</span>
                    <span className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate pr-2" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <a
                      href={item.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-primary-600/20 text-primary-400 hover:bg-primary-600 hover:text-white rounded-lg transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="h-24 bg-dark-800 border-t border-gray-700 flex items-center justify-center space-x-6 shrink-0 pb-safe relative">
        
        {/* View Toggle */}
        <div className="absolute left-6 flex bg-dark-900 rounded-xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => setViewMode('video')}
            className={`px-4 py-3 flex items-center space-x-2 transition-colors ${viewMode === 'video' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:block">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('whiteboard')}
            className={`px-4 py-3 flex items-center space-x-2 transition-colors ${viewMode === 'whiteboard' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <PenTool className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:block">Board</span>
          </button>
        </div>

        {/* Action Buttons */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
          title="Share File"
        >
          <Paperclip className="w-6 h-6 text-white" />
        </button>
        
        <button
          onClick={handleToggleAudio}
          className={`p-4 rounded-full transition-colors ${
            isAudioMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isAudioMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={handleToggleVideo}
          className={`p-4 rounded-full transition-colors ${
            isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-4 rounded-full transition-colors ${
            isScreenSharing ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Share Screen"
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6 text-white" /> : <MonitorUp className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={handleLeaveRoom}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
          title="Leave Room"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </footer>
    </div>
  );
};

export default Room;
