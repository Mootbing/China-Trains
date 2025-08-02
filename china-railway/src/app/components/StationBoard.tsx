'use client';

import { useEffect, useState } from 'react';
import { Station } from '../utils/stations';

interface StationBoardProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (stationId: string) => void;
  onZoomToCoordinates?: (latitude: number, longitude: number) => void;
}

export default function StationBoard({ isOpen, onClose, onSelectStation, onZoomToCoordinates }: StationBoardProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationVehicleCounts, setStationVehicleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'level' | 'location' | 'vehicles'>('level');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Load all stations and vehicle counts
  const loadStations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (response.ok) {
        // The API might return stations directly or in a wrapper object
        const stationsData = data.stations || data;
        if (Array.isArray(stationsData)) {
          setStations(stationsData);
          
          // Load vehicle counts for each station
          await loadVehicleCounts(stationsData);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
    setLoading(false);
  };

  // Load vehicle counts for all stations
  const loadVehicleCounts = async (stationsData: Station[]) => {
    try {
      const vehicleCounts: Record<string, number> = {};
      
      // Get all vehicles without station filter to count them per station
      const response = await fetch('/api/player/vehicles');
      if (response.ok) {
        const vehicles = await response.json();
        
        // Count vehicles per station
        stationsData.forEach(station => {
          const stationVehicles = vehicles.filter((vehicle: any) => vehicle.station_id === station.id);
          vehicleCounts[station.id] = stationVehicles.length;
        });
        
        setStationVehicleCounts(vehicleCounts);
      }
    } catch (error) {
      console.error('Error loading vehicle counts:', error);
    }
  };

  // Load stations when component opens
  useEffect(() => {
    if (isOpen) {
      loadStations();
    }
  }, [isOpen]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-gray-400';
      case 2: return 'text-blue-400';
      case 3: return 'text-green-400';
      case 4: return 'text-yellow-400';
      case 5: return 'text-purple-400';
      default: return 'text-white';
    }
  };

  const getLevelText = (level: number) => {
    return `${level}等站`;
  };

  // Filter stations based on search term
  const filteredStations = stations.filter(station => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (station.loc_name || station.name).toLowerCase().includes(searchLower) ||
      station.name.toLowerCase().includes(searchLower) ||
      getLevelText(station.level).toLowerCase().includes(searchLower)
    );
  });

  // Sort stations based on current sort field and direction
  const sortedStations = [...filteredStations].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = (a.loc_name || a.name).localeCompare(b.loc_name || b.name);
        break;
      case 'level':
        comparison = a.level - b.level;
        break;
      case 'location':
        if (a.latitude && b.latitude) {
          comparison = a.latitude - b.latitude;
        }
        break;
      case 'vehicles':
        comparison = (stationVehicleCounts[a.id] || 0) - (stationVehicleCounts[b.id] || 0);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'name' | 'level' | 'location' | 'vehicles') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'level' | 'location' | 'vehicles') => {
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

  if (!isOpen) return null;

  const handleStationClick = (station: Station) => {
    onSelectStation(station.id);
    onClose();
  };

  const handleCoordinateClick = (latitude: number, longitude: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent station selection
    if (onZoomToCoordinates) {
      onZoomToCoordinates(latitude, longitude);
      onClose();
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
                车站
              </h2>
              <p className="text-sm text-white/60 mt-1">
                共 {stations.length} 站
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
                placeholder="搜索车站名称或等级..."
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
          ) : sortedStations.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg">
                {searchTerm ? '未找到匹配的车站' : '暂无车站'}
              </p>
              {searchTerm ? (
                <p className="text-sm text-white/40 mt-1">
                  尝试使用不同的搜索词
                </p>
              ) : (
                <p className="text-sm text-white/40 mt-1">
                  在地图上点击城市来购买车站
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-white/5 rounded-lg text-sm font-medium text-white/80">
                <button
                  onClick={() => handleSort('name')}
                  className="col-span-4 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  车站名称
                  {getSortIcon('name')}
                </button>
                <button
                  onClick={() => handleSort('level')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  等级
                  {getSortIcon('level')}
                </button>
                <button
                  onClick={() => handleSort('vehicles')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  车辆数
                  {getSortIcon('vehicles')}
                </button>
                <button
                  onClick={() => handleSort('location')}
                  className="col-span-4 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  位置
                  {getSortIcon('location')}
                </button>
              </div>

              {/* Station Rows */}
              {sortedStations.map((station) => (
                <div
                  key={station.id}
                  className="grid grid-cols-12 gap-4 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer"
                  onClick={() => handleStationClick(station)}
                >
                  <div className="col-span-4">
                    <div className="text-white font-medium">
                      {station.loc_name || station.name}
                    </div>
                    {station.loc_name && station.name !== station.loc_name && (
                      <div className="text-white/60 text-sm">
                        {station.name}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <span className={`${getLevelColor(station.level)} font-medium`}>
                      {getLevelText(station.level)}
                    </span>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="text-/60 font-medium">
                        {stationVehicleCounts[station.id] || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6h3l3 3v6H5V9l3-3h3V6z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-4">
                    <div 
                      className="text-white/70 text-sm font-mono hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                      onClick={(e) => station.latitude && station.longitude && handleCoordinateClick(station.latitude, station.longitude, e)}
                      title="点击缩放到此位置"
                    >
                      {station.latitude?.toFixed(3)}, {station.longitude?.toFixed(3)}
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
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>1等站</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span>2等站</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>3等站</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>4等站</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span>5等站</span>
              </div>
            </div>
            <div>
              总计: {stations.length} 个车站
              {Object.keys(stationVehicleCounts).length > 0 && (
                <span className="ml-4">
                  车辆: {Object.values(stationVehicleCounts).reduce((sum, count) => sum + count, 0)} 辆
                </span>
              )}
              {searchTerm && (
                <span className="ml-4">
                  显示: {sortedStations.length} / {stations.length} 个车站
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
