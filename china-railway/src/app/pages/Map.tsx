'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { stationUtils, Station } from '../utils/stations';
import Dock from '../components/Dock';
import DockButton from '../components/DockButton';
import TopDock from '../components/TopDock';
import StationPurchaseModal from '../components/StationPurchaseModal';
import StationPage from './Station';

interface PendingStation {
  placeName: string;
  locName: string;
  latLng: google.maps.LatLng;
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [userStations, setUserStations] = useState<Station[]>([]);
  const { signOut } = useAuth();
  const { player, addMoney } = usePlayer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStation, setPendingStation] = useState<PendingStation | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    stationName: string;
    level: number;
    moneySpent: number;
    remainingMoney: number;
  } | undefined>(undefined);
  const [showStationPage, setShowStationPage] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Station[]>([]);
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [vehicleIds, setVehicleIds] = useState<number[]>([]);
  const [trainMetrics, setTrainMetrics] = useState<{
    totalWeight: number;
    maxWeight: number;
    maxSpeed: number;
    effectiveSpeed: number;
    isOverweight: boolean;
  } | null>(null);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>([]);
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);
  const [existingRoutePolylines, setExistingRoutePolylines] = useState<google.maps.Polyline[]>([]);
  const [trainMarkers, setTrainMarkers] = useState<{[routeId: string]: google.maps.Marker}>({});
  const [routeDataInterval, setRouteDataInterval] = useState<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const loadUserStations = async () => {
    try {
      const { stations, error } = await stationUtils.getAllStations();
      
      if (error) {
        console.error('Error loading stations:', error);
        return;
      }

      if (stations) {
        setUserStations(stations);
        return stations;
      }
    } catch (error) {
      console.error('Error loading user stations:', error);
    }
    return [];
  };

  const loadUserRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      const data = await response.json();
      
      if (response.ok) {
        const routes = data.routes || [];
        setExistingRoutes(routes);
        return routes;
      } else {
        console.error('Error loading routes:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading user routes:', error);
      return [];
    }
  };

  const [stationMarkers, setStationMarkers] = useState<google.maps.Marker[]>([]);

  const displayStationsOnMap = (stations: Station[], mapInstance: google.maps.Map) => {
    const markers: google.maps.Marker[] = [];
    
    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const position = new google.maps.LatLng(station.latitude, station.longitude);
        const displayName = station.loc_name || station.name;
        
        // Create alternating rings by stacking multiple markers
        const createStationMarkers = (level: number) => {
          const stationMarkers = [];
          const baseSize = 3;
          const ringSpacing = 2;
          let currentSize = baseSize + (level + 1) * ringSpacing * 2;
          
          for (let i = 0; i < level; i++) {
            const isBlack = i % 2 === 1; // Even indices are black, odd are white
            
            const marker = new google.maps.Marker({
              position: position,
              map: mapInstance,
              title: `${displayName} Station (Level ${station.level})`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: currentSize,
                fillColor: isBlack ? '#000000' : '#ffffff',
                fillOpacity: 1,
                strokeColor: '#000000',
                strokeWeight: 1
              }
            });

            // Store station data on marker for click handling
            (marker as any).stationData = station;

            // Add click listener to the largest marker (first one)
            if (i === 0) {
              markers.push(marker); // Store clickable markers
            }
            
            stationMarkers.push(marker);
            currentSize -= ringSpacing * 2;
          }
          
          return stationMarkers;
        };
        
        createStationMarkers(station.level);
      }
    });
    
    setStationMarkers(markers);
  };

  // Update station marker click listeners when dispatching state changes
  useEffect(() => {
    stationMarkers.forEach(marker => {
      // Clear existing listeners
      google.maps.event.clearListeners(marker, 'click');
      
      // Add new listener with current dispatching state
      marker.addListener('click', () => {
        const station = (marker as any).stationData;
        if (isDispatching) {
          // Add station to route if not already the last station selected
          setSelectedRoute(prev => {
            const lastStation = prev[prev.length - 1];
            if (!lastStation || lastStation.id !== station.id) {
              return [...prev, station];
            }
            return prev; // Don't add duplicate consecutive stations
          });
        } else {
          setSelectedStation(station);
          setShowStationPage(true);
        }
      });
    });
  }, [isDispatching, stationMarkers]);

  const handleLocationClick = async (placeName: string, locName: string, latLng: google.maps.LatLng) => {
    try {
      // Check if station already exists at this location
      const { exists, station, error } = await stationUtils.checkStation(placeName);
      
      if (error) {
        alert(`Error checking station: ${error}`);
        return;
      }

      if (exists && station) {
        alert(`You already own a Level ${station.level} station at ${station.loc_name || station.name}!`);
        return;
      }

      // Set pending station and open modal
      setPendingStation({ placeName, locName, latLng });
      setIsModalOpen(true);
      setIsPurchasing(false);
      setPurchaseSuccess(undefined);
    } catch (error) {
      console.error('Error handling location click:', error);
      alert('An error occurred while processing your request.');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!pendingStation) return;

    try {
      setIsPurchasing(true);
      const { placeName, locName, latLng } = pendingStation;
      const stationCost = 10000;

      const { success, station: newStation, moneySpent, remainingMoney, error: createError } = 
        await stationUtils.createStation(
          placeName, 
          locName, 
          1,
          latLng.lat(),
          latLng.lng()
        );

      if (createError) {
        alert(`Failed to create station: ${createError}`);
        setIsPurchasing(false);
        return;
      }

      if (success && newStation && moneySpent !== undefined && remainingMoney !== undefined) {
        // Update player money in context (the API already updated the database)
        addMoney(-moneySpent);
        
        // Add new station to local state
        setUserStations(prev => [newStation, ...prev]);
        
        const displayStationName = newStation.loc_name || newStation.name;
        
        // Show success state in modal
        setPurchaseSuccess({
          stationName: displayStationName,
          level: newStation.level,
          moneySpent,
          remainingMoney
        });
        setIsPurchasing(false);

        // Refresh the station display on the map to include the new station with proper click listeners
        if (map) {
          displayStationsOnMap([newStation, ...userStations], map);
        }
      }
    } catch (error) {
      console.error('Error confirming purchase:', error);
      alert('An error occurred while processing your purchase.');
      setIsPurchasing(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingStation(null);
    setIsPurchasing(false);
    setPurchaseSuccess(undefined);
  };

  const handleBackToMap = () => {
    setShowStationPage(false);
    setSelectedStation(null);
    setIsDispatching(false);
    setSelectedRoute([]);
    setStartStation(null);
    setVehicleIds([]);
    setTrainMetrics(null);
  };

  const handleDispatch = (startingStation: Station, vehicleIdList: number[] = [], metrics?: any) => {
    setShowStationPage(false);
    setSelectedStation(null);
    setIsDispatching(true);
    setSelectedRoute([]);
    setStartStation(startingStation);
    setVehicleIds(vehicleIdList);
    setTrainMetrics(metrics || null);
  };

  const handleCancelDispatch = () => {
    setIsDispatching(false);
    setSelectedRoute([]);
    setStartStation(null);
    setVehicleIds([]);
    setTrainMetrics(null);
    clearRouteLines();
  };

  const handleDeleteLastStation = () => {
    setSelectedRoute(prev => prev.slice(0, -1));
  };

  const handleSendoffTrain = async () => {
    if (!startStation || selectedRoute.length === 0 || vehicleIds.length === 0) {
      alert('请确保选择了起始站、路线和车辆');
      return;
    }

    try {
      // Create array of all station IDs in order: start station + selected route
      const allStationIds = [startStation.id, ...selectedRoute.map(station => station.id)];
      
      const response = await fetch('/api/routes/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleIds,
          allStationIds,
          startStationId: allStationIds[0],
          endStationId: allStationIds[allStationIds.length - 1],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`列车已成功发车！路线ID: ${result.routeId}`);
        
        // Reset dispatching state
        setIsDispatching(false);
        setSelectedRoute([]);
        setStartStation(null);
        setVehicleIds([]);
        setTrainMetrics(null);
        clearRouteLines();
        
        // Use comprehensive refresh to show the new route and train marker
        await refreshAllRouteData();
      } else {
        const error = await response.json();
        alert(`发车失败: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending off train:', error);
      alert('发车时发生错误');
    }
  };

  const handleViewStation = () => {
    if (purchaseSuccess) {
      // Find the newly created station from the userStations array
      const newStation = userStations.find(station => 
        (station.loc_name || station.name) === purchaseSuccess.stationName
      );
      
      if (newStation) {
        setSelectedStation(newStation);
        setShowStationPage(true);
        setIsModalOpen(false);
        setPendingStation(null);
        setPurchaseSuccess(undefined);
      }
    }
  };

  // Haversine distance calculation function
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

  // Calculate journey metrics
  const calculateJourneyMetrics = () => {
    if (!startStation || selectedRoute.length === 0 || !trainMetrics) {
      return { totalDistance: 0, estimatedTime: 0, effectiveSpeed: 0 };
    }

    const allStations = [startStation, ...selectedRoute];
    let totalDistance = 0;

    // Calculate total distance using Haversine formula
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

    // Calculate estimated time (distance / speed)
    const effectiveSpeed = trainMetrics.effectiveSpeed;
    const estimatedTime = effectiveSpeed > 0 ? totalDistance / effectiveSpeed : 0; // Time in hours

    return { totalDistance, estimatedTime, effectiveSpeed };
  };

  // Format time as hours, minutes, seconds
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  // Function to draw route lines between connected stations
  const drawRouteLines = () => {
    if (!map || !isDispatching) return;

    // Clear existing polylines
    routePolylines.forEach(polyline => polyline.setMap(null));
    setRoutePolylines([]);

    // Create new polylines for the current route
    const allStations = startStation ? [startStation, ...selectedRoute] : selectedRoute;
    const newPolylines: google.maps.Polyline[] = [];

    for (let i = 0; i < allStations.length - 1; i++) {
      const current = allStations[i];
      const next = allStations[i + 1];

      if (current.latitude && current.longitude && next.latitude && next.longitude) {
        const polyline = new google.maps.Polyline({
          path: [
            { lat: current.latitude, lng: current.longitude },
            { lat: next.latitude, lng: next.longitude }
          ],
          geodesic: true,
          strokeColor: '#fff', // Green color for route lines
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: map
        });

        newPolylines.push(polyline);
      }
    }

    setRoutePolylines(newPolylines);
  };

  // Function to clear route lines
  const clearRouteLines = () => {
    routePolylines.forEach(polyline => polyline.setMap(null));
    setRoutePolylines([]);
  };

  // Function to draw existing route lines
  const drawExistingRouteLines = (routes: any[], stations: Station[]) => {
    if (!map || isDispatching) return;

    // Clear existing route polylines
    existingRoutePolylines.forEach(polyline => polyline.setMap(null));
    setExistingRoutePolylines([]);

    // Create a map for quick station lookup by ID
    const stationMap: { [key: string]: Station } = {};
    stations.forEach(station => {
      stationMap[station.id] = station;
    });

    const newPolylines: google.maps.Polyline[] = [];

    routes.forEach(route => {
      const stationIds = route.all_station_ids || [];
      
      // Draw lines between each adjacent pair of stations in the route
      for (let i = 0; i < stationIds.length - 1; i++) {
        const currentStation = stationMap[stationIds[i]];
        const nextStation = stationMap[stationIds[i + 1]];

        if (currentStation && nextStation && 
            currentStation.latitude && currentStation.longitude && 
            nextStation.latitude && nextStation.longitude) {
          
          const polyline = new google.maps.Polyline({
            path: [
              { lat: currentStation.latitude, lng: currentStation.longitude },
              { lat: nextStation.latitude, lng: nextStation.longitude }
            ],
            geodesic: true,
            strokeColor: '#fff', // Green color for existing routes
            strokeOpacity: 0.6,
            strokeWeight: 2,
            map: map
          });

          newPolylines.push(polyline);
        }
      }
    });

    setExistingRoutePolylines(newPolylines);
  };

  // Function to clear existing route lines
  const clearExistingRouteLines = () => {
    existingRoutePolylines.forEach(polyline => polyline.setMap(null));
    setExistingRoutePolylines([]);
  };

  // Function to display train markers on routes
  const displayTrainMarkers = (routes: any[]) => {
    if (!map || isDispatching) return;

    console.log(`Updating train markers for ${routes.length} routes`);

    // Track which routes are still active
    const activeRouteIds = new Set(routes.filter(route => 
      route.train_coordinates && 
      route.train_coordinates.latitude && 
      route.train_coordinates.longitude &&
      route.percent_completion < 100
    ).map(route => route.id));

    // Remove markers for routes that are no longer active
    Object.keys(trainMarkers).forEach(routeId => {
      if (!activeRouteIds.has(routeId)) {
        console.log(`Removing marker for completed/inactive route ${routeId}`);
        trainMarkers[routeId].setMap(null);
        
        // Remove from trainMarkers object
        const updatedMarkers = { ...trainMarkers };
        delete updatedMarkers[routeId];
        setTrainMarkers(updatedMarkers);
      }
    });

    const newTrainMarkers: {[routeId: string]: google.maps.Marker} = { ...trainMarkers };

    routes.forEach(route => {
      // Only show trains that have coordinate data and are in progress
      if (route.train_coordinates && 
          route.train_coordinates.latitude && 
          route.train_coordinates.longitude &&
          route.percent_completion < 100) {
        
        // Check if marker already exists for this route
        let trainMarker = newTrainMarkers[route.id];
        
        if (!trainMarker) {
          // Create new marker
          console.log(`Creating new train marker for route ${route.id}`);
          trainMarker = new google.maps.Marker({
            position: {
              lat: route.train_coordinates.latitude,
              lng: route.train_coordinates.longitude
            },
            map: map,
            title: `Train ${route.id.substring(0, 8)} - ${route.percent_completion.toFixed(1)}% complete - ETA: ${route.eta}`,
            icon: {
              url: '/assets/svgs/dock/trains.svg',
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            },
            zIndex: 1000 // Higher z-index to appear above route lines
          });

          // Add click listener to show route info
          trainMarker.addListener('click', () => {
            const routeInfo = `
              Route: ${route.start_station_id} → ${route.end_station_id}
              Progress: ${route.percent_completion.toFixed(1)}%
              ETA: ${route.eta}
              Started: ${new Date(route.started_at).toLocaleString()}
            `;
            
            // Create info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="font-family: monospace; font-size: 12px; white-space: pre-line;">${routeInfo}</div>`
            });
            
            infoWindow.open(map, trainMarker);
            
            // Close info window after 3 seconds
            setTimeout(() => {
              infoWindow.close();
            }, 3000);
          });

          newTrainMarkers[route.id] = trainMarker;
        } else {
          // Update existing marker position and title
          trainMarker.setPosition({
            lat: route.train_coordinates.latitude,
            lng: route.train_coordinates.longitude
          });
          trainMarker.setTitle(`Train ${route.id.substring(0, 8)} - ${route.percent_completion.toFixed(1)}% complete - ETA: ${route.eta}`);
        }

        // Store route data on marker
        (trainMarker as any).routeData = route;

        // Store route data for local calculations
        (trainMarker as any).routeData = route;
      }
    });

    // Update state only if there are changes
    if (Object.keys(newTrainMarkers).length !== Object.keys(trainMarkers).length ||
        Object.keys(newTrainMarkers).some(id => !trainMarkers[id])) {
      setTrainMarkers(newTrainMarkers);
    }
  };



  // Function to clear train markers
  const clearTrainMarkers = () => {
    Object.values(trainMarkers).forEach(marker => marker.setMap(null));
    setTrainMarkers({});
  };

  // Comprehensive route data refresh function
  const refreshAllRouteData = async () => {
    if (!map || isDispatching) return;

    try {
      console.log('Refreshing all route data from database...');
      
      // Clear existing route visualizations
      clearExistingRouteLines();
      clearTrainMarkers();
      
      // Reload fresh route data
      const routes = await loadUserRoutes();
      
      if (routes && routes.length > 0 && userStations.length > 0) {
        // Redraw route lines
        drawExistingRouteLines(routes, userStations);
        
        // Display train markers
        displayTrainMarkers(routes);
        
        console.log(`Refreshed ${routes.length} routes with train positions`);
      } else {
        console.log('No active routes found');
      }
    } catch (error) {
      console.error('Error refreshing route data:', error);
    }
  };

  const journeyMetrics = calculateJourneyMetrics();
  
  // Update route lines when route changes
  useEffect(() => {
    if (isDispatching) {
      drawRouteLines();
      clearExistingRouteLines(); // Hide existing routes when dispatching
      clearTrainMarkers(); // Hide train markers when dispatching
    } else {
      clearRouteLines();
      // Redraw existing routes when not dispatching
      if (existingRoutes.length > 0 && userStations.length > 0) {
        drawExistingRouteLines(existingRoutes, userStations);
        displayTrainMarkers(existingRoutes);
      }
    }
  }, [selectedRoute, startStation, isDispatching, map, existingRoutes, userStations]);

  // Debug logging for journey metrics
  useEffect(() => {
    if (isDispatching && journeyMetrics.totalDistance > 0) {
      console.log('Journey Metrics:', {
        totalDistance: journeyMetrics.totalDistance,
        effectiveSpeed: journeyMetrics.effectiveSpeed,
        estimatedTime: journeyMetrics.estimatedTime,
        formattedTime: formatTime(journeyMetrics.estimatedTime),
        trainMetrics: trainMetrics
      });
    }
  }, [selectedRoute, trainMetrics, isDispatching, journeyMetrics, formatTime]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places']
      });

      try {
        const google = await loader.load();
        
        if (mapRef.current) {
          // Start map in China (Beijing coordinates)
          const chinaCenter = { lat: 39.9042, lng: 116.4074 };
          
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: chinaCenter,
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            // Hide all UI controls
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'cooperative',
            styles: [
              // base map (land/roads/etc) all black
              {
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              // label outlines
              {
                elementType: "labels.text.stroke",
                stylers: [{ color: "#242f3e" }]
              },
              // default label fill
              {
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
              },
            
              // localities
              {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
              },
              // points of interest
              {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ visibility: "off" }]
              },
              // parks
              {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#263c3f" }]
              },
              {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [{ visibility: "off" }]
              },
            
              // roads
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }]
              },
              {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ visibility: "off" }]
              },
            
              // highways
              {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1f2835" }]
              },
              {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [{ visibility: "off" }]
              },
            
              // transit
              {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              {
                featureType: "transit.station",
                elementType: "labels.text.fill",
                stylers: [{ visibility: "off" }]
              },
            
              // water
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }]
              },
              {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#515c6d" }]
              },
              {
                featureType: "water",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#17263c" }]
              },
            
              // ───────────────────────────────────────────────────────
              // GLOBAL OVERRIDE: force every label's fill to white
              {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
              }
            ]
          });

          const geocoderInstance = new google.maps.Geocoder();
          
          setMap(mapInstance);
          setGeocoder(geocoderInstance);

          // Load and display user stations
          const stations = await loadUserStations();
          if (stations && stations.length > 0) {
            displayStationsOnMap(stations, mapInstance);
          }

          // Load and display existing routes
          const routes = await loadUserRoutes();
          if (routes && routes.length > 0 && stations && stations.length > 0) {
            drawExistingRouteLines(routes, stations);
            displayTrainMarkers(routes);
          }

          // Add click listener to map
          mapInstance.addListener('click', async (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              // Use Geocoder to get location information from coordinates
              geocoderInstance.geocode(
                { location: event.latLng },
                (results, status) => {
                  if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                    const result = results[0];
                    
                    // Find the locality (city) component
                    const localityComponent = result.address_components.find(
                      component => component.types.includes('locality')
                    );
                    
                    if (localityComponent) {
                      const cityName = localityComponent.long_name;
                      const cityNameShort = localityComponent.short_name;
                      
                      // Use the long name as the primary name and short name as localized name
                      // For Chinese cities, the short name is often in Chinese characters
                      const placeName = cityName;
                      const locName = cityNameShort !== cityName ? cityNameShort : cityName;
                      
                      // Handle station purchase logic
                      handleLocationClick(placeName, locName, event.latLng!);
                    }
                  }
                }
              );
            }
          });
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, []);

  

  // Set up route data refresh every 5 minutes (only update mechanism)
  useEffect(() => {
    if (!isDispatching && map) {
      console.log('Setting up 5-minute route data refresh');
      
      // Set up comprehensive refresh interval
      const interval = setInterval(() => {
        refreshAllRouteData();
      }, 300000); // Refresh every 5 minutes (300,000ms)

      setRouteDataInterval(interval);

      return () => {
        clearInterval(interval);
        setRouteDataInterval(null);
      };
    } else {
      // Clear interval if dispatching
      if (routeDataInterval) {
        clearInterval(routeDataInterval);
        setRouteDataInterval(null);
      }
    }
  }, [isDispatching, map]);

  // Cleanup route lines on component unmount
  useEffect(() => {
    return () => {
      clearRouteLines();
      clearExistingRouteLines();
      clearTrainMarkers();
      if (routeDataInterval) {
        clearInterval(routeDataInterval);
      }
      // Clear train markers
      Object.values(trainMarkers).forEach(marker => marker.setMap(null));
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-black">
      {/* Map Container */}
      <div 
        className={`w-full h-full ${showStationPage ? 'hidden' : 'block'}`}
      >
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ minHeight: '100vh' }}
        />
        {/* Top Dock for player stats */}
        {!isDispatching && <><TopDock />
        {/* Dock at the bottom */}
        <Dock>
          <DockButton svgUrl="/assets/svgs/dock/trains.svg" label="车" />
          <DockButton svgUrl="/assets/svgs/dock/stations.svg" label="站" />
          <DockButton svgUrl="/assets/svgs/dock/routes.svg" label="线" />
          <DockButton svgUrl="/assets/svgs/dock/logout.svg" label="退" onClick={handleLogout} />
        </Dock>

        {/* Station Purchase Modal */}
        <StationPurchaseModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmPurchase}
          stationName={pendingStation?.locName || pendingStation?.placeName || ''}
          stationCost={10000}
          currentMoney={player.money}
          isPurchasing={isPurchasing}
          purchaseSuccess={purchaseSuccess}
          onViewStation={handleViewStation}
        /></>}
      </div>

      {/* Dispatching Overlay */}
      {isDispatching && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg min-w-80">
          <h2 className="text-lg font-bold text-center">编辑线路</h2>
          
          {/* Route Display */}
          {startStation && (
            <div className="mt-3 p-2 bg-white/10 rounded">
              <p className="text-sm font-mono">
                <span>{startStation.loc_name || startStation.name}</span>
                {selectedRoute.length > 0 && (
                  <>
                    <span> → </span>
                    {selectedRoute.map((station, index) => (
                      <span key={station.id}>
                        {station.loc_name || station.name}
                        {index < selectedRoute.length - 1 && ' → '}
                      </span>
                    ))}
                  </>
                )}
                {selectedRoute.length === 0 && <span> → </span>}
              </p>
            </div>
          )}

          {/* Journey Metrics Display */}
          {trainMetrics && selectedRoute.length > 0 && journeyMetrics.totalDistance > 0 && (
            <div className="mt-3 p-2 bg-white/10 rounded">
              <div className="flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {Math.round(journeyMetrics.totalDistance)}km
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                  {Math.round(journeyMetrics.effectiveSpeed)}km/h
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {formatTime(journeyMetrics.estimatedTime)}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCancelDispatch}
              className="flex-1 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              取消
            </button>
            {selectedRoute.length > 0 && (
              <button
                onClick={handleDeleteLastStation}
                className="flex-1 bg-white/20 hover:bg-white/50 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                删
              </button>
            )}
            {selectedRoute.length > 0 && (
              <button
                onClick={handleSendoffTrain}
                className="flex-1 bg-green-500/80 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                发车
              </button>
            )}
          </div>
        </div>
      )}

      {/* Station Page Container */}
      {showStationPage && selectedStation && (
        <div className="absolute inset-0 z-50">
          <StationPage 
            station={selectedStation} 
            onBack={handleBackToMap}
            onDispatch={(startingStation, vehicleIdList, metrics) => handleDispatch(startingStation, vehicleIdList, metrics)}
          />
        </div>
      )}
    </div>
  );
} 