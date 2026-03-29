import { promises as fs } from 'fs';
import path from 'path';
import {
  calculateRouteDistance,
  calculateTrainMetrics,
  calculateTrainPosition,
  calculateRouteRewards,
  Vehicle,
} from './route-utils';

/**
 * Complete a route: mark as completed, move vehicles to end station, credit user.
 * Returns { money_earned, xp_earned, end_station } on success.
 * Throws on failure.
 */
export async function completeRoute(
  supabase: any,
  route: any,
  userId: string
): Promise<{ money_earned: number; xp_earned: number; end_station: string }> {
  // Load vehicle data from JSON to calculate metrics
  const locomotivesData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public/assets/data/locomotives.json'), 'utf8')
  );
  const carsData = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public/assets/data/cars.json'), 'utf8')
  );

  // Get vehicles on this route
  const vehicleIds: string[] = route.all_vehicle_ids || [];
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .in('id', vehicleIds);

  const enhancedVehicles: Vehicle[] = (vehicles || []).map((v: any) => {
    const base =
      locomotivesData.find((l: any) => l.model === v.model) ||
      carsData.find((c: any) => c.model === v.model);
    return {
      id: v.id,
      model: v.model,
      type: v.type,
      weight: base?.weight || 0,
      max_speed: base?.max_speed,
      max_weight: base?.max_weight,
    };
  });

  // Get stations for distance calculation
  const stationIds: string[] = route.all_station_ids || [];
  const { data: stations } = await supabase
    .from('stations')
    .select('*')
    .in('id', stationIds);

  const stationMap: Record<string, any> = {};
  (stations || []).forEach((s: any) => {
    stationMap[s.id] = s;
  });
  const orderedStations = stationIds.map((id: string) => stationMap[id]).filter(Boolean);

  // Calculate distance and rewards
  const totalDistance = calculateRouteDistance(orderedStations);
  const startStation = stationMap[route.start_station_id];
  const endStation = stationMap[route.end_station_id];
  const rewards = calculateRouteRewards(
    totalDistance,
    enhancedVehicles,
    startStation?.level || 1,
    endStation?.level || 1
  );

  // 1. Mark route as completed
  const { error: updateRouteError } = await supabase
    .from('routes')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      money_earned: rewards.money,
      xp_earned: rewards.xp,
    })
    .eq('id', route.id);

  if (updateRouteError) {
    throw new Error('Failed to complete route: ' + updateRouteError.message);
  }

  // 2. Move all vehicles to the end station
  for (const vehicleId of vehicleIds) {
    await supabase
      .from('vehicles')
      .update({ station_id: route.end_station_id, route_id: null })
      .eq('id', vehicleId);
  }

  // 3. Credit player with rewards
  const { data: userData } = await supabase
    .from('users')
    .select('money, xp')
    .eq('id', userId)
    .single();

  if (userData) {
    await supabase
      .from('users')
      .update({
        money: Number(userData.money) + rewards.money,
        xp: userData.xp + rewards.xp,
      })
      .eq('id', userId);
  }

  return {
    money_earned: rewards.money,
    xp_earned: rewards.xp,
    end_station: endStation?.loc_name || endStation?.name || 'Unknown',
  };
}
