'use client';

import { useEffect, useState } from 'react';
import locomotives from '../../../public/assets/data/locomotives.json';
import cars from '../../../public/assets/data/cars.json';

interface VehicleFromDB {
  id: string;
  model: string;
  type: string;
  station_id?: string;
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
  max_speed?: number;
  max_weight?: number;
}

interface CombinedVehicleData extends VehicleData {
  database_id: string;
  vehicle_type: 'locomotive' | 'car';
  station_id?: string;
  serial_number: string;
  display_type: string;
}

interface TrainDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortField = 'model' | 'serial_number' | 'type';
type SortOrder = 'asc' | 'desc';

export default function TrainDashboard({ isOpen, onClose }: TrainDashboardProps) {
  const [vehicles, setVehicles] = useState<CombinedVehicleData[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<CombinedVehicleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('model');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'locomotive' | 'car'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchAllVehicles();
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = vehicles.filter(vehicle => {
      const matchesSearch = 
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.en_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.loc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || vehicle.vehicle_type === typeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'model':
          aValue = a.model;
          bValue = b.model;
          break;
        case 'serial_number':
          aValue = a.serial_number;
          bValue = b.serial_number;
          break;
        case 'type':
          aValue = a.display_type;
          bValue = b.display_type;
          break;
        default:
          aValue = a.model;
          bValue = b.model;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' 
        ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
        : (bValue < aValue ? -1 : bValue > aValue ? 1 : 0);
    });

    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, sortField, sortOrder, typeFilter]);

  const fetchAllVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/player/vehicles');
      if (response.ok) {
        const data: VehicleFromDB[] = await response.json();
        console.log('All vehicles from DB:', data);

        const combinedVehicles: CombinedVehicleData[] = data.map((vehicle, index) => {
          let vehicleDataFound: VehicleData | undefined;
          let vehicle_type: 'locomotive' | 'car';
          let display_type: string;

          if (vehicle.type === 'locomotive') {
            vehicleDataFound = (locomotives as VehicleData[]).find(
              (loco) => loco.model === vehicle.model
            );
            vehicle_type = 'locomotive';
            display_type = vehicleDataFound?.type || 'Unknown Locomotive';
          } else {
            vehicleDataFound = (cars as VehicleData[]).find(
              (car) => car.model === vehicle.model
            );
            vehicle_type = 'car';
            display_type = vehicleDataFound?.type || 'Unknown Car';
          }

          if (vehicleDataFound) {
            return {
              ...vehicleDataFound,
              database_id: vehicle.id,
              vehicle_type,
              station_id: vehicle.station_id,
              serial_number: vehicle.id.substring(0, 8), // First 8 characters as serial
              display_type: display_type.charAt(0).toUpperCase() + display_type.slice(1)
            };
          }

          // Fallback for vehicles not found in JSON data
          return {
            id: index,
            en_name: vehicle.model,
            loc_name: vehicle.model,
            model: vehicle.model,
            weight: 0,
            width: 200,
            type: vehicle.type,
            image: vehicle.type === 'locomotive' 
              ? 'assets/svgs/locomotives/HXD1.svg' 
              : 'assets/svgs/cars/YZ.svg',
            database_id: vehicle.id,
            vehicle_type,
            station_id: vehicle.station_id,
            serial_number: vehicle.id.substring(0, 8),
            display_type: vehicle_type === 'locomotive' ? 'Unknown Locomotive' : 'Unknown Car'
          };
        });

        setVehicles(combinedVehicles);
      } else {
        console.error('Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black/90 border border-white/20 rounded-lg w-full max-w-6xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/20 p-4 bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                车辆仪表板
              </h2>
              <p className="text-sm text-white/60 mt-1">
                显示所有拥有的车辆 • 共 {filteredVehicles.length} 辆
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
                placeholder="搜索型号、名称或序列号..."
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

            {/* Type Filter */}
            <div className="sm:w-32">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'locomotive' | 'car')}
                className="w-full px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
              >
                <option value="all">所有类型</option>
                <option value="locomotive">机车</option>
                <option value="car">车厢</option>
              </select>
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
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg">
                {searchTerm ? '未找到匹配的车辆' : '暂无车辆'}
              </p>
              {searchTerm ? (
                <p className="text-sm text-white/40 mt-1">
                  尝试使用不同的搜索词
                </p>
              ) : (
                <p className="text-sm text-white/40 mt-1">
                  车辆将在购买后显示在这里
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-white/5 rounded-lg text-sm font-medium text-white/80">
                <div className="col-span-1 text-center">图片</div>
                <button
                  onClick={() => handleSort('model')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  型号
                  {getSortIcon('model')}
                </button>
                <button
                  onClick={() => handleSort('serial_number')}
                  className="col-span-2 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  序列号
                  {getSortIcon('serial_number')}
                </button>
                <button
                  onClick={() => handleSort('type')}
                  className="col-span-1 flex items-center gap-2 hover:text-white transition-colors text-left"
                >
                  类型
                  {getSortIcon('type')}
                </button>
                <div className="col-span-2">名称</div>
                <div className="col-span-2">规格</div>
                <div className="col-span-2">位置</div>
              </div>

              {/* Vehicle Rows */}
              {filteredVehicles.map((vehicle, index) => (
                <div
                  key={vehicle.database_id}
                  className={`grid grid-cols-12 gap-4 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 ${
                    index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'
                  }`}
                >
                  <div className="col-span-1 flex justify-center">
                    <div className="w-12 h-8 flex items-center justify-center bg-white/5 rounded overflow-hidden">
                      <img
                        src={vehicle.image.startsWith('/') ? vehicle.image : `/${vehicle.image}`}
                        alt={vehicle.model}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = vehicle.vehicle_type === 'locomotive' 
                            ? "/assets/svgs/locomotives/HXD1.svg" 
                            : "/assets/svgs/cars/YZ.svg";
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-white font-medium">{vehicle.model}</div>
                  <div className="col-span-2 text-white/70 font-mono text-sm">{vehicle.serial_number}</div>
                  <div className="col-span-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.vehicle_type === 'locomotive' 
                        ? 'text-blue-400' 
                        : 'text-green-400'
                    }`}>
                      {vehicle.vehicle_type === 'locomotive' ? '机车' : '车厢'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-white font-medium text-sm">{vehicle.loc_name}</div>
                    <div className="text-white/60 text-xs">{vehicle.en_name}</div>
                  </div>
                  <div className="col-span-2 text-white/70 text-xs">
                    <div>重量: {(vehicle.weight / 1000).toFixed(1)}t</div>
                    {vehicle.vehicle_type === 'locomotive' && vehicle.max_speed && (
                      <>
                        <div>时速: {vehicle.max_speed}km/h</div>
                        <div>牵引: {vehicle.max_weight ? (vehicle.max_weight / 1000).toFixed(0) : 'N/A'}t</div>
                      </>
                    )}
                    {vehicle.vehicle_type === 'car' && (
                      <div>类型: {vehicle.display_type}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-white/70 text-xs">
                    {vehicle.station_id ? (
                      <span className="text-blue-400">站点: {vehicle.station_id.substring(0, 8)}...</span>
                    ) : (
                      <span className="text-yellow-400">运行中</span>
                    )}
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
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span>机车</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span>车厢</span>
              </div>
            </div>
            <div>
              总计: {vehicles.length} 辆车辆
              {searchTerm && (
                <span className="ml-4">
                  显示: {filteredVehicles.length} / {vehicles.length} 辆车辆
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
