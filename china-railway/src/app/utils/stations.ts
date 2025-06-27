export interface Station {
  id: string;
  user_id: string;
  name: string;
  loc_name: string;
  level: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export const stationUtils = {
  async checkStation(name: string): Promise<{ exists: boolean; station?: Station; error?: string }> {
    try {
      const response = await fetch(`/api/stations?name=${encodeURIComponent(name)}`);
      const data = await response.json();
      
      if (response.ok) {
        return { 
          exists: data.exists,
          station: data.station
        };
      } else {
        return { exists: false, error: data.error || 'Failed to check station' };
      }
    } catch (error) {
      console.error('Error checking station:', error);
      return { exists: false, error: 'Failed to check station' };
    }
  },

  async getAllStations(): Promise<{ stations?: Station[]; error?: string }> {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (response.ok) {
        return { stations: data.stations || [] };
      } else {
        return { error: data.error || 'Failed to fetch stations' };
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      return { error: 'Failed to fetch stations' };
    }
  },

  async createStation(
    name: string, 
    loc_name?: string, 
    level: number = 1,
    latitude?: number,
    longitude?: number
  ): Promise<{ 
    success: boolean; 
    station?: Station; 
    moneySpent?: number;
    remainingMoney?: number;
    error?: string 
  }> {
    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, loc_name, level, latitude, longitude }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true,
          station: data.station,
          moneySpent: data.moneySpent,
          remainingMoney: data.remainingMoney
        };
      } else {
        return { success: false, error: data.error || 'Failed to create station' };
      }
    } catch (error) {
      console.error('Error creating station:', error);
      return { success: false, error: 'Failed to create station' };
    }
  }
}; 