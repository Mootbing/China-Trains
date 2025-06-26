// Types for locomotive and car data
export interface Locomotive {
  id: number;
  en_name: string;
  loc_name: string;
  model: string;
  max_speed: number;
  max_weight: number;
  weight: number;
  type: 'electric' | 'diesel' | 'steam';
  image: string;
}

export interface Car {
  id: number;
  en_name: string;
  loc_name: string;
  model: string;
  type: 'passenger' | 'freight';
  weight: number;
  type_info: {
    seats?: number;
    cargo_weight?: number;
  };
  image: string;
}

// Load locomotive data
export async function loadLocomotives(): Promise<Locomotive[]> {
  try {
    const response = await fetch('/assets/data/locomotives.json');
    if (!response.ok) {
      throw new Error(`Failed to load locomotives: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading locomotives:', error);
    return [];
  }
}

// Load car data
export async function loadCars(): Promise<Car[]> {
  try {
    const response = await fetch('/assets/data/cars.json');
    if (!response.ok) {
      throw new Error(`Failed to load cars: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading cars:', error);
    return [];
  }
}

// Get locomotive by ID
export async function getLocomotiveById(id: number): Promise<Locomotive | null> {
  const locomotives = await loadLocomotives();
  return locomotives.find((loco: Locomotive) => loco.id === id) || null;
}

// Get car by ID
export async function getCarById(id: number): Promise<Car | null> {
  const cars = await loadCars();
  return cars.find((car: Car) => car.id === id) || null;
}

// Get locomotives by type
export async function getLocomotivesByType(type: 'electric' | 'diesel' | 'steam'): Promise<Locomotive[]> {
  const locomotives = await loadLocomotives();
  return locomotives.filter((loco: Locomotive) => loco.type === type);
}

// Get cars by type
export async function getCarsByType(type: 'passenger' | 'freight'): Promise<Car[]> {
  const cars = await loadCars();
  return cars.filter((car: Car) => car.type === type);
} 