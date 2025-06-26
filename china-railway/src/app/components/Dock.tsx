import React from 'react';

interface DockProps {
  children: React.ReactNode;
}

const Dock: React.FC<DockProps> = ({ children }) => {
  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg flex items-center px-6 py-2"
      style={{ minHeight: 56, minWidth: 200, maxWidth: '90vw' }}
    >
      {children}
    </div>
  );
};

export default Dock;