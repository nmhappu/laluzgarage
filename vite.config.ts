import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

function syncColoursPlugin() {
  return {
    name: 'sync-colours',
    buildStart() {
      const xmlPath = path.resolve(__dirname, 'src/styles/colours.xml');
      const cssPath = path.resolve(__dirname, 'src/index.css');

      if (fs.existsSync(xmlPath)) {
        const xml = fs.readFileSync(xmlPath, 'utf-8');
        const colorRegex = /<color name="([^"]+)">([^<]+)<\/color>/g;
        const colours: Record<string, string> = {};

        let match;
        while ((match = colorRegex.exec(xml)) !== null) {
          colours[match[1]] = match[2];
        }

        let css = fs.readFileSync(cssPath, 'utf-8');

        const replaceVar = (cssStr: string, varName: string, value: string) => {
          if (!value) return cssStr;
          const regex = new RegExp(`(--${varName}:\\s*)[^;]+;`, 'g');
          return cssStr.replace(regex, `$1${value};`);
        };

        // Dark Theme
        css = replaceVar(css, 'bg', colours.bg_dark);
        css = replaceVar(css, 'fg', colours.fg_dark);
        css = replaceVar(css, 'card-bg', colours.card_bg_dark);
        css = replaceVar(css, 'surface-bg', colours.surface_bg_dark);
        css = replaceVar(css, 'popover-bg', colours.popover_bg_dark);
        css = replaceVar(css, 'muted-bg', colours.muted_bg_dark);
        css = replaceVar(css, 'muted-fg', colours.muted_fg_dark);
        css = replaceVar(css, 'border-color', colours.border_color_dark);
        css = replaceVar(css, 'status-success', colours.success_dark);
        css = replaceVar(css, 'status-pending', colours.pending_dark);
        css = replaceVar(css, 'status-urgent', colours.urgent_dark);

        // Light Theme Section
        const lightSectionRegex = /\[data-theme="light"\]\s*{([^}]+)}/;
        const lightSectionMatch = css.match(lightSectionRegex);
        if (lightSectionMatch) {
          let lightSection = lightSectionMatch[1];
          lightSection = replaceVar(lightSection, 'bg', colours.bg_light);
          lightSection = replaceVar(lightSection, 'fg', colours.fg_light);
          lightSection = replaceVar(lightSection, 'card-bg', colours.card_bg_light);
          lightSection = replaceVar(lightSection, 'surface-bg', colours.surface_bg_light);
          lightSection = replaceVar(lightSection, 'popover-bg', colours.popover_bg_light);
          lightSection = replaceVar(lightSection, 'muted-bg', colours.muted_bg_light);
          lightSection = replaceVar(lightSection, 'muted-fg', colours.muted_fg_light);
          lightSection = replaceVar(lightSection, 'border-color', colours.border_color_light);
          lightSection = replaceVar(lightSection, 'status-success', colours.success_light);
          lightSection = replaceVar(lightSection, 'status-pending', colours.pending_light);
          lightSection = replaceVar(lightSection, 'status-urgent', colours.urgent_light);
          css = css.replace(lightSectionRegex, `[data-theme="light"] {${lightSection}}`);
        }

        // Theme Block
        const themeBlockRegex = /@theme\s*{([^}]+)}/;
        const themeBlockMatch = css.match(themeBlockRegex);
        if (themeBlockMatch) {
          let themeBlock = themeBlockMatch[1];
          themeBlock = replaceVar(themeBlock, 'color-primary', colours.primary);
          themeBlock = replaceVar(themeBlock, 'color-secondary', colours.secondary);
          themeBlock = replaceVar(themeBlock, 'color-destructive', colours.destructive);
          themeBlock = replaceVar(themeBlock, 'color-workshop-warning', colours.warning);
          css = css.replace(themeBlockRegex, `@theme {${themeBlock}}`);
        }

        fs.writeFileSync(cssPath, css);
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [syncColoursPlugin(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            'vendor-charts': ['recharts'],
            'vendor-ui': ['lucide-react', 'motion'],
          },
        },
      },
    },
  };
});
