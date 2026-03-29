'use client';

import { useEffect, useState } from 'react';
import { useBoardAnimation } from '../hooks/useBoardAnimation';
import { usePlayer } from '../contexts/PlayerContext';
import { Station } from '../utils/stations';

interface ShopItem {
  model: string;
  type: string;
  price: number;
  unlock_level: number;
  en_name: string;
  loc_name: string;
  image: string;
  weight: number;
  max_speed?: number;
  max_weight?: number;
  vehicle_type?: string;
  unlocked: boolean;
  affordable: boolean;
}

interface ShopBoardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopBoard({ isOpen, onClose }: ShopBoardProps) {
  const { mounted, phase } = useBoardAnimation(isOpen);
  const { player, addMoney } = usePlayer();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'locomotive' | 'car'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'speed' | 'level'>('level');
  const [selectedStation, setSelectedStation] = useState<string>('');

  const loadShopData = async () => {
    setLoading(true);
    try {
      const [shopRes, stationsRes] = await Promise.all([
        fetch('/api/shop'),
        fetch('/api/stations'),
      ]);

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setItems(shopData.items || []);
      }

      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        const stationsList = stationsData.stations || [];
        setStations(stationsList);
        if (stationsList.length > 0 && !selectedStation) {
          setSelectedStation(stationsList[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadShopData();
    }
  }, [isOpen]);

  const handleBuy = async (item: ShopItem) => {
    if (!selectedStation) return;
    if (buying) return;

    setBuying(true);
    try {
      const response = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: item.model,
          type: item.type,
          stationId: selectedStation,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addMoney(-data.moneySpent);
        // Refresh shop data to update affordable status
        await loadShopData();
      } else {
        console.error('Buy failed:', data.error);
      }
    } catch (error) {
      console.error('Error buying vehicle:', error);
    }
    setBuying(false);
  };

  if (!mounted) return null;

  // Filter items
  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        item.model.toLowerCase().includes(s) ||
        item.en_name.toLowerCase().includes(s) ||
        item.loc_name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'speed':
        return (b.max_speed || 0) - (a.max_speed || 0);
      case 'level':
        return a.unlock_level - b.unlock_level;
      default:
        return 0;
    }
  });

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${phase === 'enter' ? 'board-backdrop-enter' : 'board-backdrop-exit'}`}>
      <div className={`bg-black border border-white/30 rounded-lg w-full max-w-5xl max-h-[85vh] overflow-hidden ${phase === 'enter' ? 'board-panel-enter' : 'board-panel-exit'}`}>
        {/* Header */}
        <div className="border-b border-white/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-shrink-0">
              <h2 className="text-xl font-bold text-white">车辆商店</h2>
              <p className="text-sm text-white/60 mt-1">
                共 {items.length} 种车辆 | 余额 ¥{player.money.toLocaleString()} | 等级 {player.level}
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
                placeholder="搜索车辆名称..."
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

        {/* Filters Bar */}
        <div className="px-4 pt-3 flex items-center gap-3 flex-wrap">
          {/* Type Filter */}
          <div className="flex gap-1">
            {(['all', 'locomotive', 'car'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-white text-black'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {t === 'all' ? '全部' : t === 'locomotive' ? '机车' : '车厢'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 ml-auto">
            <span className="text-white/40 text-xs self-center mr-1">排序:</span>
            {(['level', 'price', 'speed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === s
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {s === 'level' ? '等级' : s === 'price' ? '价格' : '速度'}
              </button>
            ))}
          </div>

          {/* Station Selector */}
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg text-white text-xs px-3 py-1.5 focus:outline-none focus:border-white/40"
          >
            {stations.length === 0 && (
              <option value="">无可用车站</option>
            )}
            {stations.map(station => (
              <option key={station.id} value={station.id} className="bg-black text-white">
                {station.loc_name || station.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[58vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3 text-white">加载中...</span>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <p className="text-lg">
                {searchTerm ? '未找到匹配的车辆' : '商店暂无车辆'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedItems.map((item, i) => {
                const isLocked = player.level < item.unlock_level;
                const canAfford = player.money >= item.price;

                return (
                  <div
                    key={`${item.type}-${item.model}`}
                    className={`relative border rounded-lg p-3 transition-colors board-row-enter ${
                      isLocked
                        ? 'border-white/10 opacity-40 grayscale'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Lock overlay badge */}
                    {isLocked && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
                        <div className="bg-white/15 border border-white/20 rounded px-2 py-1 text-center">
                          <svg className="w-4 h-4 mx-auto mb-0.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-[10px] text-white/80 font-medium whitespace-nowrap">
                            等级 {item.unlock_level} 解锁
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Level badge */}
                    <div className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isLocked ? 'bg-white/10 text-white/40' : 'bg-white/20 text-white/80'
                    }`}>
                      Lv.{item.unlock_level}
                    </div>

                    {/* Image */}
                    <div className="flex items-center justify-center h-14 mb-2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.loc_name}
                          className={`h-12 object-contain ${isLocked ? 'grayscale' : ''}`}
                          draggable={false}
                        />
                      ) : (
                        <div className="w-12 h-12 border border-white/20 rounded flex items-center justify-center text-white/30 text-xs">
                          {item.model}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="text-center mb-1">
                      <div className="text-white text-sm font-medium truncate">{item.loc_name}</div>
                      <div className="text-white/40 text-[10px]">{item.model}</div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-3 text-[10px] text-white/50 mb-2">
                      {item.max_speed && (
                        <span>{item.max_speed}km/h</span>
                      )}
                      <span>{Math.round(item.weight / 1000)}t</span>
                    </div>

                    {/* Price & Buy */}
                    <div className="text-center">
                      <div className="text-white/80 text-xs font-mono mb-1.5">
                        ¥{item.price.toLocaleString()}
                      </div>
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={isLocked || !canAfford || buying || !selectedStation}
                        className="w-full py-1 rounded text-xs font-medium transition-colors bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
                      >
                        {isLocked ? '未解锁' : !canAfford ? '余额不足' : buying ? '...' : '购买'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/30 p-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <div>
              显示 {sortedItems.length} / {items.length} 种车辆
            </div>
            <div>
              送达车站: {stations.find(s => s.id === selectedStation)?.loc_name || stations.find(s => s.id === selectedStation)?.name || '未选择'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
