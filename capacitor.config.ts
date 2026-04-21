import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gearbox.workshop',
  appName: 'LaluzGarage',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#0B0D11',
      style: 'DARK'
    }
  }
};

export default config;
