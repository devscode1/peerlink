import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import ConnectingScreen from './screens/ConnectingScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import FilePreviewScreen from './screens/FilePreviewScreen';
import TransferProgressScreen from './screens/TransferProgressScreen';

import { useConnectionStore } from './store/connectionStore';
import { DatabaseService } from './services/databaseService';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const connectionState = useConnectionStore((s) => s.connectionState);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {connectionState === 'IDLE' && (
        <Stack.Screen name="Home" component={HomeScreen} />
      )}
      {(connectionState === 'WAITING' ||
        connectionState === 'NEGOTIATING' ||
        connectionState === 'FAILED') && (
        <Stack.Screen name="Connecting" component={ConnectingScreen} />
      )}
      {(connectionState === 'CONNECTED_P2P' ||
        connectionState === 'CONNECTED_RELAY' ||
        connectionState === 'RECONNECTING') && (
        <Stack.Screen name="Chat" component={ChatScreen} />
      )}
      {(connectionState === 'CLOSED' ||
        connectionState === 'IDLE') && null}

      <Stack.Screen
        name="FilePreview"
        component={FilePreviewScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="TransferProgress"
        component={TransferProgressScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Settings' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await DatabaseService.getInstance().init();
        setDbReady(true);
      } catch (e) {
        console.error('DB init failed', e);
        setDbReady(true);
      }
    })();
  }, []);

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
