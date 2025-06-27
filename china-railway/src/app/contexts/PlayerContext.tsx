'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { playerUtils, PlayerData } from '../utils/player';

interface PlayerContextType {
  player: PlayerData & { level: number };
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  addXP: (amount: number) => void;
  resetPlayer: () => void;
  loading: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Calculate level based on XP (simple formula: level = Math.floor(xp / 1000) + 1)
const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 1000) + 1;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [player, setPlayer] = useState<PlayerData & { level: number }>({
    money: 10000,
    xp: 0,
    level: 1
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isInitialLoad = useRef(true);

  // Load player data from API when user changes
  useEffect(() => {
    if (user) {
      loadPlayerData();
    } else {
      setPlayer({ money: 10000, xp: 0, level: 1 });
      setLoading(false);
      setInitialized(false);
      isInitialLoad.current = true;
    }
  }, [user]);

  const loadPlayerData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading player data for user:', user.id);
      
      const { data, error } = await playerUtils.getPlayerData();

      if (error) {
        console.error('Error loading player data:', error);
        setPlayer({ money: 10000, xp: 0, level: 1 });
      } else if (data) {
        console.log('Loaded player data:', data);
        const level = calculateLevel(data.xp);
        setPlayer({
          money: Number(data.money),
          xp: data.xp,
          level: level
        });
      }
    } catch (error) {
      console.error('Error loading player data:', error);
      setPlayer({ money: 10000, xp: 0, level: 1 });
    } finally {
      setLoading(false);
      setInitialized(true);
      isInitialLoad.current = false;
    }
  };

  // Calculate level based on XP whenever XP changes
  useEffect(() => {
    const newLevel = calculateLevel(player.xp);
    if (newLevel !== player.level) {
      setPlayer(prev => ({ ...prev, level: newLevel }));
    }
  }, [player.xp, player.level]);

  // Save to API whenever player data changes (but not during initial load)
  useEffect(() => {
    if (user && initialized && !isInitialLoad.current) {
      savePlayerData();
    }
  }, [player.money, player.xp, user, initialized]);

  const savePlayerData = async () => {
    if (!user) return;

    try {
      console.log('Saving player data:', { id: user.id, money: player.money, xp: player.xp });
      // Only save money and xp, level is calculated dynamically
      const { error } = await playerUtils.updatePlayerData({
        money: player.money,
        xp: player.xp
      });

      if (error) {
        console.error('Error saving player data:', error);
      } else {
        console.log('Player data saved successfully');
      }
    } catch (error) {
      console.error('Error saving player data:', error);
    }
  };

  const addMoney = (amount: number) => {
    console.log('Adding money:', amount);
    setPlayer(prev => ({ ...prev, money: prev.money + amount }));
  };

  const spendMoney = (amount: number): boolean => {
    if (player.money >= amount) {
      console.log('Spending money:', amount);
      setPlayer(prev => ({ ...prev, money: prev.money - amount }));
      return true;
    }
    return false;
  };

  const addXP = (amount: number) => {
    console.log('Adding XP:', amount);
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
    loading,
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