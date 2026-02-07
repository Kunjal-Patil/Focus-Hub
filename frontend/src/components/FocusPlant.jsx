import React from 'react';

const FocusPlant = ({ timeLeft, totalDuration = 1500 }) => {
  // Calculate progress percentage (0 to 100)
  const progress = Math.min(100, Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100));

  // Determine Growth Stage (5 Stages: Seed, Sprout, Sapling, Bud, Bloom)
  let stage = "seed";
  if (progress > 15) stage = "sprout";
  if (progress > 40) stage = "sapling";
  if (progress > 75) stage = "bud";
  if (progress >= 99) stage = "bloom";

  return (
    <div className="flex flex-col items-center mt-8 relative">
      <div className="w-40 h-40 relative flex items-end justify-center transition-all duration-500">
        
        {/* STAGE 1: SEED (0-15%) */}
        {stage === "seed" && (
          <div className="animate-bounce flex flex-col items-center">
            <span className="text-4xl">🌱</span> 
            <span className="text-xs text-gray-400 mt-1">Planted</span>
          </div>
        )}

        {/* STAGE 2: SPROUT (15-40%) */}
        {stage === "sprout" && (
          <svg viewBox="0 0 100 100" className="w-20 h-20 text-green-400 animate-in zoom-in duration-500">
             {/* Left Leaf - Fixed paths to create volume so fill works */}
             <path fill="currentColor" d="M50 100 Q20 60 25 40 Q50 60 50 100" /> 
             {/* Right Leaf - Fixed paths to create volume so fill works */}
             <path fill="currentColor" d="M50 100 Q80 60 75 40 Q50 60 50 100" /> 
          </svg>
        )}

        {/* STAGE 3: SAPLING (40-75%) */}
        {stage === "sapling" && (
          <svg viewBox="0 0 100 100" className="w-24 h-24 text-green-500 animate-in slide-in-from-bottom-2 duration-700">
             <rect x="48" y="50" width="4" height="50" fill="currentColor" />
             <ellipse cx="30" cy="50" rx="15" ry="8" fill="currentColor" transform="rotate(-30 30 50)" />
             <ellipse cx="70" cy="40" rx="15" ry="8" fill="currentColor" transform="rotate(30 70 40)" />
             <ellipse cx="30" cy="30" rx="12" ry="6" fill="currentColor" transform="rotate(-20 30 30)" />
          </svg>
        )}

        {/* STAGE 4: BUD (75-99%) */}
        {stage === "bud" && (
          <svg viewBox="0 0 100 100" className="w-28 h-28 text-green-600 animate-pulse">
             <rect x="47" y="40" width="6" height="60" fill="currentColor" />
             <path d="M50 40 Q30 10 50 5 Q70 10 50 40" fill="#FCD34D" /> {/* Yellow Bud */}
             <ellipse cx="25" cy="55" rx="20" ry="10" fill="currentColor" transform="rotate(-20 25 55)" />
             <ellipse cx="75" cy="45" rx="20" ry="10" fill="currentColor" transform="rotate(20 75 45)" />
          </svg>
        )}

        {/* STAGE 5: BLOOM (100%) */}
        {stage === "bloom" && (
          <div className="relative animate-in zoom-in spin-in-3 duration-700">
            <div className="absolute -top-16 -left-8 text-6xl animate-bounce delay-100">✨</div>
            <svg viewBox="0 0 100 100" className="w-32 h-32">
               {/* Stem */}
               <rect x="46" y="50" width="8" height="50" fill="#166534" />
               {/* Leaves */}
               <ellipse cx="20" cy="70" rx="20" ry="10" fill="#22c55e" transform="rotate(-15 20 70)" />
               <ellipse cx="80" cy="60" rx="20" ry="10" fill="#22c55e" transform="rotate(15 80 60)" />
               {/* Petals */}
               <circle cx="50" cy="35" r="25" fill="#FBBF24" className="animate-pulse" />
               <circle cx="50" cy="35" r="15" fill="#78350F" />
            </svg>
            <div className="absolute -top-10 -right-8 text-6xl animate-bounce">✨</div>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="w-64 h-3 bg-gray-100 rounded-full mt-6 overflow-hidden border border-gray-200 shadow-inner">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${
             stage === 'bloom' ? 'bg-yellow-400' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-gray-400 text-xs mt-2 font-mono uppercase tracking-widest">
        Stage: <span className="text-blue-500 font-bold">{stage}</span> ({Math.round(progress)}%)
      </p>
    </div>
  );
};

export default FocusPlant;