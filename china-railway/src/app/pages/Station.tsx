'use client';

import { useEffect, useState, useRef } from 'react';
import Track from '../components/Track';
import Train from '../components/Train';
import { Station } from '../utils/stations';
import locomotives from '../../../public/assets/data/locomotives.json';
import cars from '../../../public/assets/data/cars.json';
import Locomotive from '../components/Locomotive';
import TrainCar from '../components/TrainCar';
import { Locomotive as LocomotiveType, Car } from '../utils/dataLoader';

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
  is_locomotive?: boolean;
}

interface GroupedVehicle {
  vehicle: VehicleData;
  count: number;
}

export default function StationPage({ station, onBack, onDispatch }: { 
  station: Station; 
  onBack?: () => void;
  onDispatch?: () => void;
}) {
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({});
  const [trainConsist, setTrainConsist] = useState<(LocomotiveType | Car)[]>([]);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [draggedVehicle, setDraggedVehicle] = useState<VehicleData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (station) {
      const fetchVehicles = async () => {
        try {
          const response = await fetch(`/api/player/vehicles?station_id=${station.id}`);
          if (response.ok) {
            const data: VehicleFromDB[] = await response.json();
            console.log('Vehicles at this station from DB:', data);

            const detailedVehicles = data.map((vehicle) => {
              let vehicleDataFound;
              let is_locomotive = false;

              if (vehicle.type === 'locomotive') {
                vehicleDataFound = (locomotives as VehicleData[]).find(
                  (loco) => loco.model === vehicle.model
                );
                is_locomotive = true;
              } else if (vehicle.type === 'car') {
                vehicleDataFound = (cars as VehicleData[]).find(
                  (car) => car.model === vehicle.model
                );
              }

              if (vehicleDataFound) {
                return { ...vehicleDataFound, is_locomotive };
              }
              return undefined;
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

            grouped.sort((a, b) => {
              const aIsLoco = a.vehicle.is_locomotive;
              const bIsLoco = b.vehicle.is_locomotive;

              if (aIsLoco && !bIsLoco) {
                return -1;
              }
              if (!aIsLoco && bIsLoco) {
                return 1;
              }

              return a.vehicle.en_name.localeCompare(b.vehicle.en_name);
            });

            console.log('Grouped vehicle data:', grouped);
            setGroupedVehicles(grouped);
            
            // Initialize available counts
            const initialCounts: Record<string, number> = {};
            grouped.forEach(({ vehicle, count }) => {
              initialCounts[vehicle.model] = count;
            });
            setAvailableCounts(initialCounts);
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

  const handleDragStart = (e: React.DragEvent, vehicle: VehicleData) => {
    setDraggedVehicle(vehicle);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!trackRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (draggedVehicle && availableCounts[draggedVehicle.model] > 0) {
      // Convert VehicleData to LocomotiveType or Car
      let newVehicle: LocomotiveType | Car;
      
      if (draggedVehicle.is_locomotive) {
        newVehicle = {
          id: draggedVehicle.id,
          en_name: draggedVehicle.en_name,
          loc_name: draggedVehicle.loc_name,
          model: draggedVehicle.model,
          max_speed: (locomotives as any[]).find(l => l.id === draggedVehicle.id)?.max_speed || 100,
          max_weight: (locomotives as any[]).find(l => l.id === draggedVehicle.id)?.max_weight || 1000000,
          weight: draggedVehicle.weight,
          width: draggedVehicle.width,
          type: draggedVehicle.type as 'electric' | 'diesel' | 'steam',
          image: draggedVehicle.image,
        } as LocomotiveType;
      } else {
        newVehicle = {
          id: draggedVehicle.id,
          en_name: draggedVehicle.en_name,
          loc_name: draggedVehicle.loc_name,
          model: draggedVehicle.model,
          type: draggedVehicle.type as 'passenger' | 'freight',
          weight: draggedVehicle.weight,
          width: draggedVehicle.width,
          type_info: (cars as any[]).find(c => c.id === draggedVehicle.id)?.type_info || {},
          image: draggedVehicle.image,
        } as Car;
      }

      setTrainConsist(prev => [...prev, newVehicle]);
      
      // Decrease available count
      setAvailableCounts(prev => ({
        ...prev,
        [draggedVehicle.model]: prev[draggedVehicle.model] - 1
      }));
      
      setDraggedVehicle(null);
    }
  };

  const handleTrainItemClick = (item: LocomotiveType | Car, index: number) => {
    // Remove the clicked item from the train
    setTrainConsist(prev => prev.filter((_, i) => i !== index));
    
    // Restore the count for this vehicle type
    setAvailableCounts(prev => ({
      ...prev,
      [item.model]: prev[item.model] + 1
    }));
  };

  // Check if there's at least one locomotive in the consist
  const hasLocomotive = trainConsist.some(vehicle => 
    'max_speed' in vehicle && 'max_weight' in vehicle
  );

  return (
    <div className='relative overflow-hidden h-screen'>
      
      {/* Back to Map Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18" 
            />
          </svg>
          Back to Map
        </button>
      )}

      {/* Dispatch Button */}
      {hasLocomotive && onDispatch && (
        <button
          onClick={onDispatch}
          className="absolute top-4 right-4 z-20 bg-green-600/80 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
          Dispatch Train
        </button>
      )}

      {/* Station Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 text-white px-6 py-2 rounded-lg">
        <h1 className="text-xl font-bold text-center">
          {station.loc_name || station.name} Station
        </h1>
        <p className="text-sm text-gray-300 text-center">Level {station.level}</p>
      </div>

      <div
        ref={trackRef}
        className={`absolute bottom-0 w-full transition-all duration-200 ${isDragOver ? 'bg-blue-500/20' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Track 
          // electrified={false}
          className="bottom-50"
          train={
            trainConsist.length > 0 ? (
              <Train 
                consists={trainConsist}
                scale={1}
                onClick={handleTrainItemClick}
                hoverable={true}
              />
            ) : null
          }
        />
      </div>

      <div
        ref={scrollableContainerRef}
        className="absolute bottom-0 w-full overflow-x-auto whitespace-nowrap py-4 cursor-grab"
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <div className="inline-flex space-x-4 px-4">
          {groupedVehicles
            .filter(({ vehicle }) => availableCounts[vehicle.model] > 0)
            .map(({ vehicle }, index) => (
            <div 
              key={index} 
              className="relative inline-block bg-white/5 p-2 rounded-lg shadow cursor-move"
              draggable
              onDragStart={(e) => handleDragStart(e, vehicle)}
            >
              {availableCounts[vehicle.model] > 1 && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white/10 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold z-10">
                  x{availableCounts[vehicle.model]}
                </div>
              )}
              <img
                src={`/${vehicle.image}`}
                alt={vehicle.en_name}
                className="h-20 object-contain pointer-events-none"
              />
              <div className="text-center mt-2 text-sm font-semibold">{vehicle.en_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
