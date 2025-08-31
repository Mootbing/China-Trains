'use client';

import { useAuth } from '../contexts/AuthContext';
import Map from './Map';
import Login from './Login';
import {useTranslations} from 'next-intl';
import LocaleSwitcher from '../components/LocaleSwitcher';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations('Home');

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="absolute top-4 right-4">
          <LocaleSwitcher />
        </div>
        <div className="text-white text-xl font-bold">{t('loading')}</div>
      </div>
    );
  }

  // If user is signed in, show the map
  if (user) {
    return (
      <div className="h-screen w-screen relative">
        <div className="absolute top-4 right-4">
          <LocaleSwitcher />
        </div>
        {/* Map Component */}
        <Map />
      </div>
    );
  }

  // If user is not signed in, show the login component
  return <Login />;
}