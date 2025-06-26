'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

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
            styles: [
              {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#7c93a3' }, { lightness: -10 }]
              },
              {
                featureType: 'administrative.country',
                elementType: 'geometry.stroke',
                stylers: [{ color: '#4b6878' }]
              },
              {
                featureType: 'water',
                elementType: 'geometry.fill',
                stylers: [{ color: '#0e1626' }]
              },
              {
                featureType: 'water',
                elementType: 'labels.text.fill',
                stylers: [{ color: '#4e6d70' }]
              }
            ]
          });

          const geocoderInstance = new google.maps.Geocoder();
          
          setMap(mapInstance);
          setGeocoder(geocoderInstance);

          // Add click listener to map
          mapInstance.addListener('click', async (event: google.maps.MapMouseEvent) => {
            if (event.latLng && geocoderInstance) {
              try {
                const response = await geocoderInstance.geocode({
                  location: event.latLng
                });

                if (response.results.length > 0) {
                  const result = response.results[0];
                  let locationName = 'Unknown Location';
                  
                  // Try to get the most relevant location name
                  for (const component of result.address_components) {
                    if (component.types.includes('locality') || 
                        component.types.includes('administrative_area_level_1') ||
                        component.types.includes('country')) {
                      locationName = component.long_name;
                      break;
                    }
                  }
                  
                  // If no specific locality found, use the formatted address
                  if (locationName === 'Unknown Location') {
                    locationName = result.formatted_address;
                  }

                  alert(`Closest location: ${locationName}`);
                  
                  // Add a marker at the clicked location
                  new google.maps.Marker({
                    position: event.latLng,
                    map: mapInstance,
                    title: locationName,
                    animation: google.maps.Animation.DROP
                  });
                } else {
                  alert('No location found at this point');
                }
              } catch (error) {
                console.error('Geocoding error:', error);
                alert('Error finding location');
              }
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
    <div className="h-screen w-screen">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
} 