import './globals.css';

export const metadata = {
  title: '확장자 필터 설정',
  description: '차단할 파일 확장자를 관리합니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
