'use client';

import { useEffect, useState } from 'react';
import { Station } from '../utils/stations';

interface RouteData {
  id: string;
  start_station_id: string;
  end_station_id: string;
  all_station_ids: string[];
  percent_completion: number;
  eta: string;
  started_at: string;
  train_coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ArrivalData {
  routeId: string;
  trainNumber: string;
  fromStation: string;
  arrivalTime: string;
  status: 'arriving' | 'departed' | 'in_transit';
  progress: number;
  platform?: string;
}

interface ArrivalBoardProps {
  isOpen: boolean;
  onClose: () => void;
  stationId?: string; // If provided, show arrivals for specific station; otherwise show all
  stations: Station[];
}

export default function ArrivalBoard({ isOpen, onClose, stationId, stations }: ArrivalBoardProps) {
  const [arrivals, setArrivals] = useState<ArrivalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [allStations, setAllStations] = useState<Station[]>(stations);
  const [sortField, setSortField] = useState<'trainNumber' | 'fromStation' | 'arrivalTime' | 'status' | 'progress'>('progress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Load all stations if we only have one station (from Station page)
  const loadAllStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (response.ok) {
        // The API might return stations directly or in a wrapper object
        const stationsData = data.stations || data;
        if (Array.isArray(stationsData)) {
          setAllStations(stationsData);
          return stationsData;
        }
      }
    } catch (error) {
      console.error('Error loading all stations:', error);
    }
    return stations;
  };

  // Get station name by ID (helper function, but we'll use inline lookups in loadArrivals for better control)
  const getStationName = (id: string) => {
    const station = allStations.find(s => s.id === id);
    return station ? (station.loc_name || station.name) : `Station ${id.substring(0, 8)}`;
  };

  // Load arrival data
  const loadArrivals = async () => {
    setLoading(true);
    try {
      // Always ensure we have all stations loaded, but only if we don't have them already
      let stationsToUse = allStations;
      if (allStations.length <= 1 || (stationId && !allStations.find(s => s.id === stationId))) {
        console.log('Loading all stations for arrival board...');
        stationsToUse = await loadAllStations();
      }
      
      const response = await fetch('/api/routes');
      const data = await response.json();
      
      if (response.ok && data.routes) {
        const processedArrivals: ArrivalData[] = [];
        
        console.log('Processing routes for arrival board:', data.routes.length);
        
        data.routes.forEach((route: RouteData) => {
          // Skip completed routes
          if (route.percent_completion >= 100) return;
          
          const stationIds = route.all_station_ids || [];
          // Removed verbose logging to reduce console spam
          
          // If showing specific station arrivals
          if (stationId) {
            const stationIndex = stationIds.indexOf(stationId);
            if (stationIndex > 0) { // Station is a destination in this route
              const fromStationId = stationIds[stationIndex - 1];
              const fromStation = stationsToUse.find(s => s.id === fromStationId);
              const fromStationName = fromStation ? (fromStation.loc_name || fromStation.name) : `Station ${fromStationId.substring(0, 8)}`;
              
              processedArrivals.push({
                routeId: route.id,
                trainNumber: `Train ${route.id.substring(0, 8)}`,
                fromStation: fromStationName,
                arrivalTime: route.eta,
                status: route.percent_completion > 90 ? 'arriving' : 'in_transit',
                progress: route.percent_completion
              });
            }
          } else {
            // Show all active routes
            if (stationIds.length >= 2) {
              const fromStationId = stationIds[0];
              const toStationId = stationIds[stationIds.length - 1];
              
              const fromStation = stationsToUse.find(s => s.id === fromStationId);
              const toStation = stationsToUse.find(s => s.id === toStationId);
              
              const fromStationName = fromStation ? (fromStation.loc_name || fromStation.name) : `Station ${fromStationId.substring(0, 8)}`;
              const toStationName = toStation ? (toStation.loc_name || toStation.name) : `Station ${toStationId.substring(0, 8)}`;
              
              processedArrivals.push({
                routeId: route.id,
                trainNumber: `Train ${route.id.substring(0, 8)}`,
                fromStation: `${fromStationName} → ${toStationName}`,
                arrivalTime: route.eta,
                status: route.percent_completion > 90 ? 'arriving' : 'in_transit',
                progress: route.percent_completion
              });
            }
          }
        });
        
        // Store unsorted arrivals, let component handle sorting
        setArrivals(processedArrivals);
      }
    } catch (error) {
      console.error('Error loading arrivals:', error);
    }
    setLoading(false);
  };

  // Update selected station when stationId changes
  useEffect(() => {
    if (stationId) {
      const station = allStations.find(s => s.id === stationId);
      setSelectedStation(station || null);
    } else {
      setSelectedStation(null);
    }
  }, [stationId, allStations]);

  // Update allStations when stations prop changes
  useEffect(() => {
    if (stations.length > allStations.length) {
      setAllStations(stations);
    }
  }, [stations]);

  // Load arrivals when component opens
  useEffect(() => {
    if (isOpen) {
      loadArrivals();
      // Refresh every 30 seconds
      const interval = setInterval(loadArrivals, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, stationId]); // Removed allStations dependency to prevent constant refetching

  if (!isOpen) return null;

  // Filter arrivals based on search term
  const filteredArrivals = arrivals.filter(arrival => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      arrival.trainNumber.toLowerCase().includes(searchLower) ||
      arrival.fromStation.toLowerCase().includes(searchLower) ||
      arrival.arrivalTime.toLowerCase().includes(searchLower) ||
      getStatusText(arrival.status).toLowerCase().includes(searchLower)
    );
  });

  // Sort arrivals based on current sort field and direction
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'trainNumber':
        comparison = a.trainNumber.localeCompare(b.trainNumber);
        break;
      case 'fromStation':
        comparison = a.fromStation.localeCompare(b.fromStation);
        break;
      case 'arrivalTime':
        // Simple string comparison for time format
        comparison = a.arrivalTime.localeCompare(b.arrivalTime);
        break;
      case 'status':
        const statusOrder = { 'arriving': 3, 'in_transit': 2, 'departed': 1 };
        comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        break;
      case 'progress':
        comparison = a.progress - b.progress;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'trainNumber' | 'fromStation' | 'arrivalTime' | 'status' | 'progress') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'trainNumber' | 'fromStation' | 'arrivalTime' | 'status' | 'progress') => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arriving': return 'text-green-400';
      case 'departed': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'arriving': return '即将到达';
      case 'departed': return '已发车';
      default: return '运行中';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black/90 border border-white/20 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/20 p-4 bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                {selectedStation 
                  ? `${selectedStation.loc_name || selectedStation.name} 到达信息` 
                  : '线路运行状态'}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {selectedStation 
                  ? '显示即将到达此站的列车信息'
                  : '显示所有运行中的列车线路'}
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索列车、车站或状态..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">加载中...</span>
            </div>
          ) : sortedArrivals.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg">
                {searchTerm ? '未找到匹配的结果' : (selectedStation ? '暂无列车到达此站' : '暂无运行中的列车')}
              </p>
              {searchTerm && (
                <p className="text-sm text-white/40 mt-1">
                  尝试使用不同的搜索词
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-white/5 rounded-lg text-sm font-medium text-white/80">
                <button
                  onClick={() => handleSort('trainNumber')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  列车
                  {getSortIcon('trainNumber')}
                </button>
                <button
                  onClick={() => handleSort('fromStation')}
                  className="col-span-4 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  {selectedStation ? '出发站' : '线路'}
                  {getSortIcon('fromStation')}
                </button>
                <button
                  onClick={() => handleSort('arrivalTime')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  到达时间
                  {getSortIcon('arrivalTime')}
                </button>
                <button
                  onClick={() => handleSort('status')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  状态
                  {getSortIcon('status')}
                </button>
                <button
                  onClick={() => handleSort('progress')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  进度
                  {getSortIcon('progress')}
                </button>
              </div>

              {/* Arrival Rows */}
              {sortedArrivals.map((arrival) => (
                <div
                  key={arrival.routeId}
                  className="grid grid-cols-12 gap-4 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                >
                  <div className="col-span-2">
                    <div className="font-mono text-white font-medium">
                      {arrival.trainNumber}
                    </div>
                  </div>
                  
                  <div className="col-span-4">
                    <div className="text-white/90">
                      {arrival.fromStation}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="text-white/90 font-mono">
                      {arrival.arrivalTime}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`${getStatusColor(arrival.status)} font-medium`}>
                      {getStatusText(arrival.status)}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-white/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            arrival.progress > 90 ? 'bg-green-400' : 'bg-yellow-400'
                          }`}
                          style={{ width: `${Math.min(arrival.progress, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-white/60 font-mono">
                        {arrival.progress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 p-4 bg-white/5">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>即将到达</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>运行中</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>已发车</span>
              </div>
            </div>
            <div>
              更新时间: {new Date().toLocaleTimeString()}
              {searchTerm && (
                <span className="ml-4">
                  显示: {sortedArrivals.length} / {arrivals.length} 条结果
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
