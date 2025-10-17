import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { BlockedExtension, BlockedExtensionResponse } from '@/types';

export async function GET() {
  try {
    // blocked_extensions 테이블에서 모든 name 조회
    const results = await query<BlockedExtension[]>(
      'SELECT name FROM blocked_extensions ORDER BY name ASC'
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
