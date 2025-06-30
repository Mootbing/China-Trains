'use client';

import { useAuth } from '../contexts/AuthContext';
import Map from './Map';
import Login from './Login';

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    );
  }

  // If user is signed in, show the map
  if (user) {
    return (
      <div className="h-screen w-screen relative">
        {/* Map Component */}
        <Map />
      </div>
    );
  }

  // If user is not signed in, show the login component
  return <Login />;
} 