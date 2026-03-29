import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../utils/supabase-server';
import {
  calculateRouteDistance,
  calculateTrainMetrics,
  calculateTrainPosition,
  Station,
  Vehicle,
  TrainMetrics,
  RouteProgress
} from '../../utils/route-utils';
import { completeRoute } from '../../utils/route-completion';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    // Fetch active (non-completed) routes for the current user
    const showCompleted = request.nextUrl.searchParams.get('status') === 'completed';
    const { data: routes, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', showCompleted)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ routes: [] });
    }

    // Load locomotive and car data from JSON files
    const locomotivesPath = path.join(process.cwd(), 'public/assets/data/locomotives.json');
    const carsPath = path.join(process.cwd(), 'public/assets/data/cars.json');

    const locomotivesData = JSON.parse(await fs.readFile(locomotivesPath, 'utf8'));
    const carsData = JSON.parse(await fs.readFile(carsPath, 'utf8'));

    // Get all unique station IDs from all routes
    const allStationIds = [...new Set(routes.flatMap(route => route.all_station_ids || []))];

    // Fetch station data
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('*')
      .eq('user_id', user.id)
      .in('id', allStationIds);

    if (stationsError) {
      return NextResponse.json({ error: stationsError.message }, { status: 500 });
    }

    // Create station lookup map
    const stationMap: { [key: string]: Station } = {};
    (stations || []).forEach(station => {
      stationMap[station.id] = station;
    });

    // Get all unique vehicle IDs from all routes
    const allVehicleIds = [...new Set(routes.flatMap(route => route.all_vehicle_ids || []))];

    // Fetch vehicle data
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .in('id', allVehicleIds);

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    // Create vehicle lookup map with enhanced data
    const vehicleMap: { [key: string]: Vehicle } = {};
    (vehicles || []).forEach(vehicle => {
      // Find corresponding locomotive or car data
      const locomotiveData = locomotivesData.find((loco: any) => loco.model === vehicle.model);
      const carData = carsData.find((car: any) => car.model === vehicle.model);

      const baseData = locomotiveData || carData;

      vehicleMap[vehicle.id] = {
        id: vehicle.id,
        model: vehicle.model,
        type: vehicle.type,
        weight: baseData?.weight || 0,
        max_speed: baseData?.max_speed,
        max_weight: baseData?.max_weight
      };
    });

    // Process each route with calculations
    const enhancedRoutes = routes.map(route => {
      // Get stations for this route
      const routeStations = (route.all_station_ids || [])
        .map((stationId: string) => stationMap[stationId])
        .filter(Boolean);

      // Get vehicles for this route
      const routeVehicles = (route.all_vehicle_ids || [])
        .map((vehicleId: string) => vehicleMap[vehicleId])
        .filter(Boolean);

      // Calculate train metrics
      const trainMetrics = calculateTrainMetrics(routeVehicles);

      // Calculate route progress
      let routeProgress: RouteProgress = {
        percent_completion: 0,
        eta: "0h 0m 0s",
        train_coordinates: {
          latitude: routeStations[0]?.latitude || 0,
          longitude: routeStations[0]?.longitude || 0
        },
        next_train_coordinates: {
          latitude: routeStations[0]?.latitude || 0,
          longitude: routeStations[0]?.longitude || 0
        }
      };

      if (routeStations.length >= 2 && route.started_at) {
        routeProgress = calculateTrainPosition(
          routeStations,
          trainMetrics,
          new Date(route.started_at)
        );
      }

      // For completed routes, include distance info
      const totalDistance = routeStations.length >= 2
        ? calculateRouteDistance(routeStations)
        : 0;

      return {
        ...route,
        percent_completion: routeProgress.percent_completion,
        eta: routeProgress.eta,
        train_coordinates: routeProgress.train_coordinates,
        next_train_coordinates: routeProgress.next_train_coordinates,
        total_distance: Math.round(totalDistance),
      };
    });

    // Auto-complete routes that have reached 100% but are still marked incomplete
    const justCompleted: Array<{ route_id: string; money_earned: number; xp_earned: number; end_station: string }> = [];

    if (!showCompleted) {
      const readyToComplete = enhancedRoutes.filter(
        (r: any) => r.percent_completion >= 100 && !r.completed
      );

      for (const route of readyToComplete) {
        try {
          const result = await completeRoute(supabase, route, user.id);
          justCompleted.push({
            route_id: route.id,
            money_earned: result.money_earned,
            xp_earned: result.xp_earned,
            end_station: result.end_station,
          });
        } catch (err) {
          console.error('Auto-complete failed for route', route.id, err);
        }
      }

      // Remove auto-completed routes from the active list
      const completedIds = new Set(justCompleted.map(jc => jc.route_id));
      const activeRoutes = enhancedRoutes.filter((r: any) => !completedIds.has(r.id));

      return NextResponse.json({
        routes: activeRoutes,
        just_completed: justCompleted,
      });
    }

    return NextResponse.json({
      routes: enhancedRoutes
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get routes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
