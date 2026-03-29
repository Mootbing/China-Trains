import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '../../../utils/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { supabase } = await createPublicClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: email.split('@')[0], // Use part before @ as default name
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
      message: data.user?.email_confirmed_at
        ? 'Account created successfully!'
        : 'Please check your email to confirm your account.'
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
