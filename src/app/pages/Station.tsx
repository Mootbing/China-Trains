'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Track from '../components/Track';
import Train from '../components/Train';
import ArrivalBoard from '../components/ArrivalBoard';
import { Station } from '../utils/stations';
import locomotives from '../../../public/assets/data/locomotives.json';
import cars from '../../../public/assets/data/cars.json';
import { Locomotive as LocomotiveType, Car } from '../utils/dataLoader';
import { TrainMetrics, calculateTrainMetrics as calcMetrics } from '../utils/route-utils';
import { usePlayer } from '../contexts/PlayerContext';

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
  databaseIds: string[];
}

// What is currently being dragged
interface DragPayload {
  source: 'depot' | 'train';
  vehicle: VehicleData;          // for depot drags
  trainIndex?: number;           // for train drags (index in consist)
  trainItem?: LocomotiveType | Car; // the actual consist item
}

const UPGRADE_COSTS: Record<number, number> = {
  2: 15000,
  3: 40000,
  4: 100000,
  5: 250000,
};

const UPGRADE_LEVEL_REQUIREMENTS: Record<number, number> = {
  2: 2,
  3: 5,
  4: 10,
  5: 15,
};

export default function StationPage({ station: initialStation, onBack, onDispatch }: {
  station: Station;
  onBack?: () => void;
  onDispatch?: (startingStation: Station, vehicleIds?: number[], trainMetrics?: TrainMetrics) => void;
}) {
  const { player } = usePlayer();
  const [station, setStation] = useState<Station>(initialStation);
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const [showArrivalBoard, setShowArrivalBoard] = useState(false);
  const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({});
  const [availableDatabaseIds, setAvailableDatabaseIds] = useState<Record<string, string[]>>({});
  const [trainConsist, setTrainConsist] = useState<(LocomotiveType | Car)[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [demands, setDemands] = useState<any[]>([]);
  const [isLoadingDemands, setIsLoadingDemands] = useState(false);

  // --- Drag-and-drop state ---
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<'track' | 'depot' | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const DRAG_THRESHOLD = 8; // px before we consider it a drag vs a tap

  // Refs for drop zone hit-testing
  const trackZoneRef = useRef<HTMLDivElement>(null);
  const depotZoneRef = useRef<HTMLDivElement>(null);

  // Sync station state when prop changes
  useEffect(() => {
    setStation(initialStation);
  }, [initialStation]);

  // Calculate train performance metrics using shared utility
  const trainMetrics = calcMetrics(trainConsist as any[]);

  const hasLocomotive = trainConsist.some(vehicle =>
    'max_speed' in vehicle && 'max_weight' in vehicle
  );

  useEffect(() => {
    if (station) {
      const fetchVehicles = async () => {
        try {
          setIsLoadingVehicles(true);
          const response = await fetch(`/api/player/vehicles?station_id=${station.id}`);
          if (response.ok) {
            const data: VehicleFromDB[] = await response.json();

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
                  database_id: vehicle.id
                };
              }
              return undefined;
            }).filter(Boolean) as (VehicleData & { database_id: string })[];

            const vehicleCounts = detailedVehicles.reduce((acc, vehicle) => {
              const model = vehicle.model;
              if (!acc[model]) {
                acc[model] = { vehicle, count: 0, databaseIds: [] };
              }
              acc[model].count++;
              acc[model].databaseIds.push((vehicle as any).database_id);
              return acc;
            }, {} as Record<string, GroupedVehicle>);

            const grouped = Object.values(vehicleCounts);
            grouped.sort((a, b) => {
              if (a.vehicle.is_locomotive && !b.vehicle.is_locomotive) return -1;
              if (!a.vehicle.is_locomotive && b.vehicle.is_locomotive) return 1;
              return a.vehicle.en_name.localeCompare(b.vehicle.en_name);
            });

            setGroupedVehicles(grouped);

            const initialCounts: Record<string, number> = {};
            const initialDatabaseIds: Record<string, string[]> = {};
            grouped.forEach(({ vehicle, count, databaseIds }) => {
              initialCounts[vehicle.model] = count;
              initialDatabaseIds[vehicle.model] = [...databaseIds];
            });
            setAvailableCounts(initialCounts);
            setAvailableDatabaseIds(initialDatabaseIds);
          }
        } catch (error) {
          console.error('Error fetching vehicles:', error);
        } finally {
          setIsLoadingVehicles(false);
        }
      };
      fetchVehicles();
    }
  }, [station]);

  // Fetch demands for this station
  useEffect(() => {
    if (station) {
      const fetchDemands = async () => {
        try {
          setIsLoadingDemands(true);
          const response = await fetch(`/api/stations/${station.id}/demands`);
          if (response.ok) {
            const data = await response.json();
            setDemands(data.demands || []);
          }
        } catch (error) {
          console.error('Error fetching demands:', error);
        } finally {
          setIsLoadingDemands(false);
        }
      };
      fetchDemands();
    }
  }, [station]);

  // --- Core add/remove logic (shared by click and drag-drop) ---

  const addVehicleToTrain = useCallback((vehicle: VehicleData) => {
    if (availableCounts[vehicle.model] <= 0) return;

    const availableIds = availableDatabaseIds[vehicle.model];
    if (!availableIds || availableIds.length === 0) return;

    const selectedDatabaseId = availableIds[0];

    let newVehicle: LocomotiveType | Car;
    if (vehicle.is_locomotive) {
      newVehicle = {
        id: vehicle.id,
        en_name: vehicle.en_name,
        loc_name: vehicle.loc_name,
        model: vehicle.model,
        max_speed: (locomotives as any[]).find(l => l.id === vehicle.id)?.max_speed || 100,
        max_weight: (locomotives as any[]).find(l => l.id === vehicle.id)?.max_weight || 1000000,
        weight: vehicle.weight,
        width: vehicle.width,
        type: vehicle.type as 'electric' | 'diesel' | 'steam',
        image: vehicle.image.startsWith('/') ? vehicle.image : `/${vehicle.image}`,
        database_id: selectedDatabaseId,
      } as LocomotiveType & { database_id: string };
    } else {
      newVehicle = {
        id: vehicle.id,
        en_name: vehicle.en_name,
        loc_name: vehicle.loc_name,
        model: vehicle.model,
        type: vehicle.type as 'passenger' | 'freight',
        weight: vehicle.weight,
        width: vehicle.width,
        type_info: (cars as any[]).find(c => c.id === vehicle.id)?.type_info || {},
        image: vehicle.image.startsWith('/') ? vehicle.image : `/${vehicle.image}`,
        database_id: selectedDatabaseId,
      } as Car & { database_id: string };
    }

    setTrainConsist(prev => [...prev, newVehicle]);
    setAvailableCounts(prev => ({ ...prev, [vehicle.model]: prev[vehicle.model] - 1 }));
    setAvailableDatabaseIds(prev => ({
      ...prev,
      [vehicle.model]: prev[vehicle.model].filter(id => id !== selectedDatabaseId)
    }));
  }, [availableCounts, availableDatabaseIds]);

  const removeVehicleFromTrain = useCallback((index: number) => {
    const item = trainConsist[index];
    if (!item) return;

    const databaseId = (item as any).database_id;
    setTrainConsist(prev => prev.filter((_, i) => i !== index));
    setAvailableCounts(prev => ({ ...prev, [item.model]: (prev[item.model] || 0) + 1 }));
    setAvailableDatabaseIds(prev => ({
      ...prev,
      [item.model]: [...(prev[item.model] || []), databaseId]
    }));
  }, [trainConsist]);

  // --- Hit-test helpers ---
  const hitTest = useCallback((x: number, y: number): 'track' | 'depot' | null => {
    if (trackZoneRef.current) {
      const r = trackZoneRef.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return 'track';
    }
    if (depotZoneRef.current) {
      const r = depotZoneRef.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return 'depot';
    }
    return null;
  }, []);

  // --- Pointer-based drag handlers ---

  const handlePointerDown = useCallback((e: React.PointerEvent, payload: DragPayload) => {
    // Only primary button
    if (e.button !== 0) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;

    // Store payload for potential drag
    setDragPayload(payload);

    // Capture pointer for reliable tracking even outside the element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragPayload || !dragStartPos.current) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    if (!isDragging.current) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      isDragging.current = true;
    }

    setGhostPos({ x: e.clientX, y: e.clientY });
    setDropTarget(hitTest(e.clientX, e.clientY));
  }, [dragPayload, hitTest]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragPayload) return;

    if (isDragging.current) {
      const target = hitTest(e.clientX, e.clientY);

      if (dragPayload.source === 'depot' && target === 'track') {
        addVehicleToTrain(dragPayload.vehicle);
      } else if (dragPayload.source === 'train' && target === 'depot' && dragPayload.trainIndex !== undefined) {
        removeVehicleFromTrain(dragPayload.trainIndex);
      }
      // If dropped elsewhere, nothing happens (snap-back)
    } else {
      // It was a tap/click, not a drag — use legacy click behavior
      if (dragPayload.source === 'depot') {
        addVehicleToTrain(dragPayload.vehicle);
      } else if (dragPayload.source === 'train' && dragPayload.trainIndex !== undefined) {
        removeVehicleFromTrain(dragPayload.trainIndex);
      }
    }

    // Reset drag state
    isDragging.current = false;
    dragStartPos.current = null;
    setDragPayload(null);
    setGhostPos(null);
    setDropTarget(null);
  }, [dragPayload, hitTest, addVehicleToTrain, removeVehicleFromTrain]);

  // Cancel drag on pointer cancel / leave window
  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
    dragStartPos.current = null;
    setDragPayload(null);
    setGhostPos(null);
    setDropTarget(null);
  }, []);

  // Global escape key to cancel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlePointerCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlePointerCancel]);

  // Determine ghost image
  const ghostImage = dragPayload?.vehicle?.image || (dragPayload?.trainItem as any)?.image;

  // Station upgrade handler
  const handleUpgrade = async () => {
    if (isUpgrading || station.level >= 5) return;

    const nextLevel = station.level + 1;
    const cost = UPGRADE_COSTS[nextLevel];
    if (!cost) return;

    setIsUpgrading(true);
    try {
      const response = await fetch(`/api/stations/${station.id}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStation(prev => ({ ...prev, level: data.newLevel }));
      } else {
        console.error('Upgrade failed:', data.error);
      }
    } catch (error) {
      console.error('Error upgrading station:', error);
    }
    setIsUpgrading(false);
  };

  const nextUpgradeCost = station.level < 5 ? UPGRADE_COSTS[station.level + 1] : null;
  const nextUpgradeRequiredLevel = station.level < 5 ? UPGRADE_LEVEL_REQUIREMENTS[station.level + 1] : null;
  const canUpgradeLevel = nextUpgradeRequiredLevel ? player.level >= nextUpgradeRequiredLevel : false;

  return (
    <div
      className='relative overflow-hidden h-screen bg-black select-none'
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }}
    >

      {/* Back to Map Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
      )}

      {/* Top Right Button Container */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowArrivalBoard(true)}
          className="border-1 border-white text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          到达信息
        </button>

        {hasLocomotive && onDispatch && (
          <button
            onClick={() => {
              const vehicleIds = trainConsist.map(vehicle => (vehicle as any).database_id || vehicle.id);
              onDispatch(station, vehicleIds, trainMetrics);
            }}
            className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            发车
          </button>
        )}
      </div>

      {/* Station Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 text-white px-6 py-2 rounded-lg">
        <h1 className="text-xl font-bold text-center">
          {station.loc_name || station.name}站
        </h1>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <p className="text-sm text-gray-300">{station.level}等站</p>
          {station.level < 5 && nextUpgradeCost && (
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading || !canUpgradeLevel}
              className={`text-[10px] px-2 py-0.5 border border-white/30 rounded transition-colors disabled:opacity-50 ${
                canUpgradeLevel ? 'hover:bg-white/10' : 'cursor-not-allowed'
              }`}
              title={!canUpgradeLevel ? `需要等级 ${nextUpgradeRequiredLevel}` : undefined}
            >
              {isUpgrading ? '...' : !canUpgradeLevel
                ? `需要等级 ${nextUpgradeRequiredLevel}`
                : `升级 ¥${nextUpgradeCost.toLocaleString()}`}
            </button>
          )}
          {station.level >= 5 && (
            <span className="text-[10px] text-white/40 px-2 py-0.5">MAX</span>
          )}
        </div>

        {trainMetrics.maxWeight > 0 && (
          <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-white/20">
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
          </div>
        )}
      </div>

      {/* Demand Cards */}
      {demands.length > 0 && (
        <div className="absolute top-24 left-4 z-10 flex flex-col gap-2 max-w-xs">
          <div className="text-white/50 text-xs font-medium mb-0.5">需求</div>
          {demands.map((demand: any) => (
            <button
              key={demand.id}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-left hover:bg-white/10 transition-colors"
              onClick={() => {
                // Pre-fill dispatch by triggering dispatch mode if onDispatch is available
                // For now just show info
              }}
            >
              <div className="text-white text-xs font-medium">
                {demand.demand_type === 'passenger'
                  ? `${demand.quantity} 名旅客`
                  : `${demand.quantity}t 货物`}
                <span className="text-white/50"> → </span>
                <span className="text-white/80">{demand.destination_name}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {demand.reward_multiplier}x 奖励
                <span className="ml-2">
                  {new Date(demand.expires_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 到期
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Track drop zone — vehicles dragged here get added to train */}
      <div
        ref={trackZoneRef}
        className={`absolute bottom-0 w-full transition-colors duration-150 ${
          dropTarget === 'track' && dragPayload?.source === 'depot'
            ? 'bg-white/10 ring-2 ring-white/40 ring-inset rounded-lg'
            : ''
        }`}
      >
        <Track
          className="bottom-50"
          train={
            trainConsist.length > 0 ? (
              <Train
                consists={trainConsist}
                scale={1}
                hoverable={true}
                onClick={(item, index) => {
                  // Click fallback handled by pointer events
                }}
                renderItem={(item, index, children) => (
                  <div
                    key={`train-drag-${index}`}
                    onPointerDown={(e) => handlePointerDown(e, {
                      source: 'train',
                      vehicle: {
                        id: item.id,
                        en_name: item.en_name,
                        loc_name: item.loc_name,
                        model: item.model,
                        weight: item.weight,
                        width: item.width,
                        type: item.type,
                        image: (item as any).image || '',
                        is_locomotive: 'max_speed' in item,
                      },
                      trainIndex: index,
                      trainItem: item,
                    })}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {children}
                  </div>
                )}
              />
            ) : (
              // Empty track hint
              <div className={`flex items-center justify-center h-full w-full transition-opacity ${
                dragPayload?.source === 'depot' ? 'opacity-100' : 'opacity-30'
              }`}>
                <p className="text-white/50 text-sm">
                  {dragPayload?.source === 'depot' ? '松开以添加到编组' : '拖拽车辆到此处编组'}
                </p>
              </div>
            )
          }
        />
      </div>

      {/* Depot drop zone — train items dragged here get removed */}
      <div
        ref={depotZoneRef}
        className={`absolute bottom-0 w-full overflow-x-auto whitespace-nowrap py-4 transition-colors duration-150 ${
          dropTarget === 'depot' && dragPayload?.source === 'train'
            ? 'bg-white/10 ring-2 ring-white/40 ring-inset rounded-t-lg'
            : ''
        }`}
        style={{ touchAction: 'pan-x' }}
      >
        {isLoadingVehicles ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
              <p className="text-white text-sm">正在加载列车...</p>
            </div>
          </div>
        ) : groupedVehicles.filter(({ vehicle }) => availableCounts[vehicle.model] > 0).length === 0 && trainConsist.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <svg className="w-12 h-12 text-white/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white/70 text-lg font-medium">本站暂无列车</p>
              <p className="text-white/50 text-sm mt-1">No trains at this stop right now</p>
            </div>
          </div>
        ) : (
          <div className="inline-flex space-x-4 px-4">
            {groupedVehicles
              .filter(({ vehicle }) => availableCounts[vehicle.model] > 0)
              .map(({ vehicle }, index) => (
              <div
                key={index}
                className="relative inline-block bg-white/5 p-2 rounded-lg shadow cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                onPointerDown={(e) => handlePointerDown(e, {
                  source: 'depot',
                  vehicle,
                })}
              >
                {availableCounts[vehicle.model] > 1 && (
                  <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-white/10 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold z-10">
                    x{availableCounts[vehicle.model]}
                  </div>
                )}
                <img
                  src={`${vehicle.image}`}
                  alt={vehicle.loc_name}
                  className="h-20 object-contain pointer-events-none"
                  draggable={false}
                />
                <div className="text-center mt-2 text-sm font-semibold">{vehicle.loc_name}</div>
              </div>
            ))}
            {/* Show hint when dragging from train */}
            {dragPayload?.source === 'train' && (
              <div className="inline-flex items-center justify-center px-6 text-white/40 text-sm border-2 border-dashed border-white/20 rounded-lg">
                松开以从编组移除
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag ghost — follows pointer during drag */}
      {ghostPos && ghostImage && (
        <div
          className="fixed z-50 pointer-events-none opacity-75"
          style={{
            left: ghostPos.x - 50,
            top: ghostPos.y - 40,
            width: 100,
          }}
        >
          <img
            src={ghostImage}
            alt="drag"
            className="w-full h-auto object-contain drop-shadow-lg"
            draggable={false}
          />
        </div>
      )}

      {/* Arrival Board */}
      <ArrivalBoard
        isOpen={showArrivalBoard}
        onClose={() => setShowArrivalBoard(false)}
        stationId={station.id}
        stations={[station]}
      />
    </div>
  );
}
