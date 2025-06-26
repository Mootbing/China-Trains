import React, { useEffect, useState } from 'react';

interface TrackProps {
  className?: string;
  train?: React.ReactNode;
  trainPosition?: 'top' | 'bottom';
}

const Track: React.FC<TrackProps> = ({ 
  className = "", 
  train,
  trainPosition = 'top'
}) => {

    function recalculateNumRails() {
        setNumRails(Math.ceil(window.innerWidth / railSize));
    }

    const railSize = 75;

    const [numRails, setNumRails] = useState(0);
    useEffect(() => {
        recalculateNumRails();
        window.addEventListener('resize', recalculateNumRails);

        return () => {
            window.removeEventListener('resize', recalculateNumRails);
        };
    }, []);

  return (
    <div className={`w-full relative ${className}`}>
      {/* Train positioned above or below the track */}
      {train && (
        <div className={`w-full flex justify-center relative z-10 bottom-25`}>
          {train}
        </div>
      )}
      
      {/* Track */}
      <div className="h-8 relative overflow-hidden z-0">
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
  );
};

export default Track;
