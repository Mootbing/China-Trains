import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../utils/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    // Get user level
    const { data: playerData, error: playerError } = await supabase
      .from('users')
      .select('money, xp')
      .eq('id', user.id)
      .single();

    if (playerError) {
      return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
    }

    const userLevel = Math.floor((playerData?.xp || 0) / 1000) + 1;
    const userMoney = playerData?.money || 0;

    // Load shop, locomotives, and cars data
    const shopPath = path.join(process.cwd(), 'public/assets/data/shop.json');
    const locomotivesPath = path.join(process.cwd(), 'public/assets/data/locomotives.json');
    const carsPath = path.join(process.cwd(), 'public/assets/data/cars.json');

    const shopData = JSON.parse(await fs.readFile(shopPath, 'utf8'));
    const locomotivesData = JSON.parse(await fs.readFile(locomotivesPath, 'utf8'));
    const carsData = JSON.parse(await fs.readFile(carsPath, 'utf8'));

    // Enrich shop items with vehicle data
    const enrichedItems = shopData.map((item: any) => {
      let vehicleData;
      if (item.type === 'locomotive') {
        vehicleData = locomotivesData.find((l: any) => l.model === item.model);
      } else {
        vehicleData = carsData.find((c: any) => c.model === item.model);
      }

      return {
        ...item,
        en_name: vehicleData?.en_name || item.model,
        loc_name: vehicleData?.loc_name || item.model,
        image: vehicleData?.image || '',
        weight: vehicleData?.weight || 0,
        max_speed: vehicleData?.max_speed,
        max_weight: vehicleData?.max_weight,
        width: vehicleData?.width,
        vehicle_type: vehicleData?.type,
        type_info: vehicleData?.type_info,
        unlocked: userLevel >= item.unlock_level,
        affordable: userMoney >= item.price,
      };
    });

    return NextResponse.json({
      items: enrichedItems,
      userLevel,
      userMoney,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get shop error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
