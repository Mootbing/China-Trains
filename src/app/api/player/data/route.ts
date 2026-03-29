import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../utils/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    // Get player data from users table (only money and xp)
    const { data, error } = await supabase
      .from('users')
      .select('money, xp')
      .eq('id', user.id)
      .single();

    if (error) {
      // If user data doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: newData, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            money: 10000,
            xp: 0
          })
          .select('money, xp')
          .single();

        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        return NextResponse.json(newData);
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get player data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedClient();

    const body = await request.json();
    const { money, xp } = body;

    // Update user data in users table (only money and xp)
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        money,
        xp
      })
      .select('money, xp')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update player data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
