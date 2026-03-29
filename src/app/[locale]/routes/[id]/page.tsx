'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import TrainRunning from '../../../pages/TrainRunning';

interface RoutePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function RoutePage({ params }: RoutePageProps) {
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/routes/${resolvedParams.id}`);
        const data = await response.json();

        if (response.ok) {
          setRoute(data.route);
        } else {
          setError(data.error || 'Failed to load route');
        }
      } catch (err) {
        setError('Failed to load route');
        console.error('Error fetching route:', err);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchRoute();
    }
  }, [resolvedParams.id]);

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="text-white text-xl mb-4">错误: {error}</div>
        <button
          onClick={handleBack}
          className="px-6 py-2 border border-white/30 rounded-lg text-white hover:bg-white/10 transition-colors"
        >
          返回地图
        </button>
      </div>
    );
  }

  return <TrainRunning route={route} onBack={handleBack} />;
}
