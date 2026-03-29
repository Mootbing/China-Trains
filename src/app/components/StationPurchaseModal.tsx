'use client';

import React from 'react';
import { useBoardAnimation } from '../hooks/useBoardAnimation';

interface StationPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stationName: string;
  stationCost: number;
  currentMoney: number;
  isPurchasing: boolean;
  purchaseSuccess?: {
    stationName: string;
    level: number;
    moneySpent: number;
    remainingMoney: number;
  };
  onViewStation?: () => void;
}

export default function StationPurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  stationName,
  stationCost,
  currentMoney,
  isPurchasing,
  purchaseSuccess,
  onViewStation
}: StationPurchaseModalProps) {
  const { mounted, phase } = useBoardAnimation(isOpen);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${phase === 'enter' ? 'board-backdrop-enter' : 'board-backdrop-exit'}`}>
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className={`relative bg-black border border-white/30 rounded-lg p-8 max-w-md w-full mx-4 ${phase === 'enter' ? 'board-panel-enter' : 'board-panel-exit'}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          {purchaseSuccess ? (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 border border-white/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-6">站已购！</h3>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 border border-white/30 text-white rounded-lg transition-colors hover:bg-white/10"
              >
                关
              </button>

              {onViewStation && (
                <button
                  onClick={onViewStation}
                  className="w-full px-4 py-3 bg-white text-black rounded-lg transition-colors hover:bg-white/90 font-semibold mt-3"
                >
                  去看看
                </button>
              )}
            </>
          ) : isPurchasing ? (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">请稍等...</h3>
              <p className="text-white/60">买站中...</p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 border border-white/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">买站</h3>

              <div className="mb-6">
                <p className="text-2xl font-bold text-white mb-2">{stationName}</p>
                <p className="text-white/60 font-mono">
                  ¥{stationCost.toLocaleString()}
                  <span className="text-white/40 text-sm ml-2">(余额 ¥{currentMoney.toLocaleString()})</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-white/30 text-white rounded-lg transition-colors hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  onClick={onConfirm}
                  disabled={currentMoney < stationCost}
                  className="flex-1 px-4 py-3 bg-white text-black rounded-lg transition-colors hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed font-semibold"
                >
                  购买
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
