# Route Tracking System

This document explains the comprehensive route tracking system that provides real-time train progress, ETA calculations, and current coordinates for trains on routes.

## Overview

The enhanced route tracking system calculates:
- **Percent Completion**: How far along the route the train has traveled
- **ETA (Estimated Time of Arrival)**: Remaining time to destination
- **Train Coordinates**: Current latitude/longitude position of the train
- **Train Metrics**: Weight, speed, and performance calculations

## Database Schema

### Enhanced Routes Table
```sql
CREATE TABLE public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    all_station_ids UUID[] NOT NULL,           -- Station sequence
    all_vehicle_ids UUID[] NOT NULL DEFAULT '{}', -- Vehicle manifest
    start_station_id UUID REFERENCES public.stations(id) NOT NULL,
    end_station_id UUID REFERENCES public.stations(id) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When route started
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### GET `/api/routes`
Enhanced to return comprehensive route tracking data.

**Response Structure:**
```json
{
  "routes": [
    {
      "id": "route-uuid",
      "user_id": "user-uuid", 
      "all_station_ids": ["station1", "station2", "station3"],
      "all_vehicle_ids": ["vehicle1", "vehicle2", "vehicle3"],
      "start_station_id": "station1",
      "end_station_id": "station3",
      "started_at": "2024-01-01T10:00:00Z",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z",
      
      // Enhanced tracking data
      "percent_completion": 45.67,
      "eta": "2h 15m 30s",
      "train_coordinates": {
        "latitude": 39.9042,
        "longitude": 116.4074
      }
    }
  ]
}
```

## Key Features

✅ **Real-time Progress**: Calculates current position based on time elapsed  
✅ **Weight Penalties**: Slower speeds for overweight trains  
✅ **Coordinate Interpolation**: Exact lat/lng position along route  
✅ **ETA Calculations**: Remaining travel time estimates  
✅ **Comprehensive Data**: Station sequences + vehicle manifests  
✅ **Efficient Queries**: Optimized database access patterns  

## Implementation Complete

The route tracking system is now fully implemented with:

1. **Database Schema**: Added `all_vehicle_ids` and `started_at` fields
2. **Utilities**: Comprehensive calculation functions in `route-utils.ts`
3. **Enhanced API**: Route endpoint returns progress, ETA, and coordinates
4. **Migration Scripts**: SQL files for database updates
5. **Documentation**: Complete system overview and examples

## Usage

### Frontend Integration
```typescript
// Load enhanced route data
const response = await fetch('/api/routes');
const { routes } = await response.json();

routes.forEach(route => {
  console.log(`Route ${route.id}:`);
  console.log(`Progress: ${route.percent_completion}%`);
  console.log(`ETA: ${route.eta}`);
  console.log(`Position: ${route.train_coordinates.latitude}, ${route.train_coordinates.longitude}`);
});
```

### Database Migration
```sql
-- Run in Supabase SQL Editor:
ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS all_vehicle_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.routes 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

The system automatically calculates train progress based on:
- Time elapsed since `started_at`
- Train's effective speed (considering weight penalties)
- Total route distance through all stations
- Linear interpolation for exact coordinates

All calculations use the existing, proven functions from the Map and Station components, now refactored into reusable utilities.