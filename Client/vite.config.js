import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Provides self-signed HTTPS certificate during local development for camera & PNA access
    basicSsl(),
  ],
  server: {
    host: true, // Listen on all local IP addresses (0.0.0.0)
    port: 5173,
    https: true,
  },
});
