import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useConnectionStore, useSettingsStore } from '../store/connectionStore';
import { ConnectionManagerInstance } from '../services/connectionManager';
import { isValidRoomCode } from '../../../shared/utils';

export default function HomeScreen({ navigation }: { navigation: any }) {
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setConnectionState = useConnectionStore((s) => s.setConnectionState);
  const setRoomCodeStore = useConnectionStore((s) => s.setRoomCode);
  const setPeerInfo = useConnectionStore((s) => s.setPeerInfo);
  const setLocalPeerId = useConnectionStore((s) => s.setLocalPeerId);
  const settingsDisplayName = useSettingsStore((s) => s.displayName);
  const roomCodeFromStore = useConnectionStore((s) => s.roomCode);

  useEffect(() => {
    if (settingsDisplayName && !displayName) {
      setDisplayName(settingsDisplayName);
    }
  }, [settingsDisplayName]);

  const handleCreateRoom = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const code = await ConnectionManagerInstance.createRoom(displayName);

      setConnectionState('WAITING');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!isValidRoomCode(roomCode)) {
      setError('Invalid room code. Use 6 alphanumeric characters');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await ConnectionManagerInstance.joinRoom(roomCode, displayName);

      setConnectionState('NEGOTIATING');
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (roomCodeFromStore) {
      Clipboard.setString(roomCodeFromStore);
      Alert.alert('Copied', 'Room code copied to clipboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>⚙</Text>
        </TouchableOpacity>

        <Text style={styles.title}>PeerLink</Text>
        <Text style={styles.subtitle}>P2P Encrypted Chat &amp; File Transfer</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreateRoom}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Create Room</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Room Code (6 characters)"
            placeholderTextColor="#999"
            value={roomCode}
            onChangeText={(text) => setRoomCode(text.toUpperCase())}
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, styles.joinButton, loading && styles.buttonDisabled]}
            onPress={handleJoinRoom}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Join Room</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  settingsButton: { position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 10 },
  settingsButtonText: { fontSize: 24 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#AAA', textAlign: 'center', marginBottom: 40 },
  form: { marginTop: 20 },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  createButton: { backgroundColor: '#007AFF' },
  joinButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#3a3a3a' },
  dividerText: { color: '#666', marginHorizontal: 12, fontSize: 14 },
  errorText: { color: '#FF3B30', textAlign: 'center', marginTop: 16, fontSize: 14 },
  footer: { padding: 16, alignItems: 'center' },
  versionText: { color: '#666', fontSize: 12 },
});
