import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BlockedExtension } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ext_id: string }> }
) {
  try {
    const { ext_id: ext_id_str } = await params;
    const ext_id = parseInt(ext_id_str);

    if (isNaN(ext_id)) {
      return NextResponse.json(
        { error: 'Invalid extension ID' },
        { status: 400 }
      );
    }

    const results = await query<BlockedExtension[]>(
      'SELECT * FROM blocked_extensions WHERE ext_id = ?',
      [ext_id]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Extension not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error('Failed to fetch blocked extension:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch blocked extension',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ext_id: string }> }
) {
  try {
    const { ext_id: ext_id_str } = await params;
    const ext_id = parseInt(ext_id_str);

    if (isNaN(ext_id)) {
      return NextResponse.json(
        { error: 'Invalid extension ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { blocked } = body;

    if (blocked === undefined || typeof blocked !== 'number') {
      return NextResponse.json(
        { error: 'Blocked status is required' },
        { status: 400 }
      );
    }

    // UPDATE 쿼리 실행 (blocked 필드와 updated_at 갱신)
    await query(
      'UPDATE blocked_extensions SET blocked = ?, updated_at = CURRENT_TIMESTAMP WHERE ext_id = ?',
      [blocked, ext_id]
    );

    return NextResponse.json(
      { message: 'Extension updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update blocked extension:', error);

    return NextResponse.json(
      {
        error: 'Failed to update blocked extension',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ext_id: string }> }
) {
  try {
    const { ext_id: ext_id_str } = await params;
    const ext_id = parseInt(ext_id_str);

    if (isNaN(ext_id)) {
      return NextResponse.json(
        { error: 'Invalid extension ID' },
        { status: 400 }
      );
    }

    // DELETE 쿼리 실행
    await query(
      'DELETE FROM blocked_extensions WHERE ext_id = ?',
      [ext_id]
    );

    return NextResponse.json(
      { message: 'Extension deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete blocked extension:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete blocked extension',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
