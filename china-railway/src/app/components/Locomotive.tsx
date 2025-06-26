import React from 'react';

interface LocomotiveProps {
  id?: number;
  en_name?: string;
  loc_name?: string;
  model?: string;
  max_speed?: number;
  max_weight?: number;
  weight?: number;
  width?: number;
  type?: 'electric' | 'diesel' | 'steam';
  image?: string;
  className?: string;
  height?: number;
  onClick?: () => void;
}

const Locomotive: React.FC<LocomotiveProps> = ({
  id,
  en_name,
  loc_name,
  model,
  max_speed,
  max_weight,
  weight,
  width,
  type,
  image,
  className = "",
  height = 120,
  onClick
}) => {
  return (
    <div 
      className={`relative ${onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''} ${className}`}
      onClick={onClick}
      style={{ width: width || 250 }}
    >
      {/* Locomotive Image */}
      <img 
        src={image || "/assets/svgs/locomotives/DF.svg"} 
        alt={en_name || "Locomotive"}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to a default image if the specified image fails to load
          const target = e.target as HTMLImageElement;
          target.src = "/assets/svgs/locomotives/DF.svg";
        }}
      />
      
      {/* Optional: Display locomotive info on hover */}
      {en_name && (
        <div className="absolute inset-0 bg-black/80 text-white opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-center p-2" style={{ transform: 'scale(1)' }}>
          <div className="text-sm font-medium">{en_name}</div>
          {loc_name && <div className="text-xs text-gray-300">{loc_name}</div>}
          {model && <div className="text-xs text-gray-300">Model: {model}</div>}
          {type && <div className="text-xs text-gray-300 capitalize">Type: {type}</div>}
          {max_speed && <div className="text-xs text-gray-300">Max Speed: {max_speed} km/h</div>}
          {weight && <div className="text-xs text-gray-300">Weight: {weight.toLocaleString()} kg</div>}
          {max_weight && <div className="text-xs text-gray-300">Max Weight: {max_weight.toLocaleString()} kg</div>}
        </div>
      )}
    </div>
  );
};

export default Locomotive;
