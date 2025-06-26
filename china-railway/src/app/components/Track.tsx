import React, { useEffect, useState } from 'react';

interface TrackProps {
  className?: string;
}

const Track: React.FC<TrackProps> = ({ className = "" }) => {

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
    <div className={`w-full h-8 relative overflow-hidden ${className}`}>
      <div className="flex h-full">
        {/* Repeat the rail image horizontally */}
        {Array.from({ length: numRails }, (_, index) => (
          <img 
            key={index}
            src="./assets/svgs/track/rail.svg"
            alt="Rail track" 
            // className="h-full object-cover flex-shrink-0"
            style={{ width: railSize }}
          />
        ))}
      </div>
    </div>
  );
};

export default Track;
