import React from 'react';
import { usePlayer } from '../contexts/PlayerContext';

interface DockProps {
  children: React.ReactNode;
}

const Dock: React.FC<DockProps> = ({ children }) => {
  const { player, loading, addMoney, addXP } = usePlayer();

  // Calculate XP progress to next level
  const xpForCurrentLevel = (player.level - 1) * 1000;
  const xpForNextLevel = player.level * 1000;
  const xpProgress = ((player.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const handleTestAdd = () => {
    addMoney(1000);
    addXP(100);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg flex items-center justify-between px-6 py-3 gap-6"
      style={{ minHeight: 64, minWidth: 600, maxWidth: '90vw' }}
    >
      {/* Left side - Player Stats */}
      <div className="flex items-center gap-4">
        {loading ? (
          <span className="text-white font-mono text-sm font-bold">加载中...</span>
        ) : (
          <>
            {/* Money Display */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-1 border-white rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">¥</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-white uppercase tracking-wider leading-none mb-1">钱</span>
                <span className="text-white font-mono text-sm font-bold leading-none">
                  {player.money.toLocaleString()}
                </span>
              </div>
            </div>

            {/* XP Display */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">XP</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-300 uppercase tracking-wider leading-none mb-1">等级 {player.level}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm font-bold leading-none">
                    {player.xp.toLocaleString()}
                  </span>
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
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
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              title="Test: Add 1000 money and 100 XP"
            >
              +
            </button>
          </>
        )}
      </div>

      {/* Right side - Action Buttons */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
};

export default Dock;