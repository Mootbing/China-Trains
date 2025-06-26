import React from 'react';

interface TrackProps {
  className?: string;
}

const Track: React.FC<TrackProps> = ({ className = "" }) => {

    const railSize = 75;

  return (
    <div className={`w-full h-8 relative overflow-hidden ${className}`}>
      <div className="flex h-full">
        {/* Repeat the rail image horizontally */}
        {Array.from({ length: window.innerWidth / railSize
         }, (_, index) => (
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
