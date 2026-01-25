import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverMode = env.SERVER_MODE || 'default';
  const isWfeMode = env.VITE_WFE_MODE === 'true' || env.VITE_WFE_MODE === '1';

  const localTunnelPlugin = () => ({
    name: 'localtunnel-wfe',
    configureServer(server) {
      if (serverMode !== 'localtunnel') {
        return;
      }

      let tunnel;
      const startTunnel = async () => {
        const { default: localtunnel } = await import('localtunnel');
        tunnel = await localtunnel({
          port: server.config.server.port,
          host: env.LOCALTUNNEL_HOST,
          subdomain: env.LOCALTUNNEL_SUBDOMAIN,
        });

        const label = isWfeMode ? 'Vite WFE' : 'Vite';
        console.log(`${label} LocalTunnel URL: ${tunnel.url}`);

        tunnel.on('error', (error) => {
          console.error('LocalTunnel error', error);
        });
      };

      const closeTunnel = async () => {
        if (!tunnel) {
          return;
        }
        try {
          await tunnel.close();
        } catch (error) {
          console.error('Failed to close LocalTunnel', error);
        }
      };

      startTunnel().catch((error) => {
        console.error('Failed to start LocalTunnel', error);
      });

      server.httpServer?.once('close', () => {
        closeTunnel().catch(() => {});
      });
      process.on('SIGINT', () => {
        closeTunnel().catch(() => {});
      });
      process.on('SIGTERM', () => {
        closeTunnel().catch(() => {});
      });
    },
  });

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), localTunnelPlugin()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': 'http://localhost:4000',
      },
    },
  };
});
