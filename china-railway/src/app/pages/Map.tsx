'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useAuth } from '../contexts/AuthContext';
import Dock from '../components/Dock';
import DockButton from '../components/DockButton';
import TopDock from '../components/TopDock';

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
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
              // global geometry (land, roads, parks…) now pure black
              {
                elementType: "geometry",
                stylers: [{ color: "#000000" }]
              },
              {
                elementType: "labels.text.stroke",
                stylers: [{ color: "#242f3e" }]
              },
              {
                elementType: "labels.text.fill",
                stylers: [{ color: "#fff" }]
              },
              {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#fff" }]
              },
              {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#fff" }]
              },
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
                stylers: [[{ visibility: "off" }]]
              },
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
              // ocean stays dark blue
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
              }
            ]
          });

          const geocoderInstance = new google.maps.Geocoder();
          
          setMap(mapInstance);
          setGeocoder(geocoderInstance);

          // Add click listener to map
          mapInstance.addListener('click', async (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              // Use Places API to find nearby places
              const service = new google.maps.places.PlacesService(mapInstance);
              const request = {
                location: event.latLng,
                radius: 15000, // 15km radius
                type: 'locality'
              };
              
              service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                  // Get the closest place
                  const closestPlace = results[0];
                  const placeName = closestPlace.name;
                  
                  alert(`Location: ${placeName}`);
                  
                  // Add a minimalistic marker at the clicked location
                  new google.maps.Marker({
                    position: event.latLng,
                    map: mapInstance,
                    title: placeName,
                    animation: google.maps.Animation.DROP,
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: '#ffffff',
                      fillOpacity: 1,
                      strokeColor: '#000000',
                      strokeWeight: 2
                    }
                  });
                } else {
                  alert('No location found at this point');
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();
  }, []);

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
    </div>
  );
} 