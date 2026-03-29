import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../../utils/supabase-server';

const UPGRADE_COSTS: Record<number, number> = {
  2: 15000,
  3: 40000,
  4: 100000,
  5: 250000,
};

const UPGRADE_LEVEL_REQUIREMENTS: Record<number, number> = {
  2: 2,
  3: 5,
  4: 10,
  5: 15,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const { supabase, user } = await createAuthenticatedClient();

    // Get station
    const { data: station, error: stationError } = await supabase
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .eq('user_id', user.id)
      .single();

    if (stationError || !station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    const nextLevel = station.level + 1;

    if (nextLevel > 5) {
      return NextResponse.json({ error: 'Station is already at max level' }, { status: 400 });
    }

    const upgradeCost = UPGRADE_COSTS[nextLevel];
    if (!upgradeCost) {
      return NextResponse.json({ error: 'Invalid upgrade level' }, { status: 400 });
    }

    // Get player money and xp
    const { data: playerData, error: playerError } = await supabase
      .from('users')
      .select('money, xp')
      .eq('id', user.id)
      .single();

    if (playerError) {
      return NextResponse.json({ error: 'Failed to get player data' }, { status: 500 });
    }

    // Check player level requirement
    const playerLevel = Math.floor((playerData.xp || 0) / 1000) + 1;
    const requiredLevel = UPGRADE_LEVEL_REQUIREMENTS[nextLevel] || 1;
    if (playerLevel < requiredLevel) {
      return NextResponse.json({
        error: `等级不足: 升级到${nextLevel}等站需要玩家等级 ${requiredLevel}, 当前等级 ${playerLevel}`,
        required_level: requiredLevel,
        current_level: playerLevel,
      }, { status: 403 });
    }

    if (playerData.money < upgradeCost) {
      return NextResponse.json({
        error: 'Insufficient funds',
        required: upgradeCost,
        available: playerData.money,
      }, { status: 400 });
    }

    // Upgrade station level
    const { error: upgradeError } = await supabase
      .from('stations')
      .update({
        level: nextLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .eq('user_id', user.id);

    if (upgradeError) {
      return NextResponse.json({ error: 'Failed to upgrade station' }, { status: 500 });
    }

    // Deduct money
    const { error: deductError } = await supabase
      .from('users')
      .update({ money: playerData.money - upgradeCost })
      .eq('id', user.id);

    if (deductError) {
      // Roll back station level
      await supabase
        .from('stations')
        .update({ level: station.level })
        .eq('id', stationId);
      return NextResponse.json({ error: 'Failed to deduct money' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newLevel: nextLevel,
      moneySpent: upgradeCost,
      remainingMoney: playerData.money - upgradeCost,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Station upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
