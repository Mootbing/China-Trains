// Types for locomotive and car data
export interface Locomotive {
  id: number;
  en_name: string;
  loc_name: string;
  model: string;
  max_speed: number;
  max_weight: number;
  weight: number;
  width: number;
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
  width: number;
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

 