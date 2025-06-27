'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthContext';

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
  loading: boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [player, setPlayer] = useState<PlayerData>({
    money: 10000,
    xp: 0,
    level: 1
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isInitialLoad = useRef(true);

  // Load player data from Supabase when user changes
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
      
      const { data, error } = await supabase
        .from('users')
        .select('money, xp')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading player data:', error);
        
        // If the user record doesn't exist, create it
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User record not found, creating new record...');
          const { data: newData, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              money: 10000,
              xp: 0
            })
            .select('money, xp')
            .single();

          if (createError) {
            console.error('Error creating user record:', createError);
            setPlayer({ money: 10000, xp: 0, level: 1 });
          } else if (newData) {
            console.log('Created new player data:', newData);
            setPlayer({
              money: Number(newData.money),
              xp: newData.xp,
              level: 1
            });
          }
        } else {
          // Other error, use default values
          setPlayer({ money: 10000, xp: 0, level: 1 });
        }
      } else if (data) {
        console.log('Loaded player data:', data);
        const level = Math.floor(data.xp / 1000) + 1;
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

  // Calculate level based on XP (simple formula: level = Math.floor(xp / 1000) + 1)
  useEffect(() => {
    const newLevel = Math.floor(player.xp / 1000) + 1;
    if (newLevel !== player.level) {
      setPlayer(prev => ({ ...prev, level: newLevel }));
    }
  }, [player.xp, player.level]);

  // Save to Supabase whenever player data changes (but not during initial load)
  useEffect(() => {
    if (user && initialized && !isInitialLoad.current) {
      savePlayerData();
    }
  }, [player.money, player.xp, user, initialized]);

  const savePlayerData = async () => {
    if (!user) return;

    try {
      console.log('Saving player data:', { id: user.id, money: player.money, xp: player.xp });
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
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