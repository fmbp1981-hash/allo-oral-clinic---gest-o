import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
          changeOrigin: true,
        },
      },
    },

    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),

      // Next.js-style public envs (for a smooth migration)
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(env.NEXT_PUBLIC_API_URL || env.VITE_API_URL),
      'process.env.NEXT_PUBLIC_WHATSAPP_PROVIDER': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_PROVIDER || env.VITE_WHATSAPP_PROVIDER),
      'process.env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_BASE_URL': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_BASE_URL || env.VITE_WHATSAPP_EVOLUTION_BASE_URL),
      'process.env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_INSTANCE_NAME': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_INSTANCE_NAME || env.VITE_WHATSAPP_EVOLUTION_INSTANCE_NAME),
      'process.env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_API_KEY': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_EVOLUTION_API_KEY || env.VITE_WHATSAPP_EVOLUTION_API_KEY),
      'process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE_ID': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE_ID || env.VITE_WHATSAPP_BUSINESS_PHONE_ID),
      'process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_TOKEN': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_BUSINESS_TOKEN || env.VITE_WHATSAPP_BUSINESS_TOKEN),
      'process.env.NEXT_PUBLIC_WHATSAPP_ZAPI_URL': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_ZAPI_URL || env.VITE_WHATSAPP_ZAPI_URL),
      'process.env.NEXT_PUBLIC_WHATSAPP_ZAPI_INSTANCE': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_ZAPI_INSTANCE || env.VITE_WHATSAPP_ZAPI_INSTANCE),
      'process.env.NEXT_PUBLIC_WHATSAPP_ZAPI_TOKEN': JSON.stringify(env.NEXT_PUBLIC_WHATSAPP_ZAPI_TOKEN || env.VITE_WHATSAPP_ZAPI_TOKEN)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
