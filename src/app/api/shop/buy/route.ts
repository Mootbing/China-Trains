import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createAuthenticatedClient } from '../../../utils/supabase-server';
import { checkAndAwardAchievements } from '../../../utils/achievement-checker';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const body = await request.json();
    const { model, type, stationId } = body;

    if (!model || !type || !stationId) {
      return NextResponse.json({ error: 'model, type, and stationId are required' }, { status: 400 });
    }

    // Load shop data to validate item and get price
    const shopPath = path.join(process.cwd(), 'public/assets/data/shop.json');
    const shopData = JSON.parse(await fs.readFile(shopPath, 'utf8'));

    const shopItem = shopData.find((item: any) => item.model === model && item.type === type);
    if (!shopItem) {
      return NextResponse.json({ error: 'Item not found in shop' }, { status: 404 });
    }

    // Get player data
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

    // Validate level requirement
    if (userLevel < shopItem.unlock_level) {
      return NextResponse.json({
        error: `等级不足: 需要等级 ${shopItem.unlock_level}, 当前等级 ${userLevel}`,
        required_level: shopItem.unlock_level,
        current_level: userLevel,
      }, { status: 403 });
    }

    // Validate sufficient funds
    if (userMoney < shopItem.price) {
      return NextResponse.json({
        error: 'Insufficient funds',
        required: shopItem.price,
        available: userMoney,
      }, { status: 400 });
    }

    // Validate station belongs to user
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('id')
      .eq('id', stationId)
      .eq('user_id', user.id)
      .single();

    if (stationError || !station) {
      return NextResponse.json({ error: 'Station not found or does not belong to you' }, { status: 400 });
    }

    // Create the vehicle at the station
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        user_id: user.id,
        model: model,
        type: type,
        station_id: stationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, model, type, station_id')
      .single();

    if (vehicleError) {
      console.error('Error creating vehicle:', vehicleError);
      return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }

    // Deduct money
    const { error: deductError } = await supabase
      .from('users')
      .update({ money: userMoney - shopItem.price })
      .eq('id', user.id);

    if (deductError) {
      console.error('Error deducting money:', deductError);
      // Clean up the vehicle if money deduction fails
      await supabase.from('vehicles').delete().eq('id', vehicle.id);
      return NextResponse.json({ error: 'Failed to deduct money' }, { status: 500 });
    }

    // Check and award achievements after purchase
    const newAchievements = await checkAndAwardAchievements(supabase, user.id);

    return NextResponse.json({
      success: true,
      vehicle,
      moneySpent: shopItem.price,
      remainingMoney: userMoney - shopItem.price,
      new_achievements: newAchievements,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Shop buy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
