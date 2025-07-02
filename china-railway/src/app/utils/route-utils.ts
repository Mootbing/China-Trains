// Route calculation utilities refactored from Map and Station components

export interface Station {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  loc_name?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  type: string;
  weight: number;
  max_speed?: number;
  max_weight?: number;
}

export interface TrainMetrics {
  totalWeight: number;
  maxWeight: number;
  maxSpeed: number;
  effectiveSpeed: number;
  isOverweight: boolean;
}

export interface RouteProgress {
  percent_completion: number;
  eta: string;
  train_coordinates: {
    latitude: number;
    longitude: number;
  };
  next_train_coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

/**
 * Calculate total distance for a route through multiple stations
 */
export const calculateRouteDistance = (stations: Station[]): number => {
  let totalDistance = 0;

  for (let i = 0; i < stations.length - 1; i++) {
    const current = stations[i];
    const next = stations[i + 1];
    
    if (current.latitude && current.longitude && next.latitude && next.longitude) {
      const segmentDistance = calculateDistance(
        current.latitude, current.longitude,
        next.latitude, next.longitude
      );
      totalDistance += segmentDistance;
    }
  }

  return totalDistance;
};

/**
 * Calculate train performance metrics based on locomotives and cars
 */
export const calculateTrainMetrics = (vehicles: Vehicle[]): TrainMetrics => {
  const locomotives = vehicles.filter(vehicle => vehicle.max_speed && vehicle.max_weight);
  const cars = vehicles.filter(vehicle => !vehicle.max_speed || !vehicle.max_weight);
  
  if (locomotives.length === 0) {
    return { totalWeight: 0, maxWeight: 0, maxSpeed: 0, effectiveSpeed: 0, isOverweight: false };
  }

  // Calculate total weight (locomotive + cars)
  const locomotiveWeight = locomotives.reduce((sum, loco) => sum + loco.weight, 0);
  const carWeight = cars.reduce((sum, car) => sum + car.weight, 0);
  const totalWeight = locomotiveWeight + carWeight;

  // Get max weight and speed from locomotives
  const maxWeight = locomotives.reduce((sum, loco) => sum + (loco.max_weight || 0), 0);
  const maxSpeed = Math.max(...locomotives.map(loco => loco.max_speed || 0));

  // Calculate effective speed based on weight
  let effectiveSpeed = maxSpeed;
  const isOverweight = totalWeight > maxWeight;
  
  if (isOverweight && maxWeight > 0) {
    const weightRatio = (totalWeight - maxWeight) / maxWeight;
    effectiveSpeed = Math.max(1, maxSpeed * (1 - weightRatio));
  }

  return { totalWeight, maxWeight, maxSpeed, effectiveSpeed, isOverweight };
};

/**
 * Format time as hours, minutes, seconds
 */
export const formatTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${h}h ${m}m ${s}s`;
};

/**
 * Calculate train's current position along route based on time elapsed
 */
export const calculateTrainPosition = (
  stations: Station[],
  trainMetrics: TrainMetrics,
  startedAt: Date,
  now: Date = new Date()
): RouteProgress => {
  if (stations.length < 2) {
    return {
      percent_completion: 0,
      eta: formatTime(0),
      train_coordinates: {
        latitude: stations[0]?.latitude || 0,
        longitude: stations[0]?.longitude || 0
      },
      next_train_coordinates: {
        latitude: stations[0]?.latitude || 0,
        longitude: stations[0]?.longitude || 0
      }
    };
  }

  const totalDistance = calculateRouteDistance(stations);
  const effectiveSpeed = trainMetrics.effectiveSpeed;
  
  if (effectiveSpeed <= 0 || totalDistance <= 0) {
    return {
      percent_completion: 0,
      eta: formatTime(0),
      train_coordinates: {
        latitude: stations[0].latitude,
        longitude: stations[0].longitude
      },
      next_train_coordinates: {
        latitude: stations[0].latitude,
        longitude: stations[0].longitude
      }
    };
  }

  // Calculate time elapsed in hours
  const timeElapsedMs = now.getTime() - startedAt.getTime();
  const timeElapsedHours = timeElapsedMs / (1000 * 60 * 60);

  // Calculate distance traveled
  const distanceTraveled = timeElapsedHours * effectiveSpeed;
  
  // Calculate percent completion
  const percentCompletion = Math.min(100, (distanceTraveled / totalDistance) * 100);

  // Calculate estimated total journey time
  const totalJourneyTime = totalDistance / effectiveSpeed;
  
  // Calculate ETA (remaining time)
  const remainingTime = Math.max(0, totalJourneyTime - timeElapsedHours);
  const eta = formatTime(remainingTime);

  // Calculate current coordinates along the route
  const currentCoordinates = calculateCoordinatesAlongRoute(
    stations,
    distanceTraveled
  );

  // Calculate next coordinates (5 minutes ahead)
  const fiveMinutesInHours = 5 / 60; // 5 minutes = 0.0833 hours
  const distanceIn5Minutes = fiveMinutesInHours * effectiveSpeed;
  const nextDistanceTraveled = distanceTraveled + distanceIn5Minutes;
  
  const nextCoordinates = calculateCoordinatesAlongRoute(
    stations,
    nextDistanceTraveled
  );

  return {
    percent_completion: Math.round(percentCompletion * 100) / 100, // Round to 2 decimal places
    eta,
    train_coordinates: currentCoordinates,
    next_train_coordinates: nextCoordinates
  };
};

/**
 * Calculate current coordinates along a route given distance traveled
 */
export const calculateCoordinatesAlongRoute = (
  stations: Station[],
  distanceTraveled: number
): { latitude: number; longitude: number } => {
  if (stations.length < 2) {
    return {
      latitude: stations[0]?.latitude || 0,
      longitude: stations[0]?.longitude || 0
    };
  }

  let remainingDistance = distanceTraveled;
  
  // Walk through route segments to find current position
  for (let i = 0; i < stations.length - 1; i++) {
    const current = stations[i];
    const next = stations[i + 1];
    
    const segmentDistance = calculateDistance(
      current.latitude, current.longitude,
      next.latitude, next.longitude
    );

    if (remainingDistance <= segmentDistance) {
      // Train is within this segment
      const progress = remainingDistance / segmentDistance;
      
      // Linear interpolation between current and next station
      const latitude = current.latitude + (next.latitude - current.latitude) * progress;
      const longitude = current.longitude + (next.longitude - current.longitude) * progress;
      
      return { latitude, longitude };
    }

    remainingDistance -= segmentDistance;
  }

  // Train has completed the route or gone beyond
  const lastStation = stations[stations.length - 1];
  return {
    latitude: lastStation.latitude,
    longitude: lastStation.longitude
  };
};