import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../../utils/supabase-server';
import {
  calculateRouteDistance,
  calculateTrainMetrics,
  calculateTrainPosition,
  calculateRouteRewards,
  Station,
  Vehicle,
  TrainMetrics,
  RouteProgress
} from '../../../utils/route-utils';
import { checkAndAwardAchievements } from '../../../utils/achievement-checker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params;
    const { supabase, user } = await createAuthenticatedClient();

    // Fetch the specific route
    const { data: route, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Load locomotive and car data from JSON files
    const locomotivesPath = path.join(process.cwd(), 'public/assets/data/locomotives.json');
    const carsPath = path.join(process.cwd(), 'public/assets/data/cars.json');

    const locomotivesData = JSON.parse(await fs.readFile(locomotivesPath, 'utf8'));
    const carsData = JSON.parse(await fs.readFile(carsPath, 'utf8'));

    // Get station data for this route
    const stationIds = route.all_station_ids || [];
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .eq('user_id', user.id)
      .in('id', stationIds);

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 500 });
    }

    // Create station lookup map and ordered stations
    const stationMap: { [key: string]: Station } = {};
    (stations || []).forEach(station => {
      stationMap[station.id] = station;
    });

    // Get ordered stations based on route
    const orderedStations = stationIds
      .map((stationId: string) => stationMap[stationId])
      .filter(Boolean);

    // Get vehicle data for this route
    const vehicleIds = route.all_vehicle_ids || [];
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .in('id', vehicleIds);

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    // Create vehicle lookup map with enhanced data
    const vehicleMap: { [key: string]: Vehicle & any } = {};
    const orderedVehicles: (Vehicle & any)[] = [];

    (vehicles || []).forEach(vehicle => {
      // Find corresponding locomotive or car data
      const locomotiveData = locomotivesData.find((loco: any) => loco.model === vehicle.model);
      const carData = carsData.find((car: any) => car.model === vehicle.model);

      const baseData = locomotiveData || carData;

      const enhancedVehicle = {
        id: vehicle.id,
        model: vehicle.model,
        type: vehicle.type,
        weight: baseData?.weight || 0,
        max_speed: baseData?.max_speed,
        max_weight: baseData?.max_weight,
        ...baseData // Include all data from JSON files
      };

      vehicleMap[vehicle.id] = enhancedVehicle;
    });

    // Get ordered vehicles based on route
    vehicleIds.forEach((vehicleId: string) => {
      const vehicle = vehicleMap[vehicleId];
      if (vehicle) {
        orderedVehicles.push(vehicle);
      }
    });

    // Calculate train metrics
    const trainMetrics = calculateTrainMetrics(orderedVehicles);

    // Calculate route progress and position
    let routeProgress: RouteProgress = {
      percent_completion: 0,
      eta: "0h 0m 0s",
      train_coordinates: {
        latitude: orderedStations[0]?.latitude || 0,
        longitude: orderedStations[0]?.longitude || 0
      },
      next_train_coordinates: {
        latitude: orderedStations[0]?.latitude || 0,
        longitude: orderedStations[0]?.longitude || 0
      }
    };

    if (orderedStations.length >= 2 && route.started_at) {
      routeProgress = calculateTrainPosition(
        orderedStations,
        trainMetrics,
        new Date(route.started_at)
      );
    }

    // Find current and next station based on progress
    const totalStations = orderedStations.length;
    const currentSegmentIndex = Math.floor((routeProgress.percent_completion / 100) * (totalStations - 1));
    const currentStation = orderedStations[Math.min(currentSegmentIndex, totalStations - 1)];
    const nextStation = orderedStations[Math.min(currentSegmentIndex + 1, totalStations - 1)];

    // Create timetable with estimated arrival times
    const timetable = orderedStations.map((station: any, index: number) => {
      // Calculate cumulative distance and time for each station
      let cumulativeDistance = 0;
      for (let i = 0; i < index; i++) {
        if (orderedStations[i] && orderedStations[i + 1]) {
          const dist = calculateRouteDistance([orderedStations[i], orderedStations[i + 1]]);
          cumulativeDistance += dist;
        }
      }

      const estimatedTimeHours = cumulativeDistance / trainMetrics.effectiveSpeed;
      const startTime = new Date(route.started_at);
      const estimatedArrival = new Date(startTime.getTime() + estimatedTimeHours * 60 * 60 * 1000);

      return {
        station,
        estimatedArrival: estimatedArrival.toLocaleString('zh-CN'),
        distance: cumulativeDistance,
        isNext: station.id === nextStation?.id,
        isPassed: index <= currentSegmentIndex
      };
    });

    const enhancedRoute = {
      ...route,
      percent_completion: routeProgress.percent_completion,
      eta: routeProgress.eta,
      train_coordinates: routeProgress.train_coordinates,
      next_train_coordinates: routeProgress.next_train_coordinates,
      stations: orderedStations,
      vehicles: orderedVehicles,
      trainMetrics,
      currentStation,
      nextStation,
      timetable
    };

    return NextResponse.json({
      route: enhancedRoute
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/routes/[id] -- Complete a route (idempotent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action !== 'complete') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { supabase, user } = await createAuthenticatedClient();

    // Fetch the route
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', user.id)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Idempotent: already completed
    if (route.completed) {
      return NextResponse.json({
        message: 'Route already completed',
        money_earned: route.money_earned,
        xp_earned: route.xp_earned,
        completed_at: route.completed_at,
      });
    }

    // Load vehicle data from JSON to calculate metrics
    const locomotivesData = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'public/assets/data/locomotives.json'), 'utf8')
    );
    const carsData = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'public/assets/data/cars.json'), 'utf8')
    );

    // Get vehicles on this route
    const vehicleIds = route.all_vehicle_ids || [];
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .in('id', vehicleIds);

    const enhancedVehicles: Vehicle[] = (vehicles || []).map(v => {
      const base = locomotivesData.find((l: any) => l.model === v.model)
        || carsData.find((c: any) => c.model === v.model);
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
    const stationIds = route.all_station_ids || [];
    const { data: stations } = await supabase
      .from('stations')
      .select('*')
      .in('id', stationIds);

    const stationMap: Record<string, any> = {};
    (stations || []).forEach(s => { stationMap[s.id] = s; });
    const orderedStations = stationIds.map((id: string) => stationMap[id]).filter(Boolean);

    // Check if route is actually >= 100% complete
    const trainMetrics = calculateTrainMetrics(enhancedVehicles);
    if (orderedStations.length >= 2 && route.started_at) {
      const progress = calculateTrainPosition(orderedStations, trainMetrics, new Date(route.started_at));
      if (progress.percent_completion < 100) {
        return NextResponse.json({ error: 'Route not yet complete', percent_completion: progress.percent_completion }, { status: 400 });
      }
    }

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

    // Check for demand fulfillment
    // A demand is fulfilled if the route's station sequence includes both the demand's origin and destination
    const routeStationIdSet = new Set(stationIds);
    let demandMultiplier = 1.0;
    const fulfilledDemandIds: string[] = [];

    try {
      // Get active demands for stations in this route
      const now = new Date().toISOString();
      const { data: demands } = await supabase
        .from('station_demands')
        .select('*')
        .in('station_id', stationIds)
        .gt('expires_at', now);

      if (demands && demands.length > 0) {
        for (const demand of demands) {
          // Check if both origin station and destination station are in the route
          if (routeStationIdSet.has(demand.station_id) && routeStationIdSet.has(demand.destination_station_id)) {
            // Use the highest demand multiplier
            if (demand.reward_multiplier > demandMultiplier) {
              demandMultiplier = Number(demand.reward_multiplier);
            }
            fulfilledDemandIds.push(demand.id);
          }
        }
      }
    } catch (demandError) {
      // Non-critical: don't fail route completion if demand check fails
      console.error('Demand check error:', demandError);
    }

    // Apply demand multiplier to rewards
    if (demandMultiplier > 1.0) {
      rewards.money = Math.round(rewards.money * demandMultiplier);
    }

    // Delete fulfilled demands
    if (fulfilledDemandIds.length > 0) {
      await supabase
        .from('station_demands')
        .delete()
        .in('id', fulfilledDemandIds);
    }

    // 1. Mark route as completed
    const { error: updateRouteError } = await supabase
      .from('routes')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        money_earned: rewards.money,
        xp_earned: rewards.xp,
      })
      .eq('id', routeId);

    if (updateRouteError) {
      return NextResponse.json({ error: 'Failed to complete route' }, { status: 500 });
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
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('users')
        .update({
          money: Number(userData.money) + rewards.money,
          xp: userData.xp + rewards.xp,
        })
        .eq('id', user.id);
    }

    // Check and award achievements (non-blocking for the response)
    const newAchievements = await checkAndAwardAchievements(supabase, user.id);

    return NextResponse.json({
      message: 'Route completed',
      money_earned: rewards.money,
      xp_earned: rewards.xp,
      completed_at: new Date().toISOString(),
      end_station: endStation?.loc_name || endStation?.name || 'Unknown',
      new_achievements: newAchievements,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Complete route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
