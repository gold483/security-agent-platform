# Sentinel / 보안관제 플랫폼 (Security Agent Platform)

**Sentinel**은 여러 사업장(하남, 평동, 소촌 등)의 Windows PC 에이전트를 중앙에서 통합 관제하고, Windows Defender 보안 상태 모니터링, 위협 격리(Quarantine) 추적, 원격 검사 명령 수행, 그리고 Apache Guacamole 기반의 안전한 RDP 원격제어 및 감사 로그를 제공하는 엔터프라이즈 보안관제 웹 플랫폼입니다.

---

## 🌟 주요 기능 (Key Features)

1. **에이전트 등록 및 관리 (Agent Enrollment & Management)**
   - 하남, 평동, 소촌 등 사업장별 PC 에이전트 목록 및 연결 상태(온라인/오프라인) 실시간 조회
   - 등록 토큰(Registration Token) 발급 및 관리 기능

2. **Windows Defender 보안 상태 관제 (Defender Telemetry)**
   - 에이전트별 실시간 보호 활성화 여부, 백신 상태, 서명 버전 및 최신화 현황 모니터링
   - 에이전트 주기적 하트비트 수신 및 자동 온라인/오프라인 상태 판정

3. **격리소 위협 관리 (Quarantine Watch)**
   - Windows Defender가 탐지 및 격리한 위협 항목 목록 조회 (파일명, 위협명, 탐지 시각, 에이전트 매핑)

4. **원격 검사 명령 제어 (Remote Inspection Commands)**
   - 관리자 권한으로 특정 에이전트에 **Full Scan**, **Quick Scan**, **서명 업데이트** 명령 전송
   - 큐(Queue) 기반 명령 전달 및 에이전트 폴링, 실행 결과 및 상태(대기 중, 실행 중, 성공, 실패) 추적

5. **Apache Guacamole RDP 원격 제어 & 감사 로그 (RDP Gateway & Audit Trail)**
   - 외부망 직접 노출을 차단하는 Apache Guacamole 연동 구조
   - 30초 유효 기간의 1회성 접속 토큰(One-time Connection Token) 발급
   - RDP 세션 접속 이력 및 관리자 작업에 대한 변경 불가능한(Immutable) 감사 로그(Audit Trail) 기록

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Radix UI, tRPC Client, Wouter
- **Backend**: Express, tRPC 11, Node.js (ESM), Drizzle ORM
- **Database**: MySQL / TiDB (Relational database with automated migrations)
- **Testing**: Vitest (Unit and authorization test suites)

---

## 📂 프로젝트 구조 (Project Structure)

```
client/
  src/
    components/      # 공통 레이아웃 및 UI 컴포넌트 (DashboardLayout 등)
    pages/           # 관제 대시보드, 에이전트 목록, 에이전트 상세, 검역소, 검사 명령, RDP 제어, 감사 로그 화면
    lib/             # tRPC 클라이언트 설정
server/
  _core/             # 프레임워크 롸우팅, 인증, 환경 변수 설정
  db.ts              # 데이터베이스 쿼리 헬퍼 및 비즈니스 로직
  routers.ts         # tRPC API 라우터 (관리자 및 에이전트 수집 엔드포인트)
  *.test.ts          # Vitest 단위 및 권한 테스트
drizzle/
  schema.ts          # 데이터베이스 스키마 정의 (sites, agents, defenderStatus, quarantineRecords, inspectionCommands, rdpSessions, auditLogs)
  migrations/        # SQL 마이그레이션 파일
```

---

## 🚀 로컬 실행 방법 (Getting Started)

1. **의존성 설치**:
   ```bash
   pnpm install
   ```

2. **환경 변수 설정**:
   `.env` 파일을 생성하고 데이터베이스 접속 정보와 Guacamole 게이트웨이 주소를 설정합니다.
   ```env
   DATABASE_URL=mysql://user:password@localhost:3306/security_platform
   GUACAMOLE_BASE_URL=https://rdp.example.internal/guacamole
   JWT_SECRET=your_jwt_secret
   ```

3. **데이터베이스 마이그레이션 적용**:
   ```bash
   pnpm db:push
   ```

4. **개발 서버 실행**:
   ```bash
   pnpm dev
   ```

5. **테스트 실행**:
   ```bash
   pnpm test
   ```

---

## 📄 라이선스 (License)

This project is licensed under the MIT License.
