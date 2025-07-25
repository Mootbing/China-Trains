'use client';

import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Glass morphic modal */}
      <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          {purchaseSuccess ? (
            // Success state
            <>
              {/* Success Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Success Title */}
              <h3 className="text-xl font-semibold text-white mb-2">
                站已购！
              </h3>

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-semibold"
              >
                关
              </button>
              
              {/* View Station button */}
              {onViewStation && (
                <button
                  onClick={onViewStation}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold mt-3"
                >
                  去看看
                </button>
              )}
            </>
          ) : isPurchasing ? (
            // Loading state
            <>
              {/* Spinner */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              </div>

              {/* Loading Title */}
              <h3 className="text-xl font-semibold text-white mb-2">
                请稍等...
              </h3>

              {/* Loading Message */}
              <p className="text-white/80">
                买站中...
              </p>
            </>
          ) : (
            // Purchase confirmation state
            <>
              {/* Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mb-2">
                买站
              </h3>

              {/* Station details */}
              <div className="mb-6">
                <p className="text-2xl font-bold text-white mb-2">
                  {stationName}
                </p>
                <p className="text-red-400 font-semibold">
                  ¥{stationCost.toLocaleString()} <span className="text-white/70 text-sm">(您有 ¥{currentMoney.toLocaleString()})</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                >
                  取消
                </button>
                <button
                  onClick={onConfirm}
                  disabled={currentMoney < stationCost}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
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