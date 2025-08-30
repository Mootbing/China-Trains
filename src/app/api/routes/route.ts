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
} from '../../utils/route-utils';

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all routes for the current user
    const { data: routes, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id)
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
      stationMap[station.id] = {
        id: station.id,
        latitude: station.latitude,
        longitude: station.longitude,
        name: station.name,
        loc_name: station.loc_name
      };
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

      return {
        ...route,
        percent_completion: routeProgress.percent_completion,
        eta: routeProgress.eta,
        train_coordinates: routeProgress.train_coordinates,
        next_train_coordinates: routeProgress.next_train_coordinates
      };
    });

    return NextResponse.json({ 
      routes: enhancedRoutes
    });
  } catch (error) {
    console.error('Get routes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 