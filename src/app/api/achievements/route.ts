import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../utils/supabase-server';
import { ACHIEVEMENTS, AchievementDef } from '../../utils/achievements';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    // Fetch all unlocked achievements for the user
    const { data: unlocked, error } = await supabase
      .from('achievements')
      .select('achievement_key, unlocked_at')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create a lookup for unlocked achievements
    const unlockedMap: Record<string, string> = {};
    (unlocked || []).forEach((a: any) => {
      unlockedMap[a.achievement_key] = a.unlocked_at;
    });

    // Enrich all achievement definitions with unlock status
    const achievements = ACHIEVEMENTS.map((def: AchievementDef) => ({
      ...def,
      unlocked: !!unlockedMap[def.key],
      unlocked_at: unlockedMap[def.key] || null,
    }));

    return NextResponse.json({ achievements });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
