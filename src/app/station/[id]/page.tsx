'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { stationUtils, Station } from '../../utils/stations';
import StationPage from '../../pages/Station';

interface StationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function StationRoute({ params }: StationPageProps) {
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchStation = async () => {
      try {
        setLoading(true);
        const result = await stationUtils.getStationById(resolvedParams.id);
        
        if (result.error) {
          setError(result.error);
        } else if (result.station) {
          setStation(result.station);
        } else {
          setError('Station not found');
        }
      } catch (err) {
        setError('Failed to load station');
        console.error('Error fetching station:', err);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchStation();
    }
  }, [resolvedParams.id]);

  const handleBack = () => {
    router.push('/');
  };

  const handleDispatch = (startingStation: Station, vehicleIds?: number[], trainMetrics?: any) => {
    // Store dispatch information in localStorage for the map to pick up
    const dispatchData = {
      startingStation,
      vehicleIds: vehicleIds || [],
      trainMetrics,
      timestamp: Date.now()
    };
    
    localStorage.setItem('pendingDispatch', JSON.stringify(dispatchData));
    
    // Navigate back to map with dispatch parameter
    router.push('/?dispatch=true');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl font-bold">加载中...</div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl font-bold">
          {error || '车站未找到'}
        </div>
        <button 
          onClick={handleBack}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <StationPage 
      station={station} 
      onBack={handleBack}
      onDispatch={handleDispatch}
    />
  );
}
