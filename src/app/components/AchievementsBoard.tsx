'use client';

import { useEffect, useState } from 'react';
import { useBoardAnimation } from '../hooks/useBoardAnimation';

interface Achievement {
  key: string;
  name: string;
  description: string;
  reward_money: number;
  reward_xp: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementsBoardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AchievementsBoard({ isOpen, onClose }: AchievementsBoardProps) {
  const { mounted, phase } = useBoardAnimation(isOpen);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadAchievements();
    }
  }, [isOpen]);

  if (!mounted) return null;

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${phase === 'enter' ? 'board-backdrop-enter' : 'board-backdrop-exit'}`}>
      <div className={`bg-black border border-white/30 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden ${phase === 'enter' ? 'board-panel-enter' : 'board-panel-exit'}`}>
        {/* Header */}
        <div className="border-b border-white/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">成就</h2>
              <p className="text-sm text-white/60 mt-1">
                已解锁 {unlockedCount} / {achievements.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">加载中...</span>
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <p className="text-lg">暂无成就数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.map((achievement, i) => (
                <div
                  key={achievement.key}
                  className={`relative border rounded-lg p-4 transition-colors board-row-enter ${
                    achievement.unlocked
                      ? 'border-white/30 bg-white/5'
                      : 'border-white/10 opacity-40'
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Trophy icon */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.unlocked ? 'bg-white/20' : 'bg-white/5'
                    }`}>
                      <svg className={`w-5 h-5 ${achievement.unlocked ? 'text-white' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm">{achievement.name}</h3>
                      <p className="text-white/50 text-xs mt-0.5">{achievement.description}</p>

                      {/* Rewards */}
                      <div className="flex gap-2 mt-2">
                        {achievement.reward_money > 0 && (
                          <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono">
                            +¥{achievement.reward_money.toLocaleString()}
                          </span>
                        )}
                        {achievement.reward_xp > 0 && (
                          <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono">
                            +{achievement.reward_xp} XP
                          </span>
                        )}
                      </div>

                      {/* Unlocked date */}
                      {achievement.unlocked && achievement.unlocked_at && (
                        <p className="text-[10px] text-white/30 mt-2">
                          {new Date(achievement.unlocked_at).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lock overlay for unearned */}
                  {!achievement.unlocked && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/30 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-white/40 rounded-full"></div>
              <span>完成条件以解锁成就并获取奖励</span>
            </div>
            <div>{unlockedCount} / {achievements.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
