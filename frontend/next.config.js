/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      // S3バケットのドメインを後で追加
      // 'okiteru-photos.s3.ap-northeast-1.amazonaws.com'
    ],
  },
  // 環境変数
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
