'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Station } from '../utils/stations';
import { useBoardAnimation } from '../hooks/useBoardAnimation';

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
  // Completed route fields
  completed_at?: string;
  money_earned?: number;
  xp_earned?: number;
  total_distance?: number;
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

interface CompletedRouteData {
  routeId: string;
  fromStation: string;
  distance: number;
  moneyEarned: number;
  xpEarned: number;
  completedAt: string;
}

interface ArrivalBoardProps {
  isOpen: boolean;
  onClose: () => void;
  stationId?: string; // If provided, show arrivals for specific station; otherwise show all
  stations: Station[];
}

export default function ArrivalBoard({ isOpen, onClose, stationId, stations }: ArrivalBoardProps) {
  const router = useRouter();
  const { mounted, phase } = useBoardAnimation(isOpen);
  const [arrivals, setArrivals] = useState<ArrivalData[]>([]);
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [allStations, setAllStations] = useState<Station[]>(stations);
  const [sortField, setSortField] = useState<'trainNumber' | 'fromStation' | 'arrivalTime' | 'status' | 'progress'>('progress');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Load all stations if we only have one station (from Station page)
  const loadAllStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();

      if (response.ok) {
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

  // Get station name by ID
  const getStationName = (id: string) => {
    const station = allStations.find(s => s.id === id);
    return station ? (station.loc_name || station.name) : `Station ${id.substring(0, 8)}`;
  };

  // Load arrival data
  const loadArrivals = async () => {
    setLoading(true);
    try {
      let stationsToUse = allStations;
      if (allStations.length <= 1 || (stationId && !allStations.find(s => s.id === stationId))) {
        stationsToUse = await loadAllStations();
      }

      const response = await fetch('/api/routes');
      const data = await response.json();

      if (response.ok && data.routes) {
        const processedArrivals: ArrivalData[] = [];

        data.routes.forEach((route: RouteData) => {
          if (route.percent_completion >= 100) return;

          const stationIds = route.all_station_ids || [];

          if (stationId) {
            const stationIndex = stationIds.indexOf(stationId);
            if (stationIndex > 0) {
              const fromStationId = stationIds[stationIndex - 1];
              const fromStation = stationsToUse.find(s => s.id === fromStationId);
              const fromStationName = fromStation ? (fromStation.loc_name || fromStation.name) : `Station ${fromStationId.substring(0, 8)}`;

              processedArrivals.push({
                routeId: route.id,
                trainNumber: `${route.id.substring(0, 8)}`,
                fromStation: fromStationName,
                arrivalTime: route.eta,
                status: route.percent_completion > 90 ? 'arriving' : 'in_transit',
                progress: route.percent_completion
              });
            }
          } else {
            if (stationIds.length >= 2) {
              const fromStationId = stationIds[0];
              const toStationId = stationIds[stationIds.length - 1];

              const fromStation = stationsToUse.find(s => s.id === fromStationId);
              const toStation = stationsToUse.find(s => s.id === toStationId);

              const fromStationName = fromStation ? (fromStation.loc_name || fromStation.name) : `Station ${fromStationId.substring(0, 8)}`;
              const toStationName = toStation ? (toStation.loc_name || toStation.name) : `Station ${toStationId.substring(0, 8)}`;

              processedArrivals.push({
                routeId: route.id,
                trainNumber: `${route.id.substring(0, 8)}`,
                fromStation: `${fromStationName} → ${toStationName}`,
                arrivalTime: route.eta,
                status: route.percent_completion > 90 ? 'arriving' : 'in_transit',
                progress: route.percent_completion
              });
            }
          }
        });

        setArrivals(processedArrivals);
      }
    } catch (error) {
      console.error('Error loading arrivals:', error);
    }
    setLoading(false);
  };

  // Load completed routes
  const loadCompletedRoutes = async () => {
    setLoading(true);
    try {
      let stationsToUse = allStations;
      if (allStations.length <= 1) {
        stationsToUse = await loadAllStations();
      }

      const response = await fetch('/api/routes?status=completed');
      const data = await response.json();

      if (response.ok && data.routes) {
        const processed: CompletedRouteData[] = data.routes.map((route: RouteData) => {
          const stationIds = route.all_station_ids || [];
          let fromStation = '---';

          if (stationIds.length >= 2) {
            const fromId = stationIds[0];
            const toId = stationIds[stationIds.length - 1];
            const fromName = stationsToUse.find(s => s.id === fromId);
            const toName = stationsToUse.find(s => s.id === toId);
            fromStation = `${fromName ? (fromName.loc_name || fromName.name) : fromId.substring(0, 8)} → ${toName ? (toName.loc_name || toName.name) : toId.substring(0, 8)}`;
          }

          return {
            routeId: route.id,
            fromStation,
            distance: route.total_distance || 0,
            moneyEarned: route.money_earned || 0,
            xpEarned: route.xp_earned || 0,
            completedAt: route.completed_at || '',
          };
        });

        setCompletedRoutes(processed);
      }
    } catch (error) {
      console.error('Error loading completed routes:', error);
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

  // Load data when component opens or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'active') {
        loadArrivals();
        const interval = setInterval(loadArrivals, 30000);
        return () => clearInterval(interval);
      } else {
        loadCompletedRoutes();
      }
    }
  }, [isOpen, stationId, activeTab]);

  if (!mounted) return null;

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

  // Filter completed routes based on search term
  const filteredCompleted = completedRoutes.filter(route => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return route.fromStation.toLowerCase().includes(searchLower);
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

  const handleRowClick = (routeId: string) => {
    router.push(`/routes/${routeId}`);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${phase === 'enter' ? 'board-backdrop-enter' : 'board-backdrop-exit'}`}>
      <div className={`bg-black border border-white/30 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden ${phase === 'enter' ? 'board-panel-enter' : 'board-panel-exit'}`}>
        {/* Header */}
        <div className="border-b border-white/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                {selectedStation
                  ? `${selectedStation.loc_name || selectedStation.name} 到达信息`
                  : '线路'}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {activeTab === 'active'
                  ? `共 ${arrivals.length} 辆车`
                  : `共 ${completedRoutes.length} 条记录`}
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

        {/* Tab Toggle */}
        <div className="px-4 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              运行中
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              已完成
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
          ) : activeTab === 'active' ? (
            /* Active routes view */
            sortedArrivals.length === 0 ? (
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
                {sortedArrivals.map((arrival, i) => (
                  <div
                    key={arrival.routeId}
                    onClick={() => handleRowClick(arrival.routeId)}
                    className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer board-row-enter"
                    style={{ animationDelay: `${i * 40}ms` }}
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
            )
          ) : (
            /* Completed routes view */
            filteredCompleted.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-lg">
                  {searchTerm ? '未找到匹配的结果' : '暂无已完成的线路'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Completed Table Header */}
                <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-white/5 rounded-lg text-sm font-medium text-white/80">
                  <div className="col-span-4">线路</div>
                  <div className="col-span-2">距离</div>
                  <div className="col-span-2">收入</div>
                  <div className="col-span-1">XP</div>
                  <div className="col-span-3">完成时间</div>
                </div>

                {/* Completed Rows */}
                {filteredCompleted.map((route, i) => (
                  <div
                    key={route.routeId}
                    onClick={() => handleRowClick(route.routeId)}
                    className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer board-row-enter"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="col-span-4">
                      <div className="text-white/90 text-sm">
                        {route.fromStation}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-white/70 font-mono text-sm">
                        {route.distance}km
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-green-400 font-mono text-sm">
                        +¥{route.moneyEarned.toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-blue-400 font-mono text-sm">
                        +{route.xpEarned}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="text-white/60 text-sm">
                        {route.completedAt ? new Date(route.completedAt).toLocaleString('zh-CN') : '---'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/30 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center space-x-4">
              {activeTab === 'active' ? (
                <>
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
                </>
              ) : (
                <span>已完成 {completedRoutes.length} 条线路</span>
              )}
            </div>
            <div>
              更新时间: {new Date().toLocaleTimeString()}
              {searchTerm && (
                <span className="ml-4">
                  显示: {activeTab === 'active' ? sortedArrivals.length : filteredCompleted.length} / {activeTab === 'active' ? arrivals.length : completedRoutes.length} 条结果
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
