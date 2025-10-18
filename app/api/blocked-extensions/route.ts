import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BlockedExtension, BlockedExtensionResponse } from '@/types';

export async function GET() {
  try {
    // blocked_extensions 테이블에서 모든 확장자 조회
    const results = await query<BlockedExtension[]>(
      'SELECT * FROM blocked_extensions ORDER BY ext_id ASC'
    );

    const response: BlockedExtensionResponse = {
      extensions: results,
      count: results.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch blocked extensions:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch blocked extensions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, blocked = 1 } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Extension name is required' },
        { status: 400 }
      );
    }

    // name으로 기존 레코드 조회
    const existing = await query<BlockedExtension[]>(
      'SELECT ext_id, blocked FROM blocked_extensions WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      // 기존 레코드가 있으면 blocked를 1로 업데이트
      const ext_id = existing[0].ext_id;
      await query(
        'UPDATE blocked_extensions SET blocked = 1, updated_at = CURRENT_TIMESTAMP WHERE ext_id = ?',
        [ext_id]
      );

      return NextResponse.json(
        { ext_id, message: 'Extension updated successfully' },
        { status: 200 }
      );
    } else {
      // 신규 레코드 INSERT
      const result: any = await query(
        'INSERT INTO blocked_extensions (name, blocked) VALUES (?, ?)',
        [name, blocked]
      );

      return NextResponse.json(
        { ext_id: result.insertId, message: 'Extension added successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Failed to add blocked extension:', error);

    return NextResponse.json(
      {
        error: 'Failed to add blocked extension',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
