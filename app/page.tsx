import { BlockedExtensionResponse } from '@/types';

// 동적 렌더링 강제 (빌드 타임 정적 생성 방지)
export const dynamic = 'force-dynamic';

async function getBlockedExtensions(): Promise<BlockedExtensionResponse> {
  try {
    // Server Component는 런타임에만 실행되므로 항상 localhost 사용 가능
    const port = process.env.PORT || '3000';
    const response = await fetch(`http://localhost:${port}/api/blocked-extensions`, {
      cache: 'no-store' // 항상 최신 데이터 가져오기
    });

    if (!response.ok) {
      throw new Error('Failed to fetch blocked extensions');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching blocked extensions:', error);
    return { extensions: [], count: 0 };
  }
}

export default async function Home() {
  const data = await getBlockedExtensions();

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        color: '#333'
      }}>
        차단된 확장 프로그램
      </h1>
      <p style={{
        fontSize: '1.25rem',
        color: '#666',
        marginBottom: '2rem'
      }}>
        총 {data.count}개의 확장 프로그램이 차단되었습니다.
      </p>

      {data.extensions.length > 0 ? (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          maxWidth: '600px',
          width: '100%'
        }}>
          {data.extensions.map((name, index) => (
            <li key={index} style={{
              padding: '1rem',
              marginBottom: '0.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{
          fontSize: '1rem',
          color: '#999',
          fontStyle: 'italic'
        }}>
          차단된 확장 프로그램이 없습니다.
        </p>
      )}
    </main>
  )
}
