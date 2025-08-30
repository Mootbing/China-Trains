# Train Dispatch Functionality Setup

This document explains the train dispatch functionality that was implemented, allowing users to send off trains from stations along selected routes.

## Overview

The train dispatch system allows users to:
1. Drag and drop vehicles (locomotives and cars) onto the track at a station
2. Enter dispatching mode to select a route by clicking on stations on the map
3. Send off the train, which creates a route entry and moves vehicles from the station to the route

## Database Setup

### 1. Run the Database Schema

Execute the SQL script `routes-vehicles-setup.sql` in your Supabase SQL Editor to create the required tables:

```bash
# In Supabase SQL Editor, run:
china-railway/routes-vehicles-setup.sql
```

This creates:
- `routes` table: Stores train routes with station sequences
- `vehicles` table: Stores locomotives and cars owned by users

### 2. Database Schema Details

#### Routes Table
```sql
CREATE TABLE public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    all_station_ids UUID[] NOT NULL,           -- Sequential list of all stations in the route
    start_station_id UUID REFERENCES public.stations(id) NOT NULL,  -- First station
    end_station_id UUID REFERENCES public.stations(id) NOT NULL,    -- Last station
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Vehicles Table
```sql
CREATE TABLE public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    model TEXT NOT NULL,                       -- Model name (e.g., 'HXD1', 'YZ')
    type TEXT NOT NULL,                        -- 'locomotive' or 'car'
    station_id UUID REFERENCES public.stations(id),  -- NULL when on route
    route_id UUID REFERENCES public.routes(id),      -- NULL when at station
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: vehicle can be either at a station OR on a route, but not both
    CONSTRAINT vehicle_location_check CHECK (
        (station_id IS NOT NULL AND route_id IS NULL) OR 
        (station_id IS NULL AND route_id IS NOT NULL)
    )
);
```

## How It Works

### 1. Vehicle Management
- Vehicles are stored in the `vehicles` table with references to either a `station_id` or `route_id`
- When at a station, `station_id` is set and `route_id` is NULL
- When dispatched on a route, `station_id` is NULL and `route_id` is set

### 2. Station Interface
- Users can drag vehicles from their inventory onto the track
- The "发车" (Dispatch) button appears when at least one locomotive is on the track
- Clicking dispatch enters route selection mode on the map

### 3. Route Selection
- Users click stations on the map to build a sequential route
- The route display shows: Start Station → Selected Stations
- The "发车" button in dispatch mode sends off the train

### 4. Train Dispatch Process
When the train is dispatched:
1. Creates a new route entry with generated UUID
2. Stores the complete station sequence in `all_station_ids`
3. Sets `start_station_id` and `end_station_id`
4. Updates all selected vehicles:
   - Sets `station_id` to NULL
   - Sets `route_id` to the new route UUID

## API Endpoints

### POST `/api/routes/dispatch`
Dispatches a train on a selected route.

**Request Body:**
```json
{
  "vehicleIds": ["uuid1", "uuid2", "uuid3"],
  "allStationIds": ["station1", "station2", "station3"],
  "startStationId": "station1",
  "endStationId": "station3"
}
```

**Response:**
```json
{
  "success": true,
  "routeId": "route-uuid",
  "message": "Train dispatched successfully"
}
```

### GET `/api/player/vehicles?station_id=<uuid>`
Updated to include vehicle IDs needed for dispatch.

**Response:**
```json
[
  {
    "id": "vehicle-uuid",
    "model": "HXD1",
    "type": "locomotive"
  },
  {
    "id": "vehicle-uuid-2",
    "model": "YZ",
    "type": "car"
  }
]
```

## Code Changes Made

### 1. Station Component (`src/app/pages/Station.tsx`)
- Modified `onDispatch` prop to accept vehicle IDs
- Updated dispatch button to pass vehicle IDs from `trainConsist`
- Enhanced vehicle data handling to track database IDs

### 2. Map Component (`src/app/pages/Map.tsx`)
- Added `vehicleIds` state to store selected vehicles
- Implemented `handleSendoffTrain` function to call dispatch API
- Updated dispatch workflow to handle vehicle IDs

### 3. Vehicles API (`src/app/api/player/vehicles/route.ts`)
- Modified to return vehicle `id` field needed for dispatch

### 4. New Dispatch API (`src/app/api/routes/dispatch/route.ts`)
- Handles train dispatch logic
- Creates route entries and updates vehicle assignments
- Includes transaction-like error handling

## Testing the Implementation

### 1. Add Sample Vehicles
You can uncomment the sample data section in `routes-vehicles-setup.sql` to add test vehicles, or add them manually:

```sql
-- Add sample vehicles for testing
INSERT INTO public.vehicles (user_id, model, type, station_id) VALUES
    ('your-user-id', 'HXD1', 'locomotive', 'your-station-id'),
    ('your-user-id', 'YZ', 'car', 'your-station-id'),
    ('your-user-id', 'YZ', 'car', 'your-station-id');
```

### 2. Test Workflow
1. Navigate to a station where you have vehicles
2. Drag locomotive and cars onto the track
3. Click "发车" (Dispatch) button
4. Select destination stations on the map
5. Click "发车" in the dispatch overlay
6. Verify the train was dispatched successfully

### 3. Verify Database Changes
Check that:
- A new route was created in the `routes` table
- Vehicles were moved from `station_id` to `route_id`
- Station sequence is correctly stored

## Security Features

- Row Level Security (RLS) enabled on both tables
- Users can only access their own routes and vehicles
- API endpoints require authentication
- Input validation on all dispatch parameters

## Error Handling

The system includes comprehensive error handling:
- Validates vehicle ownership before dispatch
- Ensures minimum route requirements (2+ stations)
- Atomic operations (cleanup on failure)
- User-friendly error messages in Chinese

## Future Enhancements

Potential improvements could include:
- Train movement simulation along routes
- Route completion and vehicle return to stations
- Train scheduling and timing
- Route conflict detection
- Enhanced UI for route visualization 