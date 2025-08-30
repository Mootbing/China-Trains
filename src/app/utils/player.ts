export interface PlayerData {
  money: number;
  xp: number;
}

export const playerUtils = {
  async getPlayerData(): Promise<{ data?: PlayerData; error?: string }> {
    try {
      const response = await fetch('/api/player/data');
      const data = await response.json();
      
      if (response.ok) {
        return { data };
      } else {
        return { error: data.error || 'Failed to get player data' };
      }
    } catch (error) {
      console.error('Error getting player data:', error);
      return { error: 'Failed to get player data' };
    }
  },

  async updatePlayerData(playerData: PlayerData): Promise<{ data?: PlayerData; error?: string }> {
    try {
      const response = await fetch('/api/player/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerData),
      });

      const data = await response.json();

      if (response.ok) {
        return { data };
      } else {
        return { error: data.error || 'Failed to update player data' };
      }
    } catch (error) {
      console.error('Error updating player data:', error);
      return { error: 'Failed to update player data' };
    }
  }
}; 