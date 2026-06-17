import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useFileTransferStore } from '../store/connectionStore';
import { ConnectionManagerInstance } from '../services/connectionManager';
import { useNavigation } from '@react-navigation/native';

export default function TransferProgressScreen() {
  const navigation = useNavigation();
  const isTransferring = useFileTransferStore((s) => s.isTransferring);
  const transferProgress = useFileTransferStore((s) => s.transferProgress);
  const transferSpeed = useFileTransferStore((s) => s.transferSpeed);
  const transferEta = useFileTransferStore((s) => s.transferEta);
  const transferFileName = useFileTransferStore((s) => s.transferFileName);
  const transferFileSize = useFileTransferStore((s) => s.transferFileSize);
  const transferError = useFileTransferStore((s) => s.transferError);
  const isPaused = useFileTransferStore((s) => s.isPaused);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return '--';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handlePauseResume = () => {
    if (isPaused) {
      ConnectionManagerInstance.resumeTransfer();
    } else {
      ConnectionManagerInstance.pauseTransfer();
    }
  };

  const handleCancel = () => {
    ConnectionManagerInstance.cancelTransfer();
    navigation.goBack();
  };

  if (!isTransferring && !transferError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.completeText}>Transfer Complete</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {transferFileName ? (
          <Text style={styles.fileName}>{transferFileName}</Text>
        ) : null}
        {transferFileSize ? (
          <Text style={styles.fileSize}>Total: {formatSize(transferFileSize)}</Text>
        ) : null}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(transferProgress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{transferProgress.toFixed(0)}%</Text>
        </View>

        {transferError ? (
          <Text style={styles.errorText}>{transferError}</Text>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Speed</Text>
              <Text style={styles.statValue}>{formatSpeed(transferSpeed)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>ETA</Text>
              <Text style={styles.statValue}>{formatEta(transferEta)}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {!transferError && (
            <TouchableOpacity
              style={[styles.actionButton, isPaused ? styles.resumeButton : styles.pauseButton]}
              onPress={handlePauseResume}
            >
              <Text style={styles.actionButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  fileName: { fontSize: 18, fontWeight: '600', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  fileSize: { fontSize: 14, color: '#AAA', marginBottom: 32 },
  progressContainer: { width: '100%', marginBottom: 16 },
  progressBar: {
    height: 8,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 4 },
  progressText: { fontSize: 14, color: '#FFF', textAlign: 'center', fontWeight: '600' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  statValue: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  errorText: { color: '#FF3B30', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  actions: { width: '100%', gap: 12 },
  actionButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  pauseButton: { backgroundColor: '#FF9500' },
  resumeButton: { backgroundColor: '#34C759' },
  cancelButton: { backgroundColor: '#FF3B30' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  completeText: { fontSize: 20, color: '#34C759', fontWeight: '600', marginBottom: 24 },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  closeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
