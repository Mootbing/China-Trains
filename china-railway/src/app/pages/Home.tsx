'use client';

import { useState } from 'react';
import Track from '../components/Track';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // For now, just simulate loading
    setTimeout(() => {
      setIsLoading(false);
      console.log('Google login would be initiated here');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      
      {/* Main container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glass morphic card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-light text-white mb-2 tracking-wide">
              中国铁道
            </h1>
            <h2 className="text-xl font-light text-white/80 tracking-widest">
              CHRAILWAYS
            </h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mt-6"></div>
          </div>

          {/* Login section */}
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur transition-all duration-300 group-hover:blur-md group-hover:scale-105"></div>
              <div className="relative backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-4 transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/30 group-hover:shadow-lg">
                <div className="flex items-center justify-center space-x-3">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
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
                  <span className="text-white font-medium">
                    {isLoading ? 'Connecting...' : 'Continue with Google'}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <Track />
    </div>
  );
}
