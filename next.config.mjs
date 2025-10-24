/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true  // This is crucial for static export
  },
  assetPrefix: './'
}

export default nextConfig
