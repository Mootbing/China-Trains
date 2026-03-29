'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { stationUtils, Station } from '../utils/stations';
import Dock from '../components/Dock';
import DockButton from '../components/DockButton';
import ArrivalBoard from '../components/ArrivalBoard';
import StationBoard from '../components/StationBoard';
import ShopBoard from '../components/ShopBoard';
import AchievementsBoard from '../components/AchievementsBoard';
import StationPurchaseModal from '../components/StationPurchaseModal';
import TrainDashboard from '../components/TrainDashboard';
import { calculateDistance, calculateOperatingCost, formatTime, Vehicle } from '../utils/route-utils';
import { useToast } from '../contexts/ToastContext';

interface PendingStation {
  placeName: string;
  locName: string;
  latLng: L.LatLng;
}

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import('leaflet')['default'] | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [userStations, setUserStations] = useState<Station[]>([]);
  const { signOut } = useAuth();
  const { player, addMoney, addXP } = usePlayer();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStation, setPendingStation] = useState<PendingStation | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    stationName: string;
    level: number;
    moneySpent: number;
    remainingMoney: number;
  } | undefined>(undefined);
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
  const [routePolylines, setRoutePolylines] = useState<L.Polyline[]>([]);
  const [existingRoutes, setExistingRoutes] = useState<any[]>([]);
  const [existingRoutePolylines, setExistingRoutePolylines] = useState<L.Polyline[]>([]);
  const [trainMarkers, setTrainMarkers] = useState<{[routeId: string]: L.Marker}>({});
  const [routeDataInterval, setRouteDataInterval] = useState<NodeJS.Timeout | null>(null);
  const [showArrivalBoard, setShowArrivalBoard] = useState(false);
  const [showStationBoard, setShowStationBoard] = useState(false);
  const [showTrainDashboard, setShowTrainDashboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);

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

  const [stationMarkers, setStationMarkers] = useState<L.CircleMarker[]>([]);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);

  const displayStationsOnMap = (stations: Station[], mapInstance: L.Map) => {
    const Leaf = leafletRef.current;
    if (!Leaf) return;

    // Clear existing station layer
    if (stationLayerRef.current) {
      stationLayerRef.current.clearLayers();
    } else {
      stationLayerRef.current = Leaf.layerGroup().addTo(mapInstance);
    }

    const markers: L.CircleMarker[] = [];

    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const position: L.LatLngExpression = [station.latitude, station.longitude];
        const displayName = station.loc_name || station.name;

        const baseSize = 3;
        const ringSpacing = 2;
        let currentSize = baseSize + (station.level + 1) * ringSpacing * 2;

        for (let i = 0; i < station.level; i++) {
          const isBlack = i % 2 === 1;

          const circle = Leaf.circleMarker(position, {
            radius: currentSize,
            fillColor: isBlack ? '#000000' : '#ffffff',
            fillOpacity: 1,
            color: '#000000',
            weight: 1
          });

          circle.bindTooltip(`${displayName} Station (Level ${station.level})`);
          (circle as any).stationData = station;

          if (i === 0) {
            markers.push(circle);
          }

          stationLayerRef.current!.addLayer(circle);
          currentSize -= ringSpacing * 2;
        }
      }
    });

    setStationMarkers(markers);
  };

  // Update station marker click listeners when dispatching state changes
  useEffect(() => {
    if (stationMarkers.length === 0) return;

    stationMarkers.forEach(marker => {
      marker.off('click');

      marker.on('click', () => {
        const station = (marker as any).stationData;

        if (isDispatching) {
          setSelectedRoute(prev => {
            const lastStation = prev[prev.length - 1];
            if (!lastStation || lastStation.id !== station.id) {
              return [...prev, station];
            }
            return prev;
          });
        } else {
          router.push(`/station/${station.id}`);
        }
      });
    });
  }, [isDispatching, stationMarkers, router]);

  const handleLocationClick = async (placeName: string, locName: string, latLng: L.LatLng) => {
    // Don't handle location clicks when in dispatching mode
    if (isDispatching) {
      return;
    }
    
    try {
      // Check if station already exists at this location
      const { exists, station, error } = await stationUtils.checkStation(placeName);
      
      if (error) {
        showToast(`Error checking station: ${error}`, 'error');
        return;
      }

      if (exists && station) {
        showToast(`You already own a Level ${station.level} station at ${station.loc_name || station.name}!`, 'info');
        return;
      }

      // Set pending station and open modal
      setPendingStation({ placeName, locName, latLng });
      setIsModalOpen(true);
      setIsPurchasing(false);
      setPurchaseSuccess(undefined);
    } catch (error) {
      console.error('Error handling location click:', error);
      showToast('An error occurred while processing your request.', 'error');
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
          latLng.lat,
          latLng.lng
        );

      if (createError) {
        showToast(`Failed to create station: ${createError}`, 'error');
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
          const updatedStations = [newStation, ...userStations];
          displayStationsOnMap(updatedStations, map);
        }
      }
    } catch (error) {
      console.error('Error confirming purchase:', error);
      showToast('An error occurred while processing your purchase.', 'error');
      setIsPurchasing(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPendingStation(null);
    setIsPurchasing(false);
    setPurchaseSuccess(undefined);
  };

  const navigateToStation = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleDispatch = (startingStation: Station, vehicleIdList: number[] = [], metrics?: any) => {
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

  const handleShowArrivalBoard = () => {
    setShowArrivalBoard(true);
  };

  const handleCloseArrivalBoard = () => {
    setShowArrivalBoard(false);
  };

  const handleShowStationBoard = () => {
    setShowStationBoard(true);
  };

  const handleCloseStationBoard = () => {
    setShowStationBoard(false);
  };

  const handleShowTrainDashboard = () => {
    setShowTrainDashboard(true);
  };

  const handleCloseTrainDashboard = () => {
    setShowTrainDashboard(false);
  };

  const handleShowShop = () => {
    setShowShop(true);
  };

  const handleCloseShop = () => {
    setShowShop(false);
  };

  const handleShowAchievements = () => {
    setShowAchievements(true);
  };

  const handleCloseAchievements = () => {
    setShowAchievements(false);
  };

  const handleSaveRoute = async () => {
    if (!startStation || selectedRoute.length === 0) return;
    const allStationIds = [startStation.id, ...selectedRoute.map(s => s.id)];
    const endStation = selectedRoute[selectedRoute.length - 1];
    const routeName = `${startStation.loc_name || startStation.name} → ${endStation.loc_name || endStation.name}`;

    try {
      const response = await fetch('/api/routes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          allStationIds,
          startStationId: startStation.id,
          endStationId: endStation.id,
        }),
      });
      if (response.ok) {
        showToast('路线已保存', 'success');
      } else {
        const data = await response.json();
        showToast(`保存失败: ${data.error}`, 'error');
      }
    } catch {
      showToast('保存路线时发生错误', 'error');
    }
  };

  const loadSavedRoutes = async () => {
    try {
      const response = await fetch('/api/routes/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedRoutes(data.savedRoutes || []);
      }
    } catch (error) {
      console.error('Error loading saved routes:', error);
    }
  };

  const handleLoadRoute = async (saved: any) => {
    // Load a saved route into the dispatch: set selectedRoute from saved station IDs
    const stationIds: string[] = saved.all_station_ids || [];
    if (stationIds.length < 2) return;

    // The first station in saved route should match startStation or we use it
    const matchedStations: Station[] = [];
    for (const id of stationIds.slice(1)) {
      const found = userStations.find(s => s.id === id);
      if (found) matchedStations.push(found);
    }

    if (matchedStations.length > 0) {
      setSelectedRoute(matchedStations);
      setShowSavedRoutes(false);
      showToast('路线已加载', 'success');
    } else {
      showToast('无法加载: 车站数据不匹配', 'error');
    }
  };

  const handleDeleteSavedRoute = async (id: string) => {
    try {
      const response = await fetch(`/api/routes/saved/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSavedRoutes(prev => prev.filter(r => r.id !== id));
        showToast('路线已删除', 'success');
      }
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleToggleSavedRoutes = async () => {
    if (!showSavedRoutes) {
      await loadSavedRoutes();
    }
    setShowSavedRoutes(prev => !prev);
  };

  const handleSelectStation = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleZoomToCoordinates = (latitude: number, longitude: number) => {
    if (map) {
      map.setView([latitude, longitude], 12);
    }
  };

  const handleDeleteLastStation = () => {
    setSelectedRoute(prev => prev.slice(0, -1));
  };

  const handleSendoffTrain = async () => {
    if (!startStation || selectedRoute.length === 0 || vehicleIds.length === 0) {
      showToast('请确保选择了起始站、路线和车辆', 'error');
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
        
        // Reset dispatching state
        setIsDispatching(false);
        setSelectedRoute([]);
        setStartStation(null);
        setVehicleIds([]);
        setTrainMetrics(null);
        clearRouteLines();
        
        // Use comprehensive refresh to show the new route and train marker
        await refreshAllRouteData();
        
        // Navigate to the route page
        router.push(`/routes/${result.routeId}`);
      } else {
        const error = await response.json();
        console.error('Dispatch failed:', error);
        showToast(`发车失败: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Error sending off train:', error);
      showToast('发车时发生错误', 'error');
    }
  };

  const handleViewStation = () => {
    if (purchaseSuccess) {
      // Find the newly created station from the userStations array
      const newStation = userStations.find(station => 
        (station.loc_name || station.name) === purchaseSuccess.stationName
      );
      
      if (newStation) {
        // Navigate to the station using the new URL-based routing
        navigateToStation(newStation.id);
        setIsModalOpen(false);
        setPendingStation(null);
        setPurchaseSuccess(undefined);
      }
    }
  };

  // Calculate journey metrics
  const calculateJourneyMetrics = () => {
    if (!startStation || selectedRoute.length === 0 || !trainMetrics) {
      return { totalDistance: 0, estimatedTime: 0, effectiveSpeed: 0, operatingCost: 0 };
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

    // Estimate operating cost: we know loco count from maxSpeed > 0 and car count from the rest
    // trainMetrics has maxWeight > 0 only if there are locomotives
    // We use a simple heuristic: total vehicles = vehicleIds.length
    // locos are ones with maxSpeed, cars are the rest
    // But we don't have vehicle details here, so we use the dispatch API formula:
    // cost = distance * (loco_count * 2 + car_count * 0.5)
    // We can estimate loco/car counts from vehicleIds if we had the data,
    // but for now approximate: if maxWeight > 0 there's at least 1 loco
    const totalVehicles = vehicleIds.length;
    // Rough estimate: vehicles contributing to maxWeight are locos
    const locoCount = trainMetrics.maxWeight > 0 ? Math.max(1, Math.round(totalVehicles * 0.3)) : 0;
    const carCount = totalVehicles - locoCount;
    const operatingCost = Math.round(totalDistance * (locoCount * 2 + carCount * 0.5));

    return { totalDistance, estimatedTime, effectiveSpeed, operatingCost };
  };

  // Function to draw route lines between connected stations
  const drawRouteLines = () => {
    const Leaf = leafletRef.current;
    if (!map || !Leaf || !isDispatching) return;

    routePolylines.forEach(polyline => map.removeLayer(polyline));
    setRoutePolylines([]);

    const allStations = startStation ? [startStation, ...selectedRoute] : selectedRoute;
    const newPolylines: L.Polyline[] = [];

    for (let i = 0; i < allStations.length - 1; i++) {
      const current = allStations[i];
      const next = allStations[i + 1];

      if (current.latitude && current.longitude && next.latitude && next.longitude) {
        const polyline = Leaf.polyline(
          [[current.latitude, current.longitude], [next.latitude, next.longitude]],
          { color: '#fff', opacity: 0.8, weight: 3 }
        ).addTo(map);

        newPolylines.push(polyline);
      }
    }

    setRoutePolylines(newPolylines);
  };

  // Function to clear route lines
  const clearRouteLines = () => {
    if (map) {
      routePolylines.forEach(polyline => map.removeLayer(polyline));
    }
    setRoutePolylines([]);
  };

  // Function to draw existing route lines
  const drawExistingRouteLines = (routes: any[], stations: Station[]) => {
    const Leaf = leafletRef.current;
    if (!map || !Leaf || isDispatching) return;

    existingRoutePolylines.forEach(polyline => map.removeLayer(polyline));
    setExistingRoutePolylines([]);

    const stationMap: { [key: string]: Station } = {};
    stations.forEach(station => {
      stationMap[station.id] = station;
    });

    const newPolylines: L.Polyline[] = [];

    routes.forEach(route => {
      const stationIds = route.all_station_ids || [];

      for (let i = 0; i < stationIds.length - 1; i++) {
        const currentStation = stationMap[stationIds[i]];
        const nextStation = stationMap[stationIds[i + 1]];

        if (currentStation && nextStation &&
            currentStation.latitude && currentStation.longitude &&
            nextStation.latitude && nextStation.longitude) {

          const polyline = Leaf.polyline(
            [[currentStation.latitude, currentStation.longitude], [nextStation.latitude, nextStation.longitude]],
            { color: '#fff', opacity: 0.6, weight: 2 }
          ).addTo(map);

          newPolylines.push(polyline);
        }
      }
    });

    setExistingRoutePolylines(newPolylines);
  };

  // Function to clear existing route lines
  const clearExistingRouteLines = () => {
    if (map) {
      existingRoutePolylines.forEach(polyline => map.removeLayer(polyline));
    }
    setExistingRoutePolylines([]);
  };

  // Function to display train markers on routes
  const displayTrainMarkers = (routes: any[]) => {
    const Leaf = leafletRef.current;
    if (!map || !Leaf || isDispatching) return;


    const activeRouteIds = new Set(routes.filter(route =>
      route.train_coordinates &&
      route.train_coordinates.latitude &&
      route.train_coordinates.longitude &&
      route.percent_completion < 100
    ).map(route => route.id));

    Object.keys(trainMarkers).forEach(routeId => {
      if (!activeRouteIds.has(routeId)) {
        map.removeLayer(trainMarkers[routeId]);
        const updatedMarkers = { ...trainMarkers };
        delete updatedMarkers[routeId];
        setTrainMarkers(updatedMarkers);
      }
    });

    const trainIcon = Leaf.icon({
      iconUrl: '/assets/svgs/dock/trains.svg',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const newTrainMarkers: {[routeId: string]: L.Marker} = { ...trainMarkers };

    routes.forEach(route => {
      if (route.train_coordinates &&
          route.train_coordinates.latitude &&
          route.train_coordinates.longitude &&
          route.percent_completion < 100) {

        let trainMarker = newTrainMarkers[route.id];

        if (!trainMarker) {
          trainMarker = Leaf.marker(
            [route.train_coordinates.latitude, route.train_coordinates.longitude],
            { icon: trainIcon, zIndexOffset: 1000 }
          ).addTo(map);

          trainMarker.bindTooltip(`Train ${route.id.substring(0, 8)} - ${route.percent_completion.toFixed(1)}% complete - ETA: ${route.eta}`);

          trainMarker.on('click', () => {
            router.push(`/routes/${route.id}`);
          });

          newTrainMarkers[route.id] = trainMarker;
        } else {
          trainMarker.setLatLng([route.train_coordinates.latitude, route.train_coordinates.longitude]);
          trainMarker.setTooltipContent(`Train ${route.id.substring(0, 8)} - ${route.percent_completion.toFixed(1)}% complete - ETA: ${route.eta}`);
        }

        (trainMarker as any).routeData = route;
      }
    });

    if (Object.keys(newTrainMarkers).length !== Object.keys(trainMarkers).length ||
        Object.keys(newTrainMarkers).some(id => !trainMarkers[id])) {
      setTrainMarkers(newTrainMarkers);
    }
  };



  // Function to clear train markers
  const clearTrainMarkers = () => {
    if (map) {
      Object.values(trainMarkers).forEach(marker => map.removeLayer(marker));
    }
    setTrainMarkers({});
  };

  // Comprehensive route data refresh function
  const refreshAllRouteData = async () => {
    if (!map || isDispatching) return;

    try {
      // Clear existing route visualizations
      clearExistingRouteLines();
      clearTrainMarkers();

      // Reload fresh route data
      const routes = await loadUserRoutes();

      // Auto-complete routes that are >= 100%
      if (routes) {
        for (const route of routes) {
          if (route.percent_completion >= 100 && !route.completed) {
            try {
              const res = await fetch(`/api/routes/${route.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete' }),
              });
              if (res.ok) {
                const data = await res.json();
                addMoney(data.money_earned);
                addXP(data.xp_earned);
                showToast(`列车到达 ${data.end_station}! +¥${data.money_earned.toLocaleString()} +${data.xp_earned} XP`, 'success');
              }
            } catch {
              // Will retry next refresh
            }
          }
        }
      }

      // Re-fetch after completions to get updated active routes
      const activeRoutes = await loadUserRoutes();

      if (activeRoutes && activeRoutes.length > 0 && userStations.length > 0) {
        drawExistingRouteLines(activeRoutes, userStations);
        displayTrainMarkers(activeRoutes);
      }
    } catch (error) {
      console.error('Error refreshing route data:', error);
    }
  };

  const journeyMetrics = calculateJourneyMetrics();

  // Handle URL parameters for station navigation
  useEffect(() => {
    const stationId = searchParams.get('station');
    if (stationId && userStations.length > 0) {
      const station = userStations.find(s => s.id === stationId);
      if (station) {
        router.push(`/station/${stationId}`);
      }
    }
  }, [searchParams, userStations, router]);

  // Handle pending dispatch from localStorage
  useEffect(() => {
    const dispatchParam = searchParams.get('dispatch');
    if (dispatchParam === 'true') {
      try {
        const pendingDispatchData = localStorage.getItem('pendingDispatch');
        if (pendingDispatchData) {
          const dispatchData = JSON.parse(pendingDispatchData);
          
          // Check if the data is recent (within 5 minutes to avoid stale data)
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          if (dispatchData.timestamp && dispatchData.timestamp > fiveMinutesAgo) {
            // Set up the dispatch state
            setIsDispatching(true);
            setStartStation(dispatchData.startingStation);
            setVehicleIds(dispatchData.vehicleIds || []);
            setTrainMetrics(dispatchData.trainMetrics || null);
            setSelectedRoute([]); // Start with empty route, user will select destination
            
            // Clear the localStorage data
            localStorage.removeItem('pendingDispatch');
            
            // Update URL to remove the dispatch parameter
            router.replace('/');
            
          } else {
            // Clear stale data
            localStorage.removeItem('pendingDispatch');
          }
        }
      } catch (error) {
        console.error('Error loading pending dispatch:', error);
        localStorage.removeItem('pendingDispatch');
      }
    }
  }, [searchParams, router]);
  
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

  useEffect(() => {
    if (!mapRef.current) return;

    // Prevent double-init if React strict mode re-runs the effect
    if ((mapRef.current as any)._leaflet_id) return;

    let mapInstance: L.Map;

    (async () => {
    const L = (await import('leaflet')).default;
    leafletRef.current = L;
    await import('leaflet/dist/leaflet.css');

    if (!mapRef.current || (mapRef.current as any)._leaflet_id) return;

    const chinaCenter: L.LatLngExpression = [39.9042, 116.4074];

    mapInstance = L.map(mapRef.current, {
      center: chinaCenter,
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark OpenStreetMap tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance);

    setMap(mapInstance);

    // Load data and set up click handler
    (async () => {
      const stations = await loadUserStations();
      if (stations && stations.length > 0) {
        displayStationsOnMap(stations, mapInstance);
      }

      const routes = await loadUserRoutes();
      if (routes && routes.length > 0 && stations && stations.length > 0) {
        drawExistingRouteLines(routes, stations);
        displayTrainMarkers(routes);
      }
    })();

    // Reverse-geocode clicks via Nominatim (free, no API key)
    mapInstance.on('click', async (e: L.LeafletMouseEvent) => {
      try {
        const { lat, lng } = e.latlng;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh,en&zoom=10`
        );
        const data = await res.json();

        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.county ||
          data.address?.state;

        if (city) {
          // Use the localized name from the response
          const placeName = data.name || city;
          const locName = city;
          handleLocationClick(placeName, locName, e.latlng);
        }
      } catch (error) {
        console.error('Reverse geocode failed:', error);
      }
    });

    })();

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, []);

  

  // Set up route data refresh every 5 minutes (only update mechanism)
  useEffect(() => {
    if (!isDispatching && map) {
      
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
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-black">
      {/* Map Container */}
      <div 
        className="w-full h-full"
      >
        <div
          ref={mapRef}
          className="w-full h-full absolute inset-0 z-0"
          style={{ minHeight: '100vh' }}
        />

        {/* Combined Dock with player stats and buttons */}
        {!isDispatching && (
          <Dock>
            <DockButton svgUrl="/assets/svgs/dock/routes.svg" label="线" onClick={handleShowArrivalBoard} />
            <DockButton svgUrl="/assets/svgs/dock/stations.svg" label="站" onClick={handleShowStationBoard} />
            <DockButton svgUrl="/assets/svgs/dock/trains.svg" label="库" onClick={handleShowTrainDashboard} />
            <DockButton svgUrl="/assets/svgs/dock/routes.svg" label="店" onClick={handleShowShop} />
            <DockButton svgUrl="/assets/svgs/dock/stations.svg" label="功" onClick={handleShowAchievements} />
            <DockButton svgUrl="/assets/svgs/dock/logout.svg" label="退" onClick={handleLogout} />
          </Dock>
        )}
      </div>

      {/* Station Purchase Modal */}
      <StationPurchaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPurchase}
        stationName={pendingStation?.locName || pendingStation?.placeName || ''}
        stationCost={10000 + (userStations.length * 2000)}
        currentMoney={player.money}
        isPurchasing={isPurchasing}
        purchaseSuccess={purchaseSuccess}
        onViewStation={handleViewStation}
      />

      {/* Arrival Board */}
      <ArrivalBoard
        isOpen={showArrivalBoard}
        onClose={handleCloseArrivalBoard}
        stations={userStations}
      />

      {/* Station Board */}
      <StationBoard
        isOpen={showStationBoard}
        onClose={handleCloseStationBoard}
        onSelectStation={handleSelectStation}
        onZoomToCoordinates={handleZoomToCoordinates}
      />

      {/* Train Dashboard */}
      <TrainDashboard
        isOpen={showTrainDashboard}
        onClose={handleCloseTrainDashboard}
      />

      {/* Shop Board */}
      <ShopBoard
        isOpen={showShop}
        onClose={handleCloseShop}
      />

      {/* Achievements Board */}
      <AchievementsBoard
        isOpen={showAchievements}
        onClose={handleCloseAchievements}
      />

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
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-bold">¥</span>
                  {journeyMetrics.operatingCost.toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          {/* Save / Load Route Buttons */}
          <div className="flex gap-2 mt-3">
            {selectedRoute.length > 0 && (
              <button
                onClick={handleSaveRoute}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors border border-white/20"
              >
                保存路线
              </button>
            )}
            <button
              onClick={handleToggleSavedRoutes}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors border border-white/20"
            >
              加载路线
            </button>
          </div>

          {/* Saved Routes Dropdown */}
          {showSavedRoutes && (
            <div className="mt-2 max-h-32 overflow-y-auto bg-black/80 border border-white/20 rounded">
              {savedRoutes.length === 0 ? (
                <p className="text-white/40 text-xs p-2 text-center">暂无保存的路线</p>
              ) : (
                savedRoutes.map((saved: any) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                  >
                    <button
                      onClick={() => handleLoadRoute(saved)}
                      className="flex-1 text-left text-xs text-white/80 truncate"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedRoute(saved.id)}
                      className="ml-2 text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
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

    </div>
  );
} 