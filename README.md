# 확장자 필터 설정 (마드라스체크 SaaS부문 개발자 과제)

파일 확장자 차단 관리를 위한 Next.js 15 웹 애플리케이션입니다. MySQL 데이터베이스와 연동하여 차단할 파일 확장자를 실시간으로 관리할 수 있습니다.

- 작성자 : 권보민
- 배포 주소 : https://extensionblockingconfiguration-svc-273783173383.asia-northeast3.run.app/

## 주요 기능

- **고정 확장자 관리**: 7개의 기본 확장자(bat, cmd, com, cpl, exe, scr, js) 차단 설정
- **커스텀 확장자 관리**: 최대 200개의 사용자 정의 확장자 추가 및 관리
- **실시간 저장**: 모든 변경사항이 즉시 데이터베이스에 반영
- **Optimistic UI**: 빠른 사용자 경험을 위한 즉각적인 UI 업데이트
- **로딩 상태 표시**: 초기 로딩 및 개별 작업별 스피너 표시
- **Toast 알림**: 작업 성공/실패에 대한 시각적 피드백

## 기술 스택

- **프레임워크**: Next.js 15
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS v4
- **데이터베이스**: MySQL (Google Cloud SQL)
- **배포**: Google Cloud Run
- **ORM**: mysql2/promise (Connection Pooling)

## 시작하기

### 필수 요구사항

- Node.js 20 이상
- MySQL 데이터베이스
- npm 또는 yarn

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# 데이터베이스 연결 설정
DB_HOST=localhost           # 또는 Cloud SQL Unix socket 경로
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=3306

# SSL 설정 (선택사항)
DB_SSL=true
DB_SSL_CA_PATH=/path/to/server-ca.pem
DB_SSL_CERT_PATH=/path/to/client-cert.pem
DB_SSL_KEY_PATH=/path/to/client-key.pem
```

### 데이터베이스 스키마

```sql
CREATE TABLE blocked_extensions (
  ext_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  blocked TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
);
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 프로젝트 구조

```
.
├── app/
│   ├── api/
│   │   └── blocked-extensions/
│   │       ├── route.ts              # Collection 엔드포인트 (GET, POST)
│   │       └── [ext_id]/
│   │           └── route.ts          # Resource 엔드포인트 (GET, PUT, DELETE)
│   ├── components/
│   │   └── ExtensionManager.tsx      # 메인 UI 컴포넌트
│   ├── globals.css                   # 전역 스타일 및 커스텀 애니메이션
│   ├── layout.tsx                    # 루트 레이아웃
│   └── page.tsx                      # 홈 페이지
├── lib/
│   └── db.ts                         # MySQL 연결 풀 관리
├── types/
│   └── index.ts                      # TypeScript 타입 정의
├── cloudbuild.yaml                   # Cloud Build 설정
└── postcss.config.mjs                # PostCSS 설정 (Tailwind CSS v4)
```

## API 엔드포인트

### Collection 엔드포인트

**GET** `/api/blocked-extensions`
- 모든 차단 확장자 목록 조회
- 응답: `{ extensions: BlockedExtension[], count: number }`

**POST** `/api/blocked-extensions`
- 새 확장자 추가 또는 기존 확장자 활성화 (Upsert)
- 요청: `{ name: string, blocked: number }`
- 응답: `{ ext_id: number, message: string }`

### Resource 엔드포인트

**GET** `/api/blocked-extensions/[ext_id]`
- 특정 확장자 조회
- 응답: `BlockedExtension` 객체

**PUT** `/api/blocked-extensions/[ext_id]`
- 차단 상태 업데이트
- 요청: `{ blocked: number }`
- 응답: `{ message: string }`

**DELETE** `/api/blocked-extensions/[ext_id]`
- 확장자 삭제 (현재 UI에서 미사용)
- 응답: `{ message: string }`

## 주요 특징

### Optimistic UI

모든 작업(추가, 토글, 제거)이 UI에 즉시 반영되며, 서버 요청 실패 시 자동으로 롤백됩니다.

- **고정 확장자 토글**: 체크박스 즉시 변경 → API 호출 → 실패 시 롤백
- **커스텀 확장자 추가**: 임시 ID로 즉시 추가 → 실제 ID로 교체 → 실패 시 제거
- **커스텀 확장자 제거**: 즉시 제거 표시 → API 호출 → 실패 시 복원

### 로딩 상태 관리

- **초기 로딩**: 전체 화면 스피너로 데이터 로딩 중 표시
- **개별 작업 로딩**: 각 항목별 작은 스피너로 저장 중 표시
- **입력 필드 비활성화**: 저장 중 중복 요청 방지

### 입력 검증

- **최대 길이**: 20바이트 제한 (실시간 검증)
- **중복 체크**: 이미 존재하는 확장자 추가 방지
- **고정 확장자 체크**: 고정 확장자는 커스텀으로 추가 불가

### 소프트 삭제

확장자 제거 시 레코드를 삭제하지 않고 `blocked=0`으로 설정하여 데이터 보존.

## Cloud Run 배포

Google Cloud Build를 통한 자동 배포:

Google Cloud Build의 트리거가 Github push를 자동으로 감지하고 빌드 및 배포 (cloudbuild.yaml 파일 참조)

또는

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-northeast3,_REPO=your-repo,_SERVICE=extension-filter,_CLOUD_SQL_CONNECTION=your-connection-string,_DB_PASSWORD_SECRET=projects/PROJECT_ID/secrets/db-password/versions/latest
```

### Cloud SQL 연결 모드

1. **로컬 개발 (TCP)**: `DB_HOST`를 IP 주소로 설정
2. **Cloud SQL Proxy**: `DB_HOST`를 `localhost`로 설정
3. **Cloud Run**: `DB_HOST`를 `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`으로 설정

## 라이선스

Private