import React from 'react';

interface DockButtonProps {
  svgUrl: string;
  label?: string;
  onClick?: () => void;
}

const DockButton: React.FC<DockButtonProps> = ({ svgUrl, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="relative mx-2 flex flex-col items-end justify-center transition-colors duration-150"
      style={{ width: 48, height: 48, transform: 'translateX(-50%)' }}
    >
      {/* SVG Icon */}
      <img src={svgUrl} alt={label || 'dock icon'} style={{ width: 30, height: 30 }} />
      {/* Label aligned to the right */}
      {label && (
        <span className="text-xs text-white lowercase pointer-events-none select-none font-light" style={{transform: 'translateX(50%)'}}>
          {label}
        </span>
      )}
    </button>
  );
};

export default DockButton;