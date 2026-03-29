import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '../../../utils/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await createPublicClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
