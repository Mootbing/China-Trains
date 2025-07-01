# Journey Time Calculation Features

This document explains the journey time calculation features that display real-time travel estimates during train dispatch.

## Overview

The system now calculates and displays journey metrics when dispatching trains, showing:
- **Total Distance**: Calculated using Haversine formula between stations
- **Effective Speed**: Train speed after weight penalties (if any)  
- **Estimated Time**: Journey duration based on distance and speed

## Features Implemented

### 1. **Train Metrics Passing**
- Station component now passes calculated train metrics (weight, speed) to dispatch
- Metrics include: `totalWeight`, `maxWeight`, `maxSpeed`, `effectiveSpeed`, `isOverweight`

### 2. **Haversine Distance Calculation**
```typescript
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
```

### 3. **Journey Time Calculation**
- **Total Distance**: Sum of distances between all consecutive stations in route
- **Estimated Time**: `totalDistance / effectiveSpeed` (in hours)
- **Real-time Updates**: Recalculates as stations are added/removed from route

### 4. **Visual Display**
Format: `📍 120km | ⚡ 85km/h | ⏰ 1h24m32s`

Icons used:
- **📍 Distance Icon**: Location pin for total distance
- **⚡ Speed Icon**: Arrow for effective speed
- **⏰ Time Icon**: Clock for estimated travel time

## How It Works

### 1. **At Station (Before Dispatch)**
- User drags vehicles onto track
- System calculates train metrics (weight, speed, overweight penalties)
- Metrics are stored when user clicks "发车" (Dispatch)

### 2. **During Route Selection**
- User clicks stations on map to build route
- System calculates distance between each consecutive station pair
- Real-time updates show: distance, speed, estimated time
- Metrics appear in dispatch overlay under route display

### 3. **Distance Calculation Process**
```typescript
const allStations = [startStation, ...selectedRoute];
let totalDistance = 0;

for (let i = 0; i < allStations.length - 1; i++) {
  const current = allStations[i];
  const next = allStations[i + 1];
  
  if (current.latitude && current.longitude && next.latitude && next.longitude) {
    const segmentDistance = calculateDistance(
      current.latitude, current.longitude,
      next.latitude, next.longitude
    );
    totalDistance += segmentDistance;
  }
}
```

### 4. **Time Formatting**
```typescript
const formatTime = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${h}h${m}m${s}s`;
};
```

## Example Scenarios

### Scenario 1: Normal Load
- **Train**: HXD1 + 3x YZ cars
- **Route**: Beijing → Shanghai (1200km)
- **Speed**: 120km/h (no overweight penalty)
- **Display**: `📍 1200km | ⚡ 120km/h | ⏰ 10h0m0s`

### Scenario 2: Overweight Train
- **Train**: SS8 + 100x freight cars (overweight)
- **Route**: Guangzhou → Shenzhen (140km)  
- **Speed**: 82km/h (speed reduced due to overweight)
- **Display**: `📍 140km | ⚡ 82km/h | ⏰ 1h42m26s`

### Scenario 3: Multi-Stop Route
- **Train**: DF4 + 10x mixed cars
- **Route**: Chengdu → Chongqing → Wuhan → Beijing
- **Total Distance**: ~1850km (sum of all segments)
- **Display**: `📍 1850km | ⚡ 100km/h | ⏰ 18h30m0s`

## Testing

### 1. **Basic Journey**
1. Add locomotive + cars to track at station
2. Click "发车" to enter dispatch mode
3. Select destination station on map
4. Verify distance, speed, and time display correctly

### 2. **Multi-Stop Journey**
1. Dispatch train from Station A
2. Click Station B, then Station C, then Station D
3. Watch distance and time increase with each station
4. Verify calculations using console logs

### 3. **Overweight Train**
1. Create overweight train (exceed locomotive capacity)
2. Note reduced effective speed at station
3. Dispatch and select route
4. Verify time calculation uses reduced speed

## Debug Information

Console logs provide detailed metrics:
```javascript
Journey Metrics: {
  totalDistance: 1200.45,
  effectiveSpeed: 82.5,
  estimatedTime: 14.55,
  formattedTime: "14h33m0s",
  trainMetrics: { ... }
}
```

## Technical Notes

- **Accuracy**: Haversine formula gives great-circle distances (not actual rail routes)
- **Performance**: Calculations are lightweight and update in real-time
- **Error Handling**: Gracefully handles missing coordinates or invalid data
- **Precision**: Distances rounded to nearest km, times show seconds precision

## Future Enhancements

Potential improvements:
- **Rail Route Mapping**: Use actual rail distances instead of great-circle
- **Speed Zones**: Different speed limits for different track sections
- **Station Dwell Time**: Add time for stops at intermediate stations
- **Terrain Factors**: Hills, curves affecting speed
- **Weather Conditions**: Rain, snow affecting travel time 