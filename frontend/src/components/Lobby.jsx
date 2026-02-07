import React, { useState } from 'react';

const Lobby = ({ username, onJoin, onViewLeaderboard }) => {
  const [roomInput, setRoomInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onJoin(roomInput.trim().toUpperCase());
    }
  };

  const createRandomRoom = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoin(randomCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800 text-white">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-96 border border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-center">🚀 Focus Hub</h1>
        <p className="text-gray-400 text-center mb-8">Hello, <span className="text-blue-400">{username}</span>!</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">Join a Room</label>
            <input
              type="text"
              placeholder="Enter Room Code (e.g. STUDY)"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-600 focus:border-blue-500 outline-none transition text-white placeholder-gray-500 uppercase"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            disabled={!roomInput}
            className={`py-3 rounded-lg font-bold transition ${
              roomInput 
                ? "bg-blue-600 hover:bg-blue-500 text-white" 
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Join Room
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="px-3 text-slate-500 text-sm">OR</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Leaderboard Button */}
        <button 
          onClick={onViewLeaderboard}
          className="w-full py-3 mb-4 rounded-lg font-bold bg-yellow-500 hover:bg-yellow-400 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
        >
          <span>🏆</span> View Leaderboard
        </button>

        <button 
          onClick={createRandomRoom}
          className="w-full py-3 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <span>✨</span> Create New Room
        </button>
      </div>
    </div>
  );
};

export default Lobby;