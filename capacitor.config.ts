import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.appu.laluzgarage',
  appName: 'LaluzGarage',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#0B0D11',
      style: 'DARK'
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#0B0D11",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    }
  }
};

export default config;
