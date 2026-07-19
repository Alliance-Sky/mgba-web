import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const sslKeyPath = path.resolve(__dirname, 'key.pem');
const sslCertPath = path.resolve(__dirname, 'cert.pem');
const hasSsl = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

export default defineConfig({
  plugins: [react()],
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
});
