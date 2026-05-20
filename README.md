# 📊 Buffett Value Analyzer

워렌 버핏 스타일 AI 가치투자 분석 시스템

## 기능

- **🔍 종목 분석** — 티커 입력 시 AI가 버핏의 8가지 핵심 지표로 분석
- **🏆 추천 랭킹** — 카테고리별(전체/한국/미국/배당) AI 실시간 종목 추천
- **🚨 매도 시그널** — 금리·환율·PER 등 매크로 지표 AI 자동 스캔

---

## 🚀 5분 안에 배포하기 (Vercel, 무료)

### 1단계: 준비물

- **GitHub 계정** (없으면 https://github.com 에서 가입)
- **Anthropic API 키** (https://console.anthropic.com 에서 발급)
- **Vercel 계정** (https://vercel.com 에서 GitHub으로 가입)

### 2단계: GitHub에 코드 올리기

```bash
# 1. 이 폴더를 GitHub에 새 저장소로 올립니다
cd buffett-app
git init
git add .
git commit -m "Initial commit"

# 2. GitHub에서 새 저장소를 만들고 연결합니다
git remote add origin https://github.com/[내계정]/buffett-analyzer.git
git branch -M main
git push -u origin main
```

또는 GitHub 웹사이트에서 직접 저장소를 만들고 파일을 드래그해서 올릴 수도 있습니다.

### 3단계: Vercel에서 배포

1. https://vercel.com 에 로그인
2. **"New Project"** 클릭
3. GitHub 저장소 목록에서 **buffett-analyzer** 선택
4. **Environment Variables** 섹션에서:
   - Name: `ANTHROPIC_API_KEY`
   - Value: 발급받은 API 키 입력
5. **"Deploy"** 클릭

✅ 끝! 약 1-2분 후 `https://buffett-analyzer.vercel.app` 같은 URL이 생성됩니다.

### 4단계: 지인에게 공유

- 생성된 URL을 카카오톡, 문자 등으로 공유하면 됩니다
- 받는 사람은 별도 설치 없이 브라우저에서 바로 사용 가능합니다

### 📱 스마트폰에서 앱처럼 사용하기

**iPhone:**
1. Safari에서 배포된 URL 접속
2. 하단 공유 버튼(□↑) 탭
3. "홈 화면에 추가" 선택

**Android:**
1. Chrome에서 배포된 URL 접속
2. 메뉴(⋮) → "홈 화면에 추가" 선택

---

## 🛠 로컬에서 개발/테스트

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 ANTHROPIC_API_KEY 입력

# 개발 서버 시작
npm run dev
# http://localhost:3000 에서 확인
```

---

## 📁 프로젝트 구조

```
buffett-app/
├── src/app/
│   ├── layout.js          # 루트 레이아웃 (PWA 메타태그)
│   ├── page.js            # 메인 앱 컴포넌트
│   ├── globals.css         # 글로벌 스타일
│   └── api/claude/
│       └── route.js       # API 프록시 (키 보호)
├── public/
│   └── manifest.json      # PWA 설정
├── package.json
├── next.config.js
├── .env.example
└── README.md
```

## 💰 비용 안내

- **Vercel 호스팅**: 무료 (개인 프로젝트)
- **Anthropic API**: 사용량에 따라 과금
  - Claude Sonnet: 입력 $3 / 출력 $15 (백만 토큰당)
  - 종목 1회 분석 ≈ $0.01~0.02 수준
  - 월 100회 사용 시 약 $1~2 예상

## ⚠️ 주의사항

- 이 도구는 투자 조언이 아닌 분석 프레임워크입니다
- AI 추정치는 실제 재무제표와 다를 수 있습니다
- 실제 투자 전에는 반드시 공식 재무데이터를 확인하세요
- API 키는 절대 프론트엔드 코드에 노출하지 마세요
