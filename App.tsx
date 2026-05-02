import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LifestyleApp } from './src/LifestyleApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LifestyleApp />
    </SafeAreaProvider>
  );
}
