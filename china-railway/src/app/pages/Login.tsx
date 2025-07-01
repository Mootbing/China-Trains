'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Track from '../components/Track';
import Train from '../components/Train';
import { useLocomotive, useCar } from '../hooks/useTrainData';

export default function Login() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { locomotive, loading: locoLoading, error: locoError } = useLocomotive(5); // HXD1 has ID 5
  const { car, loading: carLoading, error: carError } = useCar(1); // Hard Seat car

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a train consist with locomotive and cars
  const trainConsist = [];
  if (locomotive) trainConsist.push(locomotive);
  if (car) trainConsist.push(car);
  if (car) trainConsist.push(car);
  if (car) trainConsist.push(car);
  
    const handleTrainItemClick = (item: any, index: number) => {
      console.log(`Clicked ${item.en_name} at position ${index}`);
    };
  

  return (
    <div className='overflow-hidden h-screen w-screen'>
      <div className="min-h-screen bg-black flex flex-col items-center pt-30 p-4 z-100">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-light text-white mb-2 tracking-wide">
            铁道帝国
          </h1>
          <h2 className="text-xl font-light text-white/80 tracking-widest">
            Iron Empire
          </h2>
        </div>

        {/* User Status */}
        {true && (
          /* Google Login Button */
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2 mb-8"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </span>
          </button>
        )}
      </div>
      
      {/* Track with Train */}
      <Track 
        className="bottom-100"
        train={
          (locoLoading || carLoading) ? (
            <div className="text-white">Loading train...</div>
          ) : (locoError || carError) ? (
            <div className="text-red-500">Error loading train data</div>
          ) : trainConsist.length > 0 ? (
            <Train 
              consists={trainConsist}
              scale={1}
              onClick={handleTrainItemClick}
              hoverable={false}
            />
          ) : null
        }
      />
    </div>
  );
} 