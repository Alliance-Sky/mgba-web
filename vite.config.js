import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import fs from 'fs';
import path from 'path';

const sslKeyPath = path.resolve(__dirname, 'key.pem');
const sslCertPath = path.resolve(__dirname, 'cert.pem');
const hasSsl = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

export default defineConfig(({ mode }) => {
  const pkgPath = path.resolve(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const appVersion = mode === 'development' ? `${pkg.version}-dev` : `${pkg.version}-${Date.now()}`;

  return {
    plugins: [
      react(),
      compression({
        algorithms: ['gzip'],
        include: /\.(js|mjs|json|css|html|wasm)$/i,
        threshold: 1024,
        deleteOriginalAssets: true,
      })
    ],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      port: 3000,
      host: true,
      https: hasSsl ? {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      } : false,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    }
  };
});

