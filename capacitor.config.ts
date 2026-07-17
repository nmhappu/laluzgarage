import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gearbox.workshop',
  appName: 'LaluzGarage',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#0B0D11',
      style: 'DARK'
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0B0D11",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
