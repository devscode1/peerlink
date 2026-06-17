import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useConnectionStore } from '../store/connectionStore';
import { ConnectionManagerInstance } from '../services/connectionManager';

export default function ConnectingScreen({ navigation }: { navigation: any }) {
  const roomCode = useConnectionStore((s) => s.roomCode);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const isReconnecting = useConnectionStore((s) => s.isReconnecting);
  const isInitiator = useConnectionStore((s) => s.isInitiator);
  const setConnectionState = useConnectionStore((s) => s.setConnectionState);
  const reset = useConnectionStore((s) => s.reset);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [dotCount, setDotCount] = React.useState(0);
  const animationStarted = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!animationStarted.current) {
      animationStarted.current = true;
      if (isInitiator && connectionState === 'WAITING') {
        // Initiator waits for peer to join - WebRTC starts in onPeerJoined callback
      } else if (!isInitiator && connectionState === 'NEGOTIATING') {
        // Joiner - WebRTC already started in joinRoom callback
      }
    }
  }, [isInitiator, connectionState]);

  const handleCancel = () => {
    ConnectionManagerInstance.cancelConnection();
    reset();
    setConnectionState('IDLE');
  };

  const handleCopyCode = () => {
    Clipboard.setString(roomCode || '');
    Alert.alert('Copied', 'Room code copied to clipboard');
  };

  const getStatusMessage = () => {
    if (isReconnecting) return 'Reconnecting';
    switch (connectionState) {
      case 'WAITING':
        return 'Waiting for peer to join';
      case 'NEGOTIATING':
        return 'Establishing connection';
      case 'FAILED':
        return 'Connection failed';
      default:
        return 'Connecting';
    }
  };

  const dots = '.'.repeat(dotCount + 1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              opacity: pulseAnim,
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />

        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />

        <Text style={styles.statusText}>{getStatusMessage()}{dots}</Text>

        {roomCode && connectionState === 'WAITING' && (
          <View style={styles.codeSection}>
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Room Code</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{roomCode}</Text>
            </View>
            <Text style={styles.codeHint}>Share this code with your peer</Text>
          </View>
        )}

        {connectionState === 'NEGOTIATING' && (
          <View style={styles.negotiatingInfo}>
            <Text style={styles.infoText}>
              Exchanging connection details{dots}
            </Text>
            <Text style={styles.infoSubtext}>
              Setting up encrypted peer-to-peer connection
            </Text>
          </View>
        )}

        {connectionState === 'FAILED' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Connection failed. Please try again.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>
            {connectionState === 'FAILED' ? 'Try Again' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    position: 'absolute',
  },
  spinner: { marginBottom: 24 },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 24,
    marginBottom: 32,
  },
  codeSection: { marginBottom: 40, alignItems: 'center', width: '100%' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  codeLabel: { fontSize: 12, color: '#AAA', textTransform: 'uppercase', letterSpacing: 1 },
  copyButton: { paddingHorizontal: 8, paddingVertical: 4 },
  copyButtonText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  codeBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    width: '100%',
    alignItems: 'center',
  },
  codeText: { fontSize: 28, fontWeight: 'bold', color: '#007AFF', letterSpacing: 4 },
  codeHint: { fontSize: 12, color: '#666', marginTop: 8 },
  negotiatingInfo: { marginBottom: 40, alignItems: 'center' },
  infoText: { fontSize: 16, color: '#FFF', marginBottom: 8 },
  infoSubtext: { fontSize: 12, color: '#999', textAlign: 'center' },
  errorContainer: { marginBottom: 20, alignItems: 'center', paddingHorizontal: 24 },
  errorText: { color: '#FF3B30', fontSize: 16, textAlign: 'center' },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  cancelButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
