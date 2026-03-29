import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '../../../utils/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await createPublicClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      session,
      user: session?.user || null
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
