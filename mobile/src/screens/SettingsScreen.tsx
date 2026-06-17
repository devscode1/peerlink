import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSettingsStore, useMessageStore } from '../store/connectionStore';
import { DatabaseService } from '../services/databaseService';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const displayName = useSettingsStore((s) => s.displayName);
  const signalingServerUrl = useSettingsStore((s) => s.signalingServerUrl);
  const customTurnUrl = useSettingsStore((s) => s.customTurnUrl);
  const customTurnUsername = useSettingsStore((s) => s.customTurnUsername);
  const customTurnCredential = useSettingsStore((s) => s.customTurnCredential);

  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const setSignalingServerUrl = useSettingsStore((s) => s.setSignalingServerUrl);
  const setCustomTurn = useSettingsStore((s) => s.setCustomTurn);
  const clearMessages = useMessageStore((s) => s.clearMessages);

  const [localServerUrl, setLocalServerUrl] = useState(signalingServerUrl);
  const [localTurnUrl, setLocalTurnUrl] = useState(customTurnUrl || '');
  const [localTurnUsername, setLocalTurnUsername] = useState(customTurnUsername || '');
  const [localTurnCredential, setLocalTurnCredential] = useState(customTurnCredential || '');

  useEffect(() => {
    setLocalServerUrl(signalingServerUrl);
    setLocalTurnUrl(customTurnUrl || '');
    setLocalTurnUsername(customTurnUsername || '');
    setLocalTurnCredential(customTurnCredential || '');
  }, [signalingServerUrl, customTurnUrl, customTurnUsername, customTurnCredential]);

  const handleSaveConnection = async () => {
    if (localServerUrl.trim()) {
      setSignalingServerUrl(localServerUrl.trim());
    }
    if (localTurnUrl.trim()) {
      setCustomTurn(localTurnUrl.trim(), localTurnUsername, localTurnCredential);
    }
    try {
      await DatabaseService.getInstance().saveSettingsToDb();
      Alert.alert('Saved', 'Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Delete all message history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.getInstance().deleteAllMessages();
              clearMessages();
              Alert.alert('Done', 'Message history cleared');
            } catch (err) {
              console.error('Failed to clear history:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#666"
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={() => DatabaseService.getInstance().saveSettingsToDb()}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>

          <Text style={styles.label}>Signaling Server URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://localhost:3000"
            placeholderTextColor="#666"
            value={localServerUrl}
            onChangeText={setLocalServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Custom TURN Server</Text>
          <TextInput
            style={styles.input}
            placeholder="turn:example.com:3478"
            placeholderTextColor="#666"
            value={localTurnUrl}
            onChangeText={setLocalTurnUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Username (optional)"
            placeholderTextColor="#666"
            value={localTurnUsername}
            onChangeText={setLocalTurnUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Credential (optional)"
            placeholderTextColor="#666"
            value={localTurnCredential}
            onChangeText={setLocalTurnCredential}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveConnection}>
            <Text style={styles.saveButtonText}>Save Connection Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>Clear Message History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>PeerLink Mobile v1.0.0</Text>
          <Text style={styles.aboutText}>P2P Encrypted Chat & File Transfer</Text>
          <Text style={styles.copyrightText}>© 2026 - All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', marginBottom: 12 },
  label: { fontSize: 14, color: '#AAA', marginBottom: 8 },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: '#FFF', fontWeight: '600' },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: { color: '#FFF', fontWeight: '600' },
  aboutText: { color: '#666', fontSize: 14, marginBottom: 4 },
  copyrightText: { color: '#555', fontSize: 12, marginTop: 8 },
});
