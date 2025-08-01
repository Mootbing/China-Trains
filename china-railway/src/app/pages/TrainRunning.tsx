'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Track from '../components/Track';
import Train from '../components/Train';
import Locomotive from '../components/Locomotive';
import TrainCar from '../components/TrainCar';

interface TrainRunningProps {
  route: any;
  onBack: () => void;
}

interface TrainMetrics {
  totalWeight: number;
  maxWeight: number;
  maxSpeed: number;
  effectiveSpeed: number;
  isOverweight: boolean;
}

const TrainRunning: React.FC<TrainRunningProps> = ({ route, onBack }) => {
  const [showTimetable, setShowTimetable] = useState(false);
  const [vibrationOffset, setVibrationOffset] = useState({ x: 0, y: 0 });
  const router = useRouter();

  if (!route) {
    return (
      <div className='relative overflow-hidden h-screen'>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
            <p className="text-white text-lg text-bold">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate train performance metrics similar to Station.tsx
  const calculateTrainMetrics = (): TrainMetrics => {
    const vehicles = route.vehicles || [];
    const locomotives = vehicles.filter((vehicle: any) => 'max_speed' in vehicle && 'max_weight' in vehicle);
    const cars = vehicles.filter((vehicle: any) => !('max_speed' in vehicle));
    
    if (locomotives.length === 0) {
      return { totalWeight: 0, maxWeight: 0, maxSpeed: 0, effectiveSpeed: 0, isOverweight: false };
    }

    // Calculate total weight (locomotive + cars)
    const locomotiveWeight = locomotives.reduce((sum: number, loco: any) => sum + (loco.weight || 0), 0);
    const carWeight = cars.reduce((sum: number, car: any) => sum + (car.weight || 0), 0);
    const totalWeight = locomotiveWeight + carWeight;

    // Get max weight and speed from locomotives
    const maxWeight = locomotives.reduce((sum: number, loco: any) => sum + (loco.max_weight || 0), 0);
    const maxSpeed = Math.max(...locomotives.map((loco: any) => loco.max_speed || 0));

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

  // Add subtle vibration effect for high speeds
  useEffect(() => {
    if (trainMetrics.effectiveSpeed > 80) {
      const intensity = Math.min((trainMetrics.effectiveSpeed - 80) / 100, 1);
      const interval = setInterval(() => {
        setVibrationOffset({
          x: (Math.random() - 0.5) * intensity * 2,
          y: (Math.random() - 0.5) * intensity * 1
        });
      }, 50);

      return () => clearInterval(interval);
    } else {
      setVibrationOffset({ x: 0, y: 0 });
    }
  }, [trainMetrics.effectiveSpeed]);

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div 
      className='relative overflow-hidden h-screen w-screen bg-black'
      style={{
        // transform: `translate(${vibrationOffset.x}px, ${vibrationOffset.y}px)`,
        transition: 'none'
      }}
    >
      
      {/* Back Button */}
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

      {/* Top Right Button Container */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Timetable Button */}
        <button
          onClick={() => setShowTimetable(true)}
          className="bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
            />
          </svg>
          时刻表
        </button>
      </div>

      {/* Status Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 text-white px-6 py-2 rounded-lg">
        <h1 className="text-xl font-bold text-center">
          运行中 - {route.trainNumber || '列车'}
        </h1>
        {route.nextStation && (
          <div className="text-center mt-1">
            <p className="text-sm text-gray-300">下一站</p>
            <p className="text-lg font-semibold">
              {route.nextStation.loc_name || route.nextStation.name}站
            </p>
          </div>
        )}
        
        {/* Progress and metrics */}
        <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-white/20">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-blue-400">
              {route.percent_completion?.toFixed(1) || 0}%
            </span>
          </div>
          
          {trainMetrics.maxWeight > 0 && (
            <>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className={`text-xs ${trainMetrics.isOverweight ? 'text-red-400' : 'text-green-400'}`}>
                  {Math.round(trainMetrics.totalWeight / 1000)}t/{Math.round(trainMetrics.maxWeight / 1000)}t
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                <span className={`text-xs ${trainMetrics.isOverweight ? 'text-red-400' : 'text-green-400'}`}>
                  {Math.round(trainMetrics.effectiveSpeed)}km/h
                </span>
              </div>
            </>
          )}
          
          {route.eta && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-yellow-400">
                {route.eta}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Speed indicator */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/70 text-white px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${trainMetrics.effectiveSpeed > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-mono">
              {Math.round(trainMetrics.effectiveSpeed)} km/h
            </span>
          </div>
          {trainMetrics.isOverweight && (
            <div className="text-red-400 text-xs">
              超重
            </div>
          )}
        </div>
      </div>

      {/* Track with Train */}
      <div className="absolute bottom-0 w-full">
        <Track 
          className="bottom-50"
          electrified={true}
          speed={trainMetrics.effectiveSpeed}
          isMoving={true}
          train={
            route.vehicles && route.vehicles.length > 0 ? (
              <Train 
                consists={route.vehicles}
                scale={1}
                spacing={-10}
              />
            ) : null
          }
        />
      </div>

      {/* Timetable Modal */}
      {showTimetable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 border border-white/20 rounded-lg w-full h-full overflow-hidden">
            <div className="border-b border-white/20 p-4 bg-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">列车时刻表</h2>
              <button
                onClick={() => setShowTimetable(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-hidden h-full p-4">
              <div className="space-y-2">
                {route.timetable?.map((stop: any, index: number) => (
                  <div
                    key={stop.station?.id || index}
                    onClick={() => {
                      if (stop.station?.id) {
                        router.push(`/station/${stop.station.id}`);
                      }
                    }}
                    className={`flex justify-between items-center p-3 rounded-lg border border-white/10 transition-colors cursor-pointer ${
                      stop.isPassed 
                        ? 'bg-white/5 text-white/60 hover:bg-white/8' 
                        : stop.isNext 
                        ? 'bg-white/10 border-2 border-blue-400 text-white hover:bg-white/15' 
                        : 'bg-white/5 text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        stop.isPassed 
                          ? 'bg-gray-400' 
                          : stop.isNext 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-semibold">
                          {stop.station?.loc_name || stop.station?.name || '未知站点'}
                        </p>
                        {stop.distance && (
                          <p className="text-sm text-white/60">
                            {stop.distance.toFixed(1)} km
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {stop.estimatedArrival && (
                        <p className={`font-mono text-sm ${
                          stop.isPassed ? 'line-through text-white/40' : ''
                        }`}>
                          {stop.estimatedArrival}
                        </p>
                      )}
                      {stop.isNext && (
                        <p className="text-xs text-blue-400 font-semibold">
                          下一站
                        </p>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-white/60">
                    <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg">暂无时刻表信息</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-white/20 p-4 bg-white/5 flex justify-between items-center">
              {/* Train summary info */}
              <div className="text-sm text-white/60">
                {route.vehicles && (
                  <span>
                    共 {route.vehicles.length} 节车厢
                    {trainMetrics.totalWeight > 0 && (
                      <> · 总重 {Math.round(trainMetrics.totalWeight / 1000)}t</>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowTimetable(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainRunning;
