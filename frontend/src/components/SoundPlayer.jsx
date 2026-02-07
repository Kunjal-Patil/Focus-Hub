import React, { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { 
    name: "Rain", 
    icon: "🌧️", 
    url: "/sounds/rain.mp3" 
  },
  { 
    name: "Lofi", 
    icon: "☕", 
    url: "/sounds/lofi.mp3" 
  },
  { 
    name: "Ocean", 
    icon: "🌊", 
    url: "/sounds/ocean.mp3" 
  }
];

const SoundPlayer = () => {
  const [activeTrack, setActiveTrack] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(new Audio());

  // Handle Track Switching
  useEffect(() => {
    const audio = audioRef.current;
    audio.loop = true; 

    if (activeTrack) {
      audio.src = activeTrack.url;
      audio.volume = volume;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio play failed:", error);
          // Alert user if file is missing
          console.log(`Make sure ${activeTrack.url} is in your public/sounds folder!`);
          setActiveTrack(null); 
        });
      }
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [activeTrack]);

  // Handle Volume
  useEffect(() => {
    if(audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-gray-100 p-4 w-full transition-all hover:shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">🎧 Soundscapes</h3>
        {activeTrack && (
             <div className="flex items-center gap-2">
                <span className="text-[10px] animate-pulse text-blue-500 font-bold">Now Playing: {activeTrack.name}</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
             </div>
        )}
      </div>
      
      {/* grid-cols-3*/}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TRACKS.map((track) => (
          <button
            key={track.name}
            onClick={() => setActiveTrack(activeTrack?.name === track.name ? null : track)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
              activeTrack?.name === track.name 
                ? "bg-blue-100 text-blue-600 border-2 border-blue-200 shadow-sm transform scale-105" 
                : "bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100 hover:scale-105"
            }`}
          >
            <span className="text-2xl mb-1 filter drop-shadow-sm">{track.icon}</span>
            <span className="text-[10px] font-bold">{track.name}</span>
          </button>
        ))}
      </div>

      <div className={`transition-all duration-500 overflow-hidden ${activeTrack ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
          <span className="text-xs text-gray-400">🔈</span>
          <input 
            type="range" 
            min="0" max="1" step="0.05" 
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default SoundPlayer;