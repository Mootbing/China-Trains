import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '../../../../utils/supabase-server';

// DELETE /api/routes/saved/[id] — delete a saved route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await createAuthenticatedClient();

    // Verify ownership and delete
    const { error } = await supabase
      .from('saved_routes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete saved route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
