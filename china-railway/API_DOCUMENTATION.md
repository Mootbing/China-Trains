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