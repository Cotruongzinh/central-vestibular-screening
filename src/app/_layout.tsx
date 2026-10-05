import { QuickNavigationMenu } from '@/components/navigation/QuickNavigationMenu';
import { AppLanguageProvider } from '@/providers/AppLanguageProvider';
import { InactivitySessionProvider } from '@/providers/InactivitySessionProvider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <AppLanguageProvider>
        <InactivitySessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <QuickNavigationMenu />
        </InactivitySessionProvider>
      </AppLanguageProvider>
    </>
  );
}
