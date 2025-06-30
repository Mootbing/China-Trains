import React from 'react';

interface TrainCarProps {
  id?: number;
  en_name?: string;
  loc_name?: string;
  model?: string;
  type?: 'passenger' | 'freight';
  weight?: number;
  width?: number;
  type_info?: {
    seats?: number;
    cargo_weight?: number;
  };
  image?: string;
  className?: string;
  height?: number;
  onClick?: () => void;
  hoverable?: boolean;
}

const TrainCar: React.FC<TrainCarProps> = ({
  id,
  en_name,
  loc_name,
  model,
  type,
  weight,
  width,
  type_info,
  image,
  className = "",
  height = 100,
  onClick,
  hoverable = true
}) => {
  const hoverClasses = hoverable && onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : '';
  const infoHoverClasses = hoverable ? 'hover:opacity-100' : 'opacity-0';

  return (
    <div 
      className={`relative ${hoverClasses} ${className}`}
      onClick={onClick}
      style={{ width: width || 200 }}
    >
      {/* Train Car Image */}
      <img 
        src={image || "/assets/svgs/cars/YZ.png"} 
        alt={en_name || "Train Car"}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to a default image if the specified image fails to load
          const target = e.target as HTMLImageElement;
          target.src = "/assets/svgs/cars/YZ.png";
        }}
      />
      
      {/* Optional: Display car info on hover */}
      {en_name && (
        <div className={`absolute inset-0 bg-black/80 text-white opacity-0 ${infoHoverClasses} transition-opacity duration-200 flex flex-col items-center justify-center text-center p-2`} style={{ transform: 'scale(1)' }}>
          <div className="text-sm font-medium">{en_name}</div>
          {loc_name && <div className="text-xs text-gray-300">{loc_name}</div>}
          {model && <div className="text-xs text-gray-300">Model: {model}</div>}
          {type && <div className="text-xs text-gray-300 capitalize">Type: {type}</div>}
          {weight && <div className="text-xs text-gray-300">Weight: {weight}kg</div>}
          {type_info?.seats && <div className="text-xs text-gray-300">Seats: {type_info.seats}</div>}
          {type_info?.cargo_weight && <div className="text-xs text-gray-300">Cargo: {type_info.cargo_weight}kg</div>}
        </div>
      )}
    </div>
  );
};

export default TrainCar; 