import React, { useState, useEffect } from 'react';
import FocusRoom from './components/FocusRoom';
import Login from './components/Login';
import Lobby from './components/Lobby';
import Leaderboard from './components/Leaderboard';

function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // --- CONFIGURATION ---
  // const API_URL = "http://127.0.0.1:8000";             // UNCOMMENT FOR LOCAL
  const API_URL = "https://focus-hub-rrsm.onrender.com";  // UNCOMMENT FOR PRODUCTION

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Updated to use the variable API_URL
      fetch(`${API_URL}/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Token invalid");
      })
      .then(userData => setUser(userData))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      });
    }
  }, []);

  const handleLogin = (loginData) => {
    setUser({ username: loginData.username, id: loginData.user_id });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCurrentRoom(null);
    setShowLeaderboard(false);
  };

  // 1. Not Logged In
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Show Leaderboard (Priority)
  if (showLeaderboard) {
    return <Leaderboard onBack={() => setShowLeaderboard(false)} />;
  }

  // 3. Show Lobby (No Room Selected)
  if (!currentRoom) {
    return (
      <>
        <div className="absolute top-4 right-4 text-white z-10">
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm font-bold">Logout</button>
        </div>
        <Lobby 
            username={user.username} 
            onJoin={(code) => setCurrentRoom(code)} 
            onViewLeaderboard={() => setShowLeaderboard(true)}
        />
      </>
    );
  }

  // 4. Show Room
  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center">
      <div className="w-full p-4 flex justify-between text-white max-w-4xl">
        <span className="font-bold flex items-center gap-2">
            👤 {user.username}
        </span>
        <button 
            onClick={() => setCurrentRoom(null)} 
            className="text-gray-300 hover:text-white transition flex items-center gap-1"
        >
          ← Exit Room
        </button>
      </div>

        <FocusRoom roomId={currentRoom} userId={user.id} username={user.username} />
    </div>
  );
}

export default App;