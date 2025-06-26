'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PlayerData {
  money: number;
  xp: number;
  level: number;
}

interface PlayerContextType {
  player: PlayerData;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  addXP: (amount: number) => void;
  resetPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerData>(() => {
    // Try to load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playerData');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    // Default starting values
    return {
      money: 10000,
      xp: 0,
      level: 1
    };
  });

  // Calculate level based on XP (simple formula: level = Math.floor(xp / 1000) + 1)
  useEffect(() => {
    const newLevel = Math.floor(player.xp / 1000) + 1;
    if (newLevel !== player.level) {
      setPlayer(prev => ({ ...prev, level: newLevel }));
    }
  }, [player.xp, player.level]);

  // Save to localStorage whenever player data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('playerData', JSON.stringify(player));
    }
  }, [player]);

  const addMoney = (amount: number) => {
    setPlayer(prev => ({ ...prev, money: prev.money + amount }));
  };

  const spendMoney = (amount: number): boolean => {
    if (player.money >= amount) {
      setPlayer(prev => ({ ...prev, money: prev.money - amount }));
      return true;
    }
    return false;
  };

  const addXP = (amount: number) => {
    setPlayer(prev => ({ ...prev, xp: prev.xp + amount }));
  };

  const resetPlayer = () => {
    setPlayer({
      money: 10000,
      xp: 0,
      level: 1
    });
  };

  const value = {
    player,
    addMoney,
    spendMoney,
    addXP,
    resetPlayer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
} 