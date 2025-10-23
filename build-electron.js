const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Building Mythic Zulip...');

try {
  // Clean previous builds
  if (fs.existsSync('out')) {
    console.log('🧹 Cleaning previous build...');
    execSync('rm -rf out', { stdio: 'inherit' });
  }

  // Build Next.js app
  console.log('📦 Building Next.js app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verify build output
  if (!fs.existsSync('out')) {
    throw new Error('Next.js build failed - no "out" directory created');
  }

  console.log('✅ Next.js build successful! Building installer...');
  
  // Build Electron app
  execSync('npx electron-builder --win --x64', { stdio: 'inherit' });
  
  console.log('🎉 Build complete! Check the "dist" folder.');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
