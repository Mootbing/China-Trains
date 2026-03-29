import React from 'react';
import Locomotive from './Locomotive';
import TrainCar from './TrainCar';
import { Locomotive as LocomotiveType, Car } from '../utils/dataLoader';

interface TrainProps {
  consists: (LocomotiveType | Car)[];
  className?: string;
  spacing?: number;
  scale?: number;
  onClick?: (item: LocomotiveType | Car, index: number) => void;
  hoverable?: boolean;
  renderItem?: (item: LocomotiveType | Car, index: number, children: React.ReactNode) => React.ReactNode;
}

const Train: React.FC<TrainProps> = ({
  consists,
  className = "",
  spacing = 0,
  scale = 1,
  onClick,
  hoverable,
  renderItem
}) => {
  const isLocomotive = (item: LocomotiveType | Car): item is LocomotiveType => {
    return 'max_speed' in item;
  };

  return (
    <div
      className={`flex items-end ${className}`}
      style={{
        gap: `${spacing}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      {consists.map((item, index) => {
        const key = `${isLocomotive(item) ? 'loco' : 'car'}-${item.id}-${index}`;
        const clickHandler = onClick ? () => onClick(item, index) : undefined;

        let node: React.ReactNode;
        if (isLocomotive(item)) {
          node = <Locomotive key={key} {...item} onClick={clickHandler} hoverable={hoverable} />;
        } else {
          node = <TrainCar key={key} {...item} onClick={clickHandler} hoverable={hoverable} />;
        }

        return renderItem ? renderItem(item, index, node) : node;
      })}
    </div>
  );
};

export default Train;
