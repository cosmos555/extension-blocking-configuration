import mysql from 'mysql2/promise';
import fs from 'fs';

// DB_HOST가 Unix 소켓 경로인지 확인 (/cloudsql/로 시작하면 소켓)
const dbHost = process.env.DB_HOST || 'localhost';
const isUnixSocket = dbHost.startsWith('/cloudsql/');

// SSL 설정 준비
const sslEnabled = process.env.DB_SSL === 'true';
let sslConfig = undefined;

if (sslEnabled && !isUnixSocket) {
  // SSL 인증서 경로가 제공된 경우
  if (process.env.DB_SSL_CA) {
    sslConfig = {
      ca: fs.readFileSync(process.env.DB_SSL_CA),
      rejectUnauthorized: true
    };
  } else {
    // 인증서 없이 SSL 사용 (Cloud SQL 공개 IP 접속 시)
    sslConfig = {
      rejectUnauthorized: false
    };
  }
}

const dbConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'app',
  // Unix 소켓 연결 (Cloud Run 환경)
  ...(isUnixSocket ? {
    socketPath: dbHost
  } : {
    // TCP 연결 (로컬 개발 환경 또는 공개 IP)
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '3306')
  }),
  // SSL 설정 (TCP 연결 시에만 적용)
  ...(sslConfig && { ssl: sslConfig }),
  // 연결 풀 설정
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

// 연결 테스트 함수
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// 쿼리 실행 함수
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  try {
    const [results] = await pool.execute(sql, params);
    return results as T;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
}

export default pool;
