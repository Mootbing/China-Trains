import { SupabaseClient } from '@supabase/supabase-js';

const MAX_ACTIVE_DEMANDS_PER_STATION = 3;
const DEMAND_EXPIRY_HOURS = 24;

/**
 * Ensure a station has up to 3 active demands, creating random ones if needed.
 * Runs lazily when demands for a station are fetched.
 */
export async function generateDemands(
  supabase: SupabaseClient,
  userId: string,
  stationId?: string
): Promise<void> {
  try {
    // Get user's stations
    const { data: userStations, error: stationsError } = await supabase
      .from('stations')
      .select('id, name, loc_name, latitude, longitude')
      .eq('user_id', userId);

    if (stationsError || !userStations || userStations.length < 2) {
      // Need at least 2 stations for demands
      return;
    }

    // If a specific station is requested, only process that one
    const stationsToProcess = stationId
      ? userStations.filter(s => s.id === stationId)
      : userStations;

    const now = new Date().toISOString();

    for (const station of stationsToProcess) {
      // Count active (non-expired) demands for this station
      const { data: activeDemands, error: demandsError } = await supabase
        .from('station_demands')
        .select('id')
        .eq('station_id', station.id)
        .gt('expires_at', now);

      if (demandsError) {
        console.error('Error checking demands:', demandsError);
        continue;
      }

      const activeCount = activeDemands?.length || 0;
      const neededCount = MAX_ACTIVE_DEMANDS_PER_STATION - activeCount;

      if (neededCount <= 0) continue;

      // Get other stations as potential destinations
      const otherStations = userStations.filter(s => s.id !== station.id);
      if (otherStations.length === 0) continue;

      // Create new demands
      const newDemands = [];
      for (let i = 0; i < neededCount; i++) {
        // Pick a random destination
        const dest = otherStations[Math.floor(Math.random() * otherStations.length)];

        // Calculate distance for reward multiplier
        const distance = haversineDistance(
          station.latitude || 0, station.longitude || 0,
          dest.latitude || 0, dest.longitude || 0
        );

        // Distance-based multiplier: 1.2x to 2.5x
        // ~200km = 1.2x, ~2000km = 2.5x
        const multiplier = Math.min(2.5, Math.max(1.2, 1.2 + (distance / 2000) * 1.3));
        const roundedMultiplier = Math.round(multiplier * 10) / 10;

        // Random demand type
        const demandType = Math.random() > 0.5 ? 'passenger' : 'freight';

        // Random quantity
        const quantity = demandType === 'passenger'
          ? Math.floor(Math.random() * 200) + 20    // 20-220 passengers
          : Math.floor(Math.random() * 500) + 50;    // 50-550 tons freight

        // Expires in 24 hours
        const expiresAt = new Date(Date.now() + DEMAND_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        newDemands.push({
          station_id: station.id,
          destination_station_id: dest.id,
          demand_type: demandType,
          quantity,
          reward_multiplier: roundedMultiplier,
          expires_at: expiresAt,
          created_at: now,
        });
      }

      if (newDemands.length > 0) {
        const { error: insertError } = await supabase
          .from('station_demands')
          .insert(newDemands);

        if (insertError) {
          console.error('Error inserting demands:', insertError);
        }
      }
    }
  } catch (error) {
    console.error('Demand generation error:', error);
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
