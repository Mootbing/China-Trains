import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  calculateRouteDistance,
  calculateTrainMetrics,
  calculateTrainPosition,
  Station,
  Vehicle,
  TrainMetrics,
  RouteProgress
} from '../../../utils/route-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params;
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const stationMap: { [key: string]: Station & { level?: number } } = {};
    (stations || []).forEach(station => {
      stationMap[station.id] = {
        id: station.id,
        latitude: station.latitude,
        longitude: station.longitude,
        name: station.name,
        loc_name: station.loc_name,
        level: station.level
      };
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
  } catch (error) {
    console.error('Get route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
