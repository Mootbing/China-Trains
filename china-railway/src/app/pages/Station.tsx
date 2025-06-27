'use client';

import Track from '../components/Track';

export default function StationPage() {
  return (
    <div className='relative overflow-hidden h-screen w-screen'>
      <Track 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
      />
    </div>
  );
}
