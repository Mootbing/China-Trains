'use client';

import { useEffect, useState } from 'react';
import Track from '../components/Track';
import { Station } from '../utils/stations';
import locomotives from '../../../public/assets/data/locomotives.json';
import cars from '../../../public/assets/data/cars.json';

interface VehicleFromDB {
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
}

export default function StationPage({ station }: { station: Station }) {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);

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

            console.log('Detailed vehicle data:', detailedVehicles);
            setVehicles(detailedVehicles);
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

  return (
    <div className='relative overflow-hidden'>
      <Track 
        className="absolute bottom-0"
      />
    </div>
  );
}
