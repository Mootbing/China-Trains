# API Documentation

This document describes the API routes that have been moved to the backend for better security and separation of concerns.

## Authentication API Routes

### POST `/api/auth/signin`
Initiates Google OAuth sign-in process.

**Request:**
```json
POST /api/auth/signin
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "url": "https://supabase.co/auth/v1/authorize?..."
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### POST `/api/auth/signout`
Signs out the current user.

**Request:**
```json
POST /api/auth/signout
Content-Type: application/json
```

**Response:**
```json
{
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### GET `/api/auth/session`
Gets the current user session.

**Request:**
```json
GET /api/auth/session
```

**Response:**
```json
{
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "user_metadata": {...}
    }
  },
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "user_metadata": {...}
  }
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Player Data API Routes

### GET `/api/player/data`
Gets the current player's data (money, XP). Level is calculated dynamically from XP.

**Request:**
```json
GET /api/player/data
```

**Response:**
```json
{
  "money": 10000,
  "xp": 500
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### PUT `/api/player/data`
Updates the current player's data.

**Request:**
```json
PUT /api/player/data
Content-Type: application/json

{
  "money": 15000,
  "xp": 750
}
```

**Response:**
```json
{
  "money": 15000,
  "xp": 750
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Stations API

### GET `/api/stations`

**Purpose**: Get all stations for the current user or check if a specific station exists

**Query Parameters**:
- `name` (optional): Station name to check for existence

**Response when no name provided (get all stations)**:
```json
{
  "stations": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "name": "Shanghai",
      "loc_name": "上海",
      "level": 1,
      "latitude": 31.2304,
      "longitude": 121.4737,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response when name provided (check specific station)**:
```json
{
  "exists": true,
  "station": {
    "id": "uuid",
    "user_id": "user-uuid",
    "name": "Shanghai",
    "loc_name": "上海",
    "level": 1,
    "latitude": 31.2304,
    "longitude": 121.4737,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST `/api/stations`
Creates a new station at a specific location.

**Request:**
```json
POST /api/stations
Content-Type: application/json

{
  "name": "Shanghai",
  "loc_name": "上海",
  "level": 1
}
```

**Response:**
```json
{
  "success": true,
  "station": {
    "id": "uuid",
    "user_id": "user-uuid",
    "name": "Shanghai",
    "loc_name": "上海",
    "level": 1,
    "latitude": 31.2304,
    "longitude": 121.4737,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "moneySpent": 10000,
  "remainingMoney": 5000
}
```

**Error Response:**
```json
{
  "error": "Insufficient funds",
  "required": 10000,
  "available": 5000
}
```

## Utility Functions

### Authentication Utilities (`/src/app/utils/auth.ts`)

The `authUtils` object provides the following functions:

- `getSession()`: Gets the current session
- `signInWithGoogle()`: Initiates Google OAuth sign-in
- `signOut()`: Signs out the current user

### Player Utilities (`/src/app/utils/player.ts`)

The `playerUtils` object provides the following functions:

- `getPlayerData()`: Gets the current player's data
- `updatePlayerData(playerData)`: Updates the player's data

### Station Utilities (`/src/app/utils/stations.ts`)

The `stationUtils` object provides the following functions:

- `checkStation(name)`: Checks if a station exists at a location
- `getAllStations()`: Fetches all stations for the current user
- `createStation(name, loc_name, level, latitude, longitude)`: Creates a new station with coordinates

## Middleware

The application uses Next.js middleware (`/src/middleware.ts`) to:

1. Refresh authentication sessions automatically
2. Protect API routes that require authentication
3. Handle session management at the request level

## Security Benefits

Moving authentication calls to the backend provides several security benefits:

1. **Server-side session management**: Sessions are managed on the server, reducing client-side exposure
2. **API route protection**: Middleware ensures only authenticated users can access protected routes
3. **Reduced client-side dependencies**: Less sensitive code runs in the browser
4. **Better error handling**: Server-side error handling prevents sensitive information leakage
5. **Centralized authentication logic**: All auth logic is centralized in API routes

## Database Schema

The application uses the following Supabase tables:

### `users` table
```sql
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    money INTEGER DEFAULT 10000,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note:** Level is calculated dynamically using the formula: `level = Math.floor(xp / 1000) + 1`

### `stations` table
```sql
CREATE TABLE stations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    loc_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `profiles` table
```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage Examples

### Frontend Authentication
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, signInWithGoogle, signOut } = useAuth();
  
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
}
```

### Frontend Player Data
```typescript
import { usePlayer } from '../contexts/PlayerContext';

function MyComponent() {
  const { player, addMoney, addXP } = usePlayer();
  
  const handleEarnMoney = () => {
    addMoney(1000);
  };
  
  const handleEarnXP = () => {
    addXP(100);
  };
  
  // Level is automatically calculated and available
  console.log(`Player level: ${player.level}`);
}
```

### Frontend Station Management
```typescript
import { stationUtils } from '../utils/stations';

// Load all user stations
async function loadUserStations() {
  const { stations, error } = await stationUtils.getAllStations();
  
  if (error) {
    console.error('Error loading stations:', error);
    return;
  }
  
  if (stations) {
    // Display stations on map
    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        // Create marker for each station
        new google.maps.Marker({
          position: { lat: station.latitude, lng: station.longitude },
          map: map,
          title: `${station.loc_name || station.name} Station (Level ${station.level})`
        });
      }
    });
  }
}

async function handleLocationClick(placeName: string, localizedName: string, latLng: google.maps.LatLng) {
  // Check if station exists
  const { exists, station } = await stationUtils.checkStation(placeName);
  
  if (exists) {
    console.log(`You own a Level ${station.level} station at ${station.loc_name || station.name}`);
  } else {
    // Create new station with localized name and coordinates
    const { success, station: newStation } = await stationUtils.createStation(
      placeName, 
      localizedName, 
      1,
      latLng.lat(),
      latLng.lng()
    );
    if (success) {
      console.log(`Station created at ${newStation.loc_name || newStation.name}`);
    }
  }
}
```

## Error Handling

All API routes return consistent error responses:

```json
{
  "error": "Descriptive error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (client error)
- `401`: Unauthorized (authentication required)
- `500`: Internal Server Error (server error)

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are used by the Supabase client in the API routes and middleware. 