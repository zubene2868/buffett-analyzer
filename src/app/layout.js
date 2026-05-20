import './globals.css';

export const metadata = {
  title: 'Buffett Value Analyzer — 워렌 버핏 스타일 가치투자 분석',
  description: 'AI 기반 워렌 버핏 스타일 가치투자 분석 시스템. 종목 분석, 추천 랭킹, 매도 시그널을 제공합니다.',
  manifest: '/manifest.json',
  themeColor: '#0a0e17',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Buffett Analyzer',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
