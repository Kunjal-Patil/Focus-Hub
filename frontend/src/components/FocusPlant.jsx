import React from 'react';

const FocusPlant = ({ timeLeft, totalDuration = 1500 }) => {
  // Calculate progress percentage (0 to 100)
  // Default totalDuration is 25 mins (1500 seconds)
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Determine Growth Stage
  let stage = "seed";
  if (progress > 20) stage = "sprout";
  if (progress > 60) stage = "growing";
  if (progress >= 99) stage = "bloom";

  return (
    <div className="flex flex-col items-center mt-8">
      <div className="w-32 h-32 relative flex items-end justify-center">
        
        {/* STAGE 1: SEED */}
        {stage === "seed" && (
          <div className="animate-bounce">
            🌱 <span className="text-sm text-gray-500 block text-center">Planted</span>
          </div>
        )}

        {/* STAGE 2: SPROUT */}
        {stage === "sprout" && (
          <svg viewBox="0 0 100 100" className="w-20 h-20 text-green-500 animate-pulse">
            <path fill="currentColor" d="M50 100 Q50 50 20 30 Q50 50 50 100" />
            <path fill="currentColor" d="M50 100 Q50 50 80 30 Q50 50 50 100" />
          </svg>
        )}

        {/* STAGE 3: GROWING */}
        {stage === "growing" && (
          <svg viewBox="0 0 100 100" className="w-24 h-24 text-green-600 transition-all duration-1000">
            <rect x="48" y="40" width="4" height="60" fill="currentColor" />
            <circle cx="50" cy="40" r="15" fill="#22c55e" />
            <circle cx="35" cy="50" r="10" fill="#22c55e" />
            <circle cx="65" cy="50" r="10" fill="#22c55e" />
          </svg>
        )}

        {/* STAGE 4: BLOOM */}
        {stage === "bloom" && (
          <div className="text-6xl animate-ping">
            🌻
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="w-64 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-gray-400 text-xs mt-2">{Math.round(progress)}% Grown</p>
    </div>
  );
};

export default FocusPlant;