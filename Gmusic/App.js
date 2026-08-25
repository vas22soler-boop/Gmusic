import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider

} from 'react-native-safe-area-context';

import MusicPlayer from '.screens/MusicPlayer';

export default function App() {
  return (
    <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
      <StatusBar style="light" translucent/>
    </SafeAreaProvider>
  );
}

