import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Video, LogIn } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateRoom = () => {
    // Generate a simple random room ID
    const newRoomId = Math.random().toString(36).substring(2, 9);
    // Ideally, we'd also hit an API endpoint to store it in MongoDB here
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <nav className="border-b border-gray-800 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Video className="w-8 h-8 text-primary-500" />
              <span className="text-xl font-bold">MeetSync</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 hidden md:block">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors bg-dark-800 hover:bg-gray-700 px-3 py-2 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Video Meetings & Collaboration
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Connect, share screens, and draw together in real-time.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Create Room Card */}
          <div className="bg-dark-800 p-8 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Start a Meeting</h2>
              <p className="text-gray-400 mb-8">
                Create a new secure room and share the link with others to invite them.
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-4 rounded-xl transition-colors flex justify-center items-center space-x-2 shadow-lg shadow-primary-500/20"
            >
              <Video className="w-5 h-5" />
              <span>New Meeting</span>
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-dark-800 p-8 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-white">Join a Meeting</h2>
              <p className="text-gray-400 mb-8">
                Got a room code or link? Enter it below to join the call instantly.
              </p>
            </div>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                placeholder="Enter Room Code (e.g., abc-123)"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="w-full bg-dark-900 border border-gray-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 rounded-xl transition-colors flex justify-center items-center space-x-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Join</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
