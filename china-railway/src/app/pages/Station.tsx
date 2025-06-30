'use client';

import { useEffect, useState, useRef } from 'react';
import Track from '../components/Track';
import { Station } from '../utils/stations';
import locomotives from '../../../public/assets/data/locomotives.json';
import cars from '../../../public/assets/data/cars.json';

interface VehicleFromDB {
  model: string;
  type: string;
  image: string;
}

interface VehicleData {
  id: number;
  en_name: string;
  loc_name: string;
  model: string;
  weight: number;
  width: number;
  type: string;
  image: string;
}

interface GroupedVehicle {
  vehicle: VehicleData;
  count: number;
}

export default function StationPage({ station }: { station: Station }) {
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (station) {
      const fetchVehicles = async () => {
        try {
          const response = await fetch(`/api/player/vehicles?station_id=${station.id}`);
          if (response.ok) {
            const data: VehicleFromDB[] = await response.json();
            console.log('Vehicles at this station from DB:', data);

            const detailedVehicles = data.map((vehicle) => {
              let vehicleData;
              if (vehicle.type === 'locomotive') {
                vehicleData = (locomotives as VehicleData[]).find(
                  (loco) => loco.model === vehicle.model
                );
              } else if (vehicle.type === 'car') {
                vehicleData = (cars as VehicleData[]).find(
                  (car) => car.model === vehicle.model
                );
              }
              return vehicleData;
            }).filter(Boolean) as VehicleData[];

            const vehicleCounts = detailedVehicles.reduce((acc, vehicle) => {
              const model = vehicle.model;
              if (!acc[model]) {
                acc[model] = { vehicle: vehicle, count: 0 };
              }
              acc[model].count++;
              return acc;
            }, {} as Record<string, { vehicle: VehicleData; count: number }>);
        
            const grouped = Object.values(vehicleCounts);

            console.log('Grouped vehicle data:', grouped);
            setGroupedVehicles(grouped);
          } else {
            console.error('Failed to fetch vehicles');
          }
        } catch (error) {
          console.error('Error fetching vehicles:', error);
        }
      };

      fetchVehicles();
    }
  }, [station]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollableContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollableContainerRef.current.offsetLeft);
    setScrollLeft(scrollableContainerRef.current.scrollLeft);
    scrollableContainerRef.current.style.cursor = 'grabbing';
  };

  const onMouseLeave = () => {
    if (!scrollableContainerRef.current) return;
    setIsDragging(false);
    scrollableContainerRef.current.style.cursor = 'grab';
  };

  const onMouseUp = () => {
    if (!scrollableContainerRef.current) return;
    setIsDragging(false);
    scrollableContainerRef.current.style.cursor = 'grab';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; //scroll-fast
    scrollableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className='relative overflow-hidden h-screen'>
      <div
        ref={scrollableContainerRef}
        className="absolute bottom-20 w-full overflow-x-auto whitespace-nowrap py-4 cursor-grab"
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <div className="inline-flex space-x-4 px-4">
          {groupedVehicles.map(({ vehicle, count }, index) => (
            <div key={index} className="relative inline-block bg-white/5 p-2 rounded-lg shadow">
              {count > 1 && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white/10 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold z-10">
                  x{count}
                </div>
              )}
              <img
                src={`/${vehicle.image}`}
                alt={vehicle.en_name}
                className="h-24 object-contain"
              />
              <div className="text-center mt-2 text-sm font-semibold">{vehicle.en_name}</div>
            </div>
          ))}
        </div>
      </div>
      <Track 
        className="absolute bottom-0"
      />
    </div>
  );
}
