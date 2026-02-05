import React, { useEffect, useState } from 'react';

const Leaderboard = ({ onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/leaderboard")
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch leaderboard", err);
        setLoading(false);
      });
  }, []);

  const getRankEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-center relative">
          <button 
            onClick={onBack}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white font-bold transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white flex justify-center items-center gap-2">
            🏆 Top Focusers
          </h1>
        </div>

        {/* List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading stats...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b">
                  <th className="pb-2 pl-2">Rank</th>
                  <th className="pb-2">User</th>
                  <th className="pb-2 text-right pr-2">Flowers</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {users.map((user, index) => (
                  <tr key={index} className={`border-b last:border-0 hover:bg-slate-50 transition ${index < 3 ? "font-bold bg-yellow-50/50" : ""}`}>
                    <td className="py-3 pl-2 w-16 text-lg">{getRankEmoji(index)}</td>
                    <td className="py-3">{user.username}</td>
                    <td className="py-3 pr-2 text-right">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        🌻 {user.flowers}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {!loading && users.length === 0 && (
             <p className="text-center text-gray-400 py-8">No records yet. Start focusing!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;