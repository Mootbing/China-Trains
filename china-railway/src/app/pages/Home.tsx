'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Map from './Map';
import Login from './Login';

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is signed in, show the map with sign out button
  if (user) {
    return (
      <div className="h-screen w-screen relative">
        {/* Sign Out Button - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 shadow-lg"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
        
        {/* Map Component */}
        <Map />
      </div>
    );
  }

  // If user is not signed in, show the login component
  return <Login />;
} 