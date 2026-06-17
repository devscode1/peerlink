// @ts-nocheck
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useConnectionStore, useMessageStore } from '../store/connectionStore';
import { ConnectionManagerInstance } from '../services/connectionManager';
import { Message } from '../../../shared/types';

export default function ChatScreen({ navigation }: { navigation: any }) {
  const messages = useMessageStore((s) => s.messages);
  const addMessage = useMessageStore((s) => s.addMessage);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const peerName = useConnectionStore((s) => s.peerName);
  const roomCode = useConnectionStore((s) => s.roomCode);
  const iceConnectionType = useConnectionStore((s) => s.iceConnectionType);
  const setConnectionState = useConnectionStore((s) => s.setConnectionState);
  const reset = useConnectionStore((s) => s.reset);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      ConnectionManagerInstance.sendMessage(inputText);
      setInputText('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
    setSending(false);
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        navigation.navigate('FilePreview', {
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleLeaveSession = () => {
    ConnectionManagerInstance.disconnect();
    reset();
    setConnectionState('IDLE');
  };

  const getConnectionStatusText = () => {
    if (connectionState === 'CONNECTED_P2P') return 'P2P Connected';
    if (connectionState === 'CONNECTED_RELAY') return 'Relay Connected';
    if (connectionState === 'RECONNECTING') return 'Reconnecting...';
    return 'Connected';
  };

  const getConnectionStatusColor = () => {
    if (connectionState === 'CONNECTED_P2P') return '#34C759';
    if (connectionState === 'CONNECTED_RELAY') return '#FF9500';
    if (connectionState === 'RECONNECTING') return '#FF3B30';
    return '#34C759';
  };

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isLocal = item.senderId === 'local';

      if (item.type === 'file') {
        return (
          <View style={[styles.messageContainer, isLocal ? styles.messageContainerLocal : styles.messageContainerRemote]}>
            <View style={[styles.messageBubble, isLocal ? styles.messageBubbleLocal : styles.messageBubbleRemote, styles.fileBubble]}>
              <Text style={styles.fileIcon}>📄</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.messageText, isLocal ? styles.messageTextLocal : styles.messageTextRemote, styles.fileName]}>
                  {item.fileName || item.content}
                </Text>
                {item.fileSize ? (
                  <Text style={styles.fileSize}>
                    {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                  </Text>
                ) : null}
                {item.transferProgress !== undefined && item.transferProgress < 100 ? (
                  <View style={styles.progressBarMini}>
                    <View style={[styles.progressFillMini, { width: `${item.transferProgress}%` }]} />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.timestamp, isLocal ? styles.timestampLocal : styles.timestampRemote]}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.messageContainer, isLocal ? styles.messageContainerLocal : styles.messageContainerRemote]}>
          <View style={[styles.messageBubble, isLocal ? styles.messageBubbleLocal : styles.messageBubbleRemote]}>
            <Text style={[styles.messageText, isLocal ? styles.messageTextLocal : styles.messageTextRemote]}>
              {item.content}
            </Text>
            <Text style={[styles.timestamp, isLocal ? styles.timestampLocal : styles.timestampRemote]}>
              {formatTimestamp(item.timestamp)}
              {isLocal && item.status === 'delivered' ? ' ✓✓' : isLocal && item.status === 'sent' ? ' ✓' : ''}
            </Text>
          </View>
        </View>
      );
    },
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleLeaveSession} style={styles.leaveButton}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.peerName}>{peerName || 'Peer'}</Text>
              {roomCode ? <Text style={styles.roomCodeSub}>Room: {roomCode}</Text> : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.connectionStatus, { color: getConnectionStatusColor() }]}>
              {getConnectionStatusText()}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsIcon}>
              <Text style={styles.settingsIconText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.messagesList}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesListContent}
          inverted={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachButton} onPress={handleAttachFile}>
            <Text style={styles.attachButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leaveButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  peerName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  roomCodeSub: { fontSize: 10, color: '#666', marginTop: 1 },
  connectionStatus: { fontSize: 11, fontWeight: '600' },
  settingsIcon: { padding: 4 },
  settingsIconText: { fontSize: 20 },
  messagesList: { flex: 1 },
  messagesListContent: { paddingVertical: 8, paddingHorizontal: 12 },
  messageContainer: { marginVertical: 3, flexDirection: 'row' },
  messageContainerLocal: { justifyContent: 'flex-end' },
  messageContainerRemote: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  messageBubbleLocal: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  messageBubbleRemote: { backgroundColor: '#3a3a3a', borderBottomLeftRadius: 4 },
  fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180 },
  fileIcon: { fontSize: 24 },
  fileInfo: { flex: 1 },
  fileName: { fontWeight: '600' },
  fileSize: { fontSize: 11, color: '#AAA', marginTop: 2 },
  progressBarMini: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFillMini: { height: '100%', backgroundColor: '#34C759' },
  messageText: { fontSize: 15 },
  messageTextLocal: { color: '#FFF' },
  messageTextRemote: { color: '#FFF' },
  timestamp: { fontSize: 9, marginTop: 4 },
  timestampLocal: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  timestampRemote: { color: '#888' },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
    backgroundColor: '#1a1a1a',
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonDisabled: { backgroundColor: '#555' },
  sendButtonText: { color: '#FFF', fontWeight: '600' },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
