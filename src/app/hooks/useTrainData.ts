import { useState, useEffect } from 'react';
import { loadLocomotives, loadCars, Locomotive, Car } from '../utils/dataLoader';

export function useLocomotive(id: number) {
  const [locomotive, setLocomotive] = useState<Locomotive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocomotive = async () => {
      try {
        setLoading(true);
        const locomotives = await loadLocomotives();
        const found = locomotives.find(loco => loco.id === id);
        setLocomotive(found || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load locomotive');
      } finally {
        setLoading(false);
      }
    };

    fetchLocomotive();
  }, [id]);

  return { locomotive, loading, error };
}

export function useCar(id: number) {
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setLoading(true);
        const cars = await loadCars();
        const found = cars.find(car => car.id === id);
        setCar(found || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load car');
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
  }, [id]);

  return { car, loading, error };
} 