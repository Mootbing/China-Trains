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
    <div className={`w-full relative ${className} bg-white`}>
      <div className='absolute bottom-0'>
        {/* Pantograph */}
        {electrified && (<>
          <div className="absolute z-0 bottom-0">
            <div className="flex h-full">
              {Array.from({ length: getPantographCount() }, (_, index) => (
                <img
                  key={index}
                  src={level === 0 ? "./assets/svgs/track/pantograph.svg" : "./assets/svgs/track/pantograph-2.svg"}
                  alt="Pantograph"
                  style={{ width: railSize, transform: `translateX(${pantographOffset * index}px) translateY(-27%)` }}
                />
              ))}
            </div>
          </div>
          
          <svg className="absolute left-0 w-full h-full overflow-visible top-0">
            {/* draw line between each pantograph */}
            {Array.from({ length: getPantographCount() - 1 }, (_, index) => (
              <path
                key={index}
                d={`M ${(pantographOffset + 75) * index + 40} -40 Q ${(pantographOffset + 75) * (index + 0.5) + 40} 20 ${(pantographOffset + 75) * (index + 1) + 40} -40`}
                stroke="white"
                strokeWidth={1}
                fill="none"
              />
            ))}
          </svg>
        </>)}

        {/* Train positioned above or below the track */}
        {train && (
          <div className={`w-full flex justify-center relative z-10`}>
            {train}
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
