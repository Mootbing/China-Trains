import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../../../../utils/supabase-server';

const FALLBACK_SELL_PRICE = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const { supabase, user } = await createAuthenticatedClient();

    // Fetch the vehicle and verify ownership
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .eq('user_id', user.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Validate vehicle is at a station (not on a route)
    if (!vehicle.station_id) {
      return NextResponse.json(
        { error: 'Vehicle must be at a station to sell' },
        { status: 400 }
      );
    }

    if (vehicle.route_id) {
      return NextResponse.json(
        { error: 'Cannot sell a vehicle that is on a route' },
        { status: 400 }
      );
    }

    // Load shop.json to determine sell price (50% of shop price)
    const shopPath = path.join(process.cwd(), 'public/assets/data/shop.json');
    const shopData = JSON.parse(await fs.readFile(shopPath, 'utf8'));
    const shopEntry = shopData.find((item: any) => item.model === vehicle.model);

    const sellPrice = shopEntry
      ? Math.round(shopEntry.price * 0.5)
      : FALLBACK_SELL_PRICE;

    // Delete the vehicle from DB
    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to sell vehicle: ' + deleteError.message },
        { status: 500 }
      );
    }

    // Credit the user with sell price
    const { data: userData } = await supabase
      .from('users')
      .select('money')
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('users')
        .update({ money: Number(userData.money) + sellPrice })
        .eq('id', user.id);
    }

    return NextResponse.json({
      sell_price: sellPrice,
      model: vehicle.model,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Sell vehicle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
