import React, { useState, useEffect, useRef } from 'react';
import useFocusTimer from '../hooks/useFocusTimer';
import FocusPlant from './FocusPlant';
import SoundPlayer from './SoundPlayer';

const FocusRoom = ({ roomId, userId, username }) => {
  const token = localStorage.getItem("token");

  // CONFIGURATION
  const API_DOMAIN = "focus-hub-rrsm.onrender.com"; // UNCOMMENT FOR PRODUCTION
  // const API_DOMAIN = "127.0.0.1:8000";                  // UNCOMMENT FOR LOCAL TESTING
  const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  const wsUrl = `${protocol}${API_DOMAIN}/ws/${roomId}?token=${token}`;
  const HTTP_URL = `http://${API_DOMAIN}`;     

  const { 
    timeLeft, isRunning, startTimer, sendFail, sendRejoin, sendChat,
    status, activeUsers, chatMessages, totalDuration 
  } = useFocusTimer(wsUrl);
  
  const [totalFlowers, setTotalFlowers] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [strictModeFailed, setStrictModeFailed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Failure State from Backend
  const [failStats, setFailStats] = useState(null); 
  
  const [selectedTime, setSelectedTime] = useState(25);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);
  const [batterySaver, setBatterySaver] = useState(false);

  // 1. Fetch score
  useEffect(() => {
    fetch(`${HTTP_URL}/user/${userId}`)
      .then(res => res.json())
      .then(data => setTotalFlowers(data.flowers))
      .catch(err => console.error("DB Error:", err));
  }, [userId, HTTP_URL]);

  // 2. Strict Mode Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && !strictModeFailed) {
        setStrictModeFailed(true);
        sendFail(); 
        
        // Play fail sound
        const audio = new Audio('/sounds/fail.mp3'); 
        audio.volume = 0.5;
        audio.play().catch(e => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, strictModeFailed, sendFail]);

  // 3. Reset states on new run
  useEffect(() => {
    if (isRunning) {
        setHasStarted(true);
        setFailStats(null); 
        setSessionCompleted(false);
    }
  }, [isRunning]);

  // 4. Chat Auto-Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // 5. Finish Logic
  useEffect(() => {
    if (timeLeft === 0 && !isRunning && status === "Connected" && hasStarted) {
        if (!strictModeFailed) {
            setSessionCompleted(true);
            
            // Play success sound
            const audio = new Audio('/sounds/success.mp3');
            audio.volume = 0.6;
            audio.play().catch(e => {});
        }
        setHasStarted(false);
        setBatterySaver(false);
    } 
  }, [timeLeft, isRunning, status, strictModeFailed, hasStarted]);

  // --- REWARD HANDLER ---
  const handleClaimReward = async () => {
      const token = localStorage.getItem("token");
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};
      try {
        const response = await fetch(`${HTTP_URL}/user/${userId}/claim-reward?room_id=${roomId}`, { 
            method: 'POST', 
            headers 
        });
        
        // Handle 403 Failure (Cheating/Attendance)
        if (response.status === 403) {
            const errData = await response.json();
            try {
                // Parse stats
                const stats = JSON.parse(errData.detail);
                setFailStats(stats);
            } catch (e) {
                setFailStats({
                    message: "Verification Failed",
                    present: 0,
                    required: 0,
                    percentage: 0
                });
            }
            setSessionCompleted(false);
            return;
        }

        if (!response.ok) {
            alert("Verification failed"); 
            return;
        }

        // Success!
        const res = await fetch(`${HTTP_URL}/user/${userId}`, { headers });
        const data = await res.json();
        setTotalFlowers(data.flowers);
        setSessionCompleted(false);
        alert("🌻 Reward Claimed!");
        
      } catch (err) { console.error(err); }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChat(chatInput);
      setChatInput("");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBorder = (status) => {
    if (status === 'focusing') return 'border-green-500 shadow-green-200';
    if (status === 'failed') return 'border-red-500 shadow-red-200';
    return 'border-gray-200'; 
  };

  // Safe duration for Plant
  const safeDuration = totalDuration > 0 ? totalDuration : (selectedTime * 60);

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto pb-8">
    
    {/* Battery Saver */}
    {batterySaver && (
      <div 
        onClick={() => setBatterySaver(false)}
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center cursor-pointer select-none"
      >
        <div className="text-9xl font-mono font-bold text-gray-800 animate-pulse">
           {formatTime(timeLeft)}
        </div>
        <p className="mt-8 text-sm text-gray-600">Tap anywhere to wake up</p>
        <p className="mt-2 text-xs text-gray-900">Saving Battery Mode Active</p>
      </div>
    )}

    {/* Main Card */}
    <div className="p-8 flex flex-col items-center justify-center bg-white rounded-xl shadow-2xl border-2 border-gray-100 w-full relative">
      
      {isRunning && !strictModeFailed && (
          <button 
            onClick={() => setBatterySaver(true)}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-800 transition flex items-center gap-1 text-xs font-bold"
          >
            <span>📱</span> Dark Mode
          </button>
      )}

      <div className="absolute top-4 right-4 bg-yellow-100 px-3 py-1 rounded-full text-yellow-800 text-xs font-bold border border-yellow-200 shadow-sm flex items-center gap-1">
         🌻 {totalFlowers}
      </div>

      <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
        <span>🏠</span> 
        Room: <span className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono">{roomId}</span>
      </h2>
      
      {/* Avatars */}
      <div className="w-full mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider text-center">Focus Mates ({activeUsers.length})</p>
        <div className="flex justify-center flex-wrap gap-3">
          {activeUsers.map((u, index) => (
            <div key={index} className="flex flex-col items-center animate-in zoom-in duration-300 relative">
               <div className={`p-1 rounded-full border-4 shadow-lg transition-all duration-500 ${getStatusBorder(u.status)}`}>
                   <img 
                     src={`https://ui-avatars.com/api/?name=${u.username}&background=random&color=fff&size=40`} 
                     alt={u.username} 
                     className="w-10 h-10 rounded-full"
                   />
               </div>
               <span className="text-[10px] text-gray-500 mt-1 font-bold">{u.username}</span>
               {u.status === 'failed' && <span className="absolute top-0 right-0 text-lg">❌</span>}
            </div>
          ))}
        </div>
      </div>
      
      {/* Timer */}
      <div className={`text-7xl font-mono font-bold mb-4 tracking-wider ${
        strictModeFailed ? 'text-red-500' : (isRunning ? 'text-slate-800' : 'text-gray-300')
      }`}>
        {formatTime(timeLeft)}
      </div>

      {/* Plant / Failure State */}
      {!strictModeFailed && !failStats && (
          isRunning ? <FocusPlant timeLeft={timeLeft} totalDuration={safeDuration} /> 
                    : <div className="text-6xl animate-bounce">🌱</div>
      )}

      {/* Failure Report Card */}
      {failStats && (
         <div className="text-center my-4 p-6 bg-red-50 rounded-xl border border-red-100 w-full max-w-sm animate-in zoom-in">
            <div className="text-5xl mb-2">📉</div>
            <h3 className="text-red-600 font-bold text-xl">Session Failed</h3>
            <p className="text-gray-600 text-sm mb-4">You were offline too long!</p>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
                <div 
                    className="bg-red-500 h-full transition-all duration-1000" 
                    style={{ width: `${Math.min(failStats.percentage, 100)}%` }}
                ></div>
            </div>
            
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                <span>You: {failStats.present}m</span>
                <span>Req: {failStats.required}m</span>
            </div>
         </div>
      )}

      {strictModeFailed && (
        <div className="text-center my-8 animate-pulse">
            <div className="text-6xl">🥀</div>
            <p className="text-red-600 font-bold mt-2">Focus Broken!</p>
            <p className="text-xs text-red-400">You left the tab.</p>
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 h-auto flex flex-col items-center gap-4">
        
        {/* Time Slider */}
        {!isRunning && !sessionCompleted && !strictModeFailed && !failStats && (
            <div className="flex flex-col items-center gap-2 mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Set Duration (Minutes)</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" min="1" max="60" 
                        value={selectedTime} 
                        onChange={(e) => setSelectedTime(parseInt(e.target.value))}
                        className="w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xl font-mono font-bold w-12 text-center text-blue-600">{selectedTime}</span>
                </div>
            </div>
        )}

        {/* Rejoin Button */}
        {strictModeFailed && (
            <button onClick={() => {
                setStrictModeFailed(false); setSessionCompleted(false); setHasStarted(false); sendRejoin(); 
            }} className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition">
             Try Again (Rejoin)
            </button>
        )}

        {/* Start Button */}
        {!isRunning && !strictModeFailed && !sessionCompleted && !failStats && (
             <button 
                onClick={() => startTimer(selectedTime)} 
                disabled={status !== "Connected"} 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-full shadow-lg transform hover:scale-105 transition"
             >
             Start {selectedTime}m Session
             </button>
        )}
        
        {/* Dismiss Failure Button */}
        {failStats && (
             <button onClick={() => setFailStats(null)} className="text-gray-400 underline text-sm hover:text-gray-600">
                Dismiss & Try Again
             </button>
        )}

        {/* Claim Reward Button (Always Active if Done) */}
        {!isRunning && sessionCompleted && !strictModeFailed && !failStats && (
            <button onClick={handleClaimReward} className="bg-green-500 text-white text-lg font-bold px-8 py-4 rounded-full shadow-lg animate-bounce flex items-center gap-2 transform hover:scale-105 transition">
                <span>🎁</span> Claim Reward!
            </button>
        )}
      </div>
    </div>

    <SoundPlayer />

    {/* Chat Section */}
    <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 overflow-hidden flex flex-col h-64">
      <div className="bg-gray-50 p-3 border-b border-gray-200 font-bold text-gray-600 text-sm flex justify-between">
        <span>💬 Room Chat</span>
        <span className="text-xs font-normal text-gray-400">{chatMessages.length} messages</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
        {chatMessages.length === 0 && (
            <p className="text-center text-gray-400 text-xs mt-4">No messages yet. Say hello!</p>
        )}
        {chatMessages.map((msg, i) => {
            const isMe = msg.username === username;
            return (
                <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm shadow-sm ${
                        isMe ? "bg-blue-500 text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-700 rounded-bl-none"
                    }`}>
                        {!isMe && <span className="text-[10px] font-bold block opacity-70 mb-1">{msg.username}</span>}
                        {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp}</span>
                </div>
            )
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendChat} className="p-2 bg-white border-t border-gray-200 flex gap-2">
        <input 
            type="text" 
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
            Send
        </button>
      </form>
    </div>
    </div>
  );
};

export default FocusRoom;