export const metadata = {
  title: '소개 페이지',
  description: '간단한 소개 페이지입니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
