import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './data/auth';
import { DataProvider } from './data/store';
import { ThemeProvider } from './data/theme';
import { ViewStateProvider } from './data/viewState';
import { Shell } from './app/Shell';
import { LoadingScreen, LoginScreen, PendingApprovalScreen, ThemePickerScreen } from './screens/auth/AuthScreens';

/** Sign-in states cross-fade (Crossfade in LaluzApp.kt); the URL is kept for after sign-in. */
function Root() {
  const { screen } = useAuth();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={screen} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'unauthenticated' && <LoginScreen />}
        {screen === 'pending' && <PendingApprovalScreen />}
        {screen === 'choose-theme' && <ThemePickerScreen />}
        {screen === 'authenticated' && <Shell />}
      </motion.div>
    </AnimatePresence>
  );
}

const router = createBrowserRouter([{ path: '*', element: <Root /> }]);

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ViewStateProvider>
              <RouterProvider router={router} />
            </ViewStateProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
