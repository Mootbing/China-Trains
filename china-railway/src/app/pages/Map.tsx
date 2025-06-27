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

  const displayStationsOnMap = (stations: Station[], mapInstance: google.maps.Map) => {
    stations.forEach(station => {
      if (station.latitude && station.longitude) {
        const position = new google.maps.LatLng(station.latitude, station.longitude);
        const displayName = station.loc_name || station.name;
        
        // Create alternating rings by stacking multiple markers
        const createStationMarkers = (level: number) => {
          const markers = [];
          const baseSize = 7;
          const ringSpacing = 1.5;
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

            // Add click listener to the largest marker (first one)
            if (i === 0) {
              marker.addListener('click', () => {
                setSelectedStation(station);
                setShowStationPage(true);
              });
            }
            
            markers.push(marker);
            currentSize -= ringSpacing * 2;
          }
          
          return markers;
        };
        
        createStationMarkers(station.level);
      }
    });
  };

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

        // Add a station marker on the map
        if (map) {
          const createStationMarkers = (level: number, position: google.maps.LatLng, title: string) => {
            const markers = [];
            const baseSize = 7;
            const ringSpacing = 1.5;
            let currentSize = baseSize + (level + 1) * ringSpacing * 2;
            
            for (let i = 0; i < level; i++) {
              const isBlack = i % 2 === 1; // Even indices are black, odd are white
              
              markers.push(new google.maps.Marker({
                position: position,
                map: map,
                title: title,
                animation: i === 0 ? google.maps.Animation.DROP : undefined, // Only animate the largest ring
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: currentSize,
                  fillColor: isBlack ? '#000000' : '#ffffff',
                  fillOpacity: 1,
                  strokeColor: '#000000',
                  strokeWeight: 1
                }
              }));
              
              currentSize -= ringSpacing * 2;
            }
            
            return markers;
          };
          
          createStationMarkers(newStation.level, latLng, `${displayStationName} Station (Level ${newStation.level})`);
        }

        // Set the selected station and show station page after a short delay
        setTimeout(() => {
          setSelectedStation(newStation);
          setShowStationPage(true);
          setIsModalOpen(false);
          setPendingStation(null);
          setPurchaseSuccess(undefined);
        }, 2000); // Show station page after 2 seconds
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
  };

  const handleViewStation = () => {
    if (purchaseSuccess && pendingStation) {
      // Create a station object from the pending station data
      const station: Station = {
        id: '', // This will be set by the API response
        user_id: '', // This will be set by the API
        name: pendingStation.placeName,
        loc_name: pendingStation.locName,
        level: 1,
        latitude: pendingStation.latLng.lat(),
        longitude: pendingStation.latLng.lng(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSelectedStation(station);
      setShowStationPage(true);
      setIsModalOpen(false);
      setPendingStation(null);
      setPurchaseSuccess(undefined);
    }
  };

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
                stylers: [{ color: "#ffffff" }]
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
                stylers: [{ color: "#6b9a76" }]
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

  // If showing station page, render it instead of the map
  if (showStationPage && selectedStation) {
    return (
      <StationPage 
        station={selectedStation} 
        onBack={handleBackToMap} 
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-black">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '100vh' }}
      />
      {/* Top Dock for player stats */}
      <TopDock />
      {/* Dock at the bottom */}
      <Dock>
        <DockButton svgUrl="/assets/svgs/dock/trains.svg" label="trains" />
        <DockButton svgUrl="/assets/svgs/dock/stations.svg" label="stations" />
        <DockButton svgUrl="/assets/svgs/dock/routes.svg" label="routes" />
        <DockButton svgUrl="/assets/svgs/dock/logout.svg" label="log out" onClick={handleLogout} />
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
      />
    </div>
  );
} 