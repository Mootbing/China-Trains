import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';

const TopDock: React.FC = () => {
  const { player, loading, addMoney, addXP } = usePlayer();

  // Calculate XP progress to next level
  const xpForCurrentLevel = (player.level - 1) * 1000;
  const xpForNextLevel = player.level * 1000;
  const xpProgress = ((player.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const handleTestAdd = () => {
    addMoney(1000);
    addXP(100);
  };

  if (loading) {
    return (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg flex items-center px-6 py-3 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-300 uppercase tracking-wider">Money</span>
            <span className="text-white font-mono text-lg font-bold">Loading...</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-300 uppercase tracking-wider">Level</span>
            <span className="text-white font-mono text-lg font-bold">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg flex items-center px-6 py-3 gap-6">
      {/* Money Display */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-yellow-900">¥</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-300 uppercase tracking-wider">Money</span>
          <span className="text-white font-mono text-lg font-bold">
            {player.money.toLocaleString()}
          </span>
        </div>
      </div>

      {/* XP Display */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-blue-900">XP</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-300 uppercase tracking-wider">Level {player.level}</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-lg font-bold">
              {player.xp.toLocaleString()}
            </span>
            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test Button (remove in production) */}
      <button
        onClick={handleTestAdd}
        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
        title="Test: Add 1000 money and 100 XP"
      >
        Test +
      </button>
    </div>
  );
};

export default TopDock; 