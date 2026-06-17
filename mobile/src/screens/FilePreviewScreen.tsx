import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { ConnectionManagerInstance } from '../services/connectionManager';
import { useNavigation } from '@react-navigation/native';

export default function FilePreviewScreen({ route }: { route: any }) {
  const navigation = useNavigation();
  const { uri, name, size, mimeType } = route.params;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleSend = () => {
    ConnectionManagerInstance.initiateFileTransfer(uri, name, size, mimeType);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const fileExt = name.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.fileIcon}>📄</Text>
        </View>
        <Text style={styles.fileName}>{name}</Text>
        <Text style={styles.fileMeta}>{formatSize(size)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{fileExt}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileIcon: { fontSize: 36 },
  fileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  fileMeta: { fontSize: 14, color: '#AAA', marginBottom: 16 },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  actions: { width: '100%', gap: 12 },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  cancelButton: {
    backgroundColor: '#3a3a3a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#FFF', fontSize: 16 },
});
