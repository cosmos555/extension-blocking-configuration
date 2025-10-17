import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BlockedExtension, BlockedExtensionResponse } from '@/types';

export async function GET() {
  try {
    // blocked_extensions 테이블에서 모든 확장자 조회
    const results = await query<BlockedExtension[]>(
      'SELECT * FROM blocked_extensions ORDER BY name ASC'
    );

    // name만 추출하여 배열로 변환
    const extensionNames = results.map(row => row.name);

    const response: BlockedExtensionResponse = {
      extensions: extensionNames,
      count: extensionNames.length
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

    // INSERT 쿼리 실행
    await query(
      'INSERT INTO blocked_extensions (name, blocked) VALUES (?, ?)',
      [name, blocked]
    );

    return NextResponse.json(
      { message: 'Extension added successfully' },
      { status: 201 }
    );
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
