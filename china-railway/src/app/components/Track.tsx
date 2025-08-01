import React, { useEffect, useState } from 'react';

interface TrackProps {
  className?: string;
  train?: React.ReactNode;
  trainPosition?: 'top' | 'bottom';
  electrified?: boolean;
  leftOffset?: number; // Offset for train position
  level?: number;
  speed?: number; // Train speed in km/h for animation
  isMoving?: boolean; // Whether the train is currently moving
}

const Track: React.FC<TrackProps> = ({
  className = "",
  train,
  electrified = true,
  level = 0,
  speed = 0,
  isMoving = false,
  leftOffset = isMoving ? 100 : 300,
}) => {

  function recalculateNumRails() {
    setNumRails(Math.ceil(window.innerWidth / railSize) + 2); // Add extra rails for seamless movement
  }

  function getPantographCount() {
    return Math.ceil(window.innerWidth / pantographOffset) + 2; // Add extra pantographs
  }

  const railSize = 75;
  const pantographOffset = 350;

  const [numRails, setNumRails] = useState(0);
  const [railOffset, setRailOffset] = useState(0);
  const [pantographOffsetState, setPantographOffsetState] = useState(0);

  // Calculate animation speed based on train speed
  // Convert km/h to pixels per second for visual effect
  const animationSpeed = isMoving ? (speed * 2) : 0; // Adjust multiplier for visual effect

  useEffect(() => {
    recalculateNumRails();
    window.addEventListener('resize', recalculateNumRails);

    return () => {
      window.removeEventListener('resize', recalculateNumRails);
    };
  }, []);

  // Animation loop for moving rails and pantograph
  useEffect(() => {
    if (!isMoving || animationSpeed === 0) return;

    let animationFrame: number;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      setRailOffset(prev => {
        const newOffset = prev + (animationSpeed * deltaTime); // Move forward
        // Reset offset when it reaches rail size for seamless loop
        return newOffset >= railSize ? newOffset - railSize : newOffset;
      });

      setPantographOffsetState(prev => {
        const newOffset = prev + (animationSpeed * deltaTime); // Move forward
        // Reset offset when it reaches pantograph spacing for seamless loop
        return newOffset >= pantographOffset ? newOffset - pantographOffset : newOffset;
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isMoving, animationSpeed]);

  return (
    <div className={`relative ${className}`}
      style={{
        width: "100vw",
        height: 350,
        overflow: "visible"
        // backgroundColor: "blue"
      }}
    >
      <div className='absolute bottom-0 w-full'>
        {/* Pantograph */}
        {electrified && (<>
          <div className="absolute z-0 bottom-0 overflow-visible">
            <div 
              className="flex h-full"
              style={{
                transform: `translateX(${pantographOffsetState - 400}px)`,
                transition: 'none' // Disable CSS transitions for smooth animation
              }}
            >
              {Array.from({ length: getPantographCount() }, (_, index) => (
                <img
                  key={index}
                  src={level === 0 ? "/assets/svgs/track/pantograph.svg" : "/assets/svgs/track/pantograph-2.svg"}
                  alt="Pantograph"
                  style={{ 
                    width: railSize, 
                    minWidth: railSize,
                    marginLeft: index === 0 ? 0 : pantographOffset - railSize,
                    transform: `translateY(-10%)`,
                    display: 'block',
                    flexShrink: 0
                  }}
                />
              ))}
            </div>
          </div>
          
          <svg 
            className="overflow-visible w-full" 
            style={{
              position: "absolute", 
              bottom: 175,
              transform: `translateX(${pantographOffsetState - 400}px)`,
              transition: 'none'
            }}
          >
            {/* draw line between each pantograph */}
            {Array.from({ length: getPantographCount() - 1}, (_, index) => (
              <path
                key={index}
                d={`M ${railSize/2 + (pantographOffset) * index} 40 Q ${railSize/2 + (pantographOffset) * index + pantographOffset/2} 100 ${railSize/2 + (pantographOffset) * (index + 1)} 40`}
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
              WebkitOverflowScrolling: "touch",
              paddingLeft: leftOffset
            }}
          >
            <div className="flex justify-start items-center min-w-full">
              {train}
            </div>
          </div>
        )}

        {/* Track */}
        <div className="relative overflow-hidden z-0">
          <div 
            className="flex h-full"
            style={{
              transform: `translateX(${railOffset - 100}px)`,
              transition: 'none', // Disable CSS transitions for smooth animation
              filter: isMoving && speed > 60 ? `blur(${Math.min((speed - 60) / 100, 1)}px)` : 'none'
            }}
          >
            {/* Repeat the rail image horizontally */}
            {Array.from({ length: numRails }, (_, index) => (
              <img
                key={index}
                src="/assets/svgs/track/rail.svg"
                alt="Rail track"
                style={{ 
                  width: railSize,
                  minWidth: railSize,
                  flexShrink: 0
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Track;
