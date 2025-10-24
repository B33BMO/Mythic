/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',  // This forces Next.js to build to 'out' folder
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: './'
}

export default nextConfig
