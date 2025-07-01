import React, { useEffect, useState } from 'react';

interface TrackProps {
  className?: string;
  train?: React.ReactNode;
  trainPosition?: 'top' | 'bottom';
  electrified?: boolean;
  level?: number;
}

const Track: React.FC<TrackProps> = ({
  className = "",
  train,
  electrified = true,
  level = 0
}) => {

  function recalculateNumRails() {
    setNumRails(Math.ceil(window.innerWidth / railSize));
  }

  function getPantographCount() {
    return numRails * railSize / pantographOffset + 1;
  }

  const railSize = 75;
  const pantographOffset = 350;

  const [numRails, setNumRails] = useState(0);
  useEffect(() => {
    recalculateNumRails();
    window.addEventListener('resize', recalculateNumRails);

    return () => {
      window.removeEventListener('resize', recalculateNumRails);
    };
  }, []);

  return (
    <div className={`relative ${className}`}
      style={{
        width: "100vw",
        height: 350,
        // backgroundColor: "blue"
      }}
    >
      <div className='absolute bottom-0 w-full'>
        {/* Pantograph */}
        {electrified && (<>
          <div className="absolute z-0 bottom-0">
            <div className="flex h-full">
              {Array.from({ length: getPantographCount() }, (_, index) => (
                <img
                  key={index}
                  src={level === 0 ? "./assets/svgs/track/pantograph.svg" : "./assets/svgs/track/pantograph-2.svg"}
                  alt="Pantograph"
                  style={{ width: railSize, transform: `translateX(${pantographOffset * index}px) translateY(-10%)` }}
                />
              ))}
            </div>
          </div>
          
          <svg className="overflow-visible w-full" style={{position: "absolute", bottom: 175}}>
            {/* draw line between each pantograph */}
            {Array.from({ length: getPantographCount() - 1 }, (_, index) => (
              <path
                key={index}
                d={`M ${(pantographOffset + 75) * index + 40} 40 Q ${(pantographOffset + 75) * (index + 0.5) + 40} 100 ${(pantographOffset + 75) * (index + 1) + 40} 40`}
                stroke="white"
                strokeWidth={1}
                fill="none"
              />
            ))}
          </svg>
        </>)}

        {/* Scrollable Train Container */}
        {train && (
          <div 
            className="w-full relative z-10 overflow-x-auto overflow-y-hidden"
            style={{
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch"
            }}
          >
            <div className="flex justify-start items-end min-w-full px-4">
              {train}
            </div>
          </div>
        )}

        {/* Track */}
        <div className="relative overflow-hidden z-0">
          <div className="flex h-full">
            {/* Repeat the rail image horizontally */}
            {Array.from({ length: numRails }, (_, index) => (
              <img
                key={index}
                src="./assets/svgs/track/rail.svg"
                alt="Rail track"
                style={{ width: railSize }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Track;
