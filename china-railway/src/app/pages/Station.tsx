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
  id: string;
  model: string;
  type: string;
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
  databaseIds: string[]; // Track all database IDs for this model
}

interface TrainMetrics {
  totalWeight: number;
  maxWeight: number;
  maxSpeed: number;
  effectiveSpeed: number;
  isOverweight: boolean;
}

export default function StationPage({ station, onBack, onDispatch }: { 
  station: Station; 
  onBack?: () => void;
  onDispatch?: (startingStation: Station, vehicleIds?: number[], trainMetrics?: TrainMetrics) => void;
}) {
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({});
  const [availableDatabaseIds, setAvailableDatabaseIds] = useState<Record<string, string[]>>({});
  const [trainConsist, setTrainConsist] = useState<(LocomotiveType | Car)[]>([]);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [draggedVehicle, setDraggedVehicle] = useState<VehicleData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Calculate train performance metrics
  const calculateTrainMetrics = () => {
    const locomotives = trainConsist.filter(vehicle => 'max_speed' in vehicle && 'max_weight' in vehicle) as LocomotiveType[];
    const cars = trainConsist.filter(vehicle => !('max_speed' in vehicle)) as Car[];
    
    if (locomotives.length === 0) {
      return { totalWeight: 0, maxWeight: 0, maxSpeed: 0, effectiveSpeed: 0, isOverweight: false };
    }

    // Calculate total weight (locomotive + cars)
    const locomotiveWeight = locomotives.reduce((sum, loco) => sum + loco.weight, 0);
    const carWeight = cars.reduce((sum, car) => sum + car.weight, 0);
    const totalWeight = locomotiveWeight + carWeight;

    // Get max weight and speed from locomotives
    const maxWeight = locomotives.reduce((sum, loco) => sum + loco.max_weight, 0);
    const maxSpeed = Math.max(...locomotives.map(loco => loco.max_speed));

    // Calculate effective speed based on weight
    let effectiveSpeed = maxSpeed;
    const isOverweight = totalWeight > maxWeight;
    
    if (isOverweight && maxWeight > 0) {
      const weightRatio = (totalWeight - maxWeight) / maxWeight;
      effectiveSpeed = Math.max(1, maxSpeed * (1 - weightRatio));
    }

    return { totalWeight, maxWeight, maxSpeed, effectiveSpeed, isOverweight };
  };

  const trainMetrics = calculateTrainMetrics();
  
  // Debug logging for train metrics
  useEffect(() => {
    if (trainMetrics.maxWeight > 0) {
      console.log('Train Metrics:', {
        totalWeight: trainMetrics.totalWeight,
        maxWeight: trainMetrics.maxWeight,
        maxSpeed: trainMetrics.maxSpeed,
        effectiveSpeed: trainMetrics.effectiveSpeed,
        isOverweight: trainMetrics.isOverweight,
        trainConsist: trainConsist.map(v => ({ model: v.model, weight: v.weight }))
      });
    }
  }, [trainConsist, trainMetrics]);
  
  // Check if there's at least one locomotive in the consist
  const hasLocomotive = trainConsist.some(vehicle => 
    'max_speed' in vehicle && 'max_weight' in vehicle
  );

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
                return { 
                  ...vehicleDataFound, 
                  is_locomotive,
                  database_id: vehicle.id // Store the database ID separately
                };
              }
              return undefined;
            }).filter(Boolean) as (VehicleData & { database_id: string })[];

            const vehicleCounts = detailedVehicles.reduce((acc, vehicle) => {
              const model = vehicle.model;
              if (!acc[model]) {
                acc[model] = { 
                  vehicle: vehicle, 
                  count: 0,
                  databaseIds: []
                };
              }
              acc[model].count++;
              acc[model].databaseIds.push((vehicle as any).database_id);
              return acc;
            }, {} as Record<string, GroupedVehicle>);
        
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
            
            // Initialize available counts and database IDs
            const initialCounts: Record<string, number> = {};
            const initialDatabaseIds: Record<string, string[]> = {};
            grouped.forEach(({ vehicle, count, databaseIds }) => {
              initialCounts[vehicle.model] = count;
              initialDatabaseIds[vehicle.model] = [...databaseIds];
            });
            setAvailableCounts(initialCounts);
            setAvailableDatabaseIds(initialDatabaseIds);
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
      // Get a specific database ID for this vehicle instance
      const availableIds = availableDatabaseIds[draggedVehicle.model];
      if (availableIds.length === 0) {
        console.error('No available database IDs for model:', draggedVehicle.model);
        return;
      }
      
      const selectedDatabaseId = availableIds[0]; // Take the first available ID
      console.log(`Dropping ${draggedVehicle.model}, selected database ID:`, selectedDatabaseId);
      console.log('Available IDs for model:', draggedVehicle.model, availableIds);
      
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
          database_id: selectedDatabaseId,
        } as LocomotiveType & { database_id: string };
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
          database_id: selectedDatabaseId,
        } as Car & { database_id: string };
      }

      setTrainConsist(prev => [...prev, newVehicle]);
      
      // Decrease available count and remove the used database ID
      setAvailableCounts(prev => ({
        ...prev,
        [draggedVehicle.model]: prev[draggedVehicle.model] - 1
      }));
      
      setAvailableDatabaseIds(prev => ({
        ...prev,
        [draggedVehicle.model]: prev[draggedVehicle.model].filter(id => id !== selectedDatabaseId)
      }));
      
      setDraggedVehicle(null);
    }
  };

  const handleTrainItemClick = (item: LocomotiveType | Car, index: number) => {
    // Remove the clicked item from the train
    setTrainConsist(prev => prev.filter((_, i) => i !== index));
    
    // Restore the count and database ID for this vehicle type
    const databaseId = (item as any).database_id;
    setAvailableCounts(prev => ({
      ...prev,
      [item.model]: prev[item.model] + 1
    }));
    
    setAvailableDatabaseIds(prev => ({
      ...prev,
      [item.model]: [...prev[item.model], databaseId]
    }));
  };

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
          返回
        </button>
      )}

      {/* Dispatch Button */}
      {hasLocomotive && onDispatch && (
        <button
          onClick={() => {
            const vehicleIds = trainConsist.map(vehicle => (vehicle as any).database_id || vehicle.id);
            console.log('Dispatching train with vehicle IDs:', vehicleIds);
            console.log('Train consist:', trainConsist);
            console.log('Train metrics being passed:', trainMetrics);
            onDispatch(station, vehicleIds, trainMetrics);
          }}
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
          发车
        </button>
      )}

      {/* Station Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/50 text-white px-6 py-2 rounded-lg">
        <h1 className="text-xl font-bold text-center">
          {station.loc_name || station.name}站
        </h1>
        <p className="text-sm text-gray-300 text-center">{station.level}等站</p>
        
        {/* Train Metrics Display */}
        {trainMetrics.maxWeight > 0 && (
          <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-white/20">
            {/* Weight Display */}
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <span className={`text-xs ${trainMetrics.isOverweight ? 'text-red-400' : 'text-green-400'}`}>
                {Math.round(trainMetrics.totalWeight / 1000)}t/{Math.round(trainMetrics.maxWeight / 1000)}t
              </span>
            </div>
            
            {/* Speed Display */}
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
              <span className={`text-xs ${trainMetrics.isOverweight ? 'text-red-400' : 'text-green-400'}`}>
                {Math.round(trainMetrics.effectiveSpeed)}km/h
              </span>
            </div>
          </div>
        )}
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
                alt={vehicle.loc_name}
                className="h-20 object-contain pointer-events-none"
              />
              <div className="text-center mt-2 text-sm font-semibold">{vehicle.loc_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
