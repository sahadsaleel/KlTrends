import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { AppAlertButton, AppAlertConfig, subscribeNativeAlert } from '../../utils/appAlert';

const getAlertPresentation = (title: string) => {
  const value = title.toLowerCase();
  if (value.includes('success') || value.includes('saved') || value.includes('deleted')) return { icon: 'checkmark' as const, iconBackground: '#DCFCE7', iconColor: '#16A34A' };
  if (value.includes('error') || value.includes('failed')) return { icon: 'close' as const, iconBackground: '#FEE2E2', iconColor: '#DC2626' };
  if (value.includes('confirm') || value.includes('sign out') || value.includes('delete') || value.includes('remove')) return { icon: 'help' as const, iconBackground: '#FEF3C7', iconColor: '#D97706' };
  if (value.includes('validation') || value.includes('required') || value.includes('notice')) return { icon: 'warning' as const, iconBackground: '#FEF3C7', iconColor: '#D97706' };
  return { icon: 'information' as const, iconBackground: '#EDE9FE', iconColor: '#570490' };
};

export const AppAlertHost = () => {
  const [alert, setAlert] = useState<AppAlertConfig | null>(null);
  useEffect(() => subscribeNativeAlert(setAlert), []);

  const dismiss = (button?: AppAlertButton) => {
    setAlert(null);
    button?.onPress?.();
  };

  if (!alert) return null;
  const cancelButton = alert.buttons?.find((button) => button.style === 'cancel');
  const choices = alert.buttons?.filter((button) => button.style !== 'cancel') || [];
  const confirmButton = choices[choices.length - 1] || { text: 'OK' };
  const presentation = getAlertPresentation(alert.title);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => dismiss(cancelButton)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: presentation.iconBackground }]}><Ionicons name={presentation.icon} size={34} color={presentation.iconColor} /></View>
          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
          <View style={styles.buttonRow}>
            {cancelButton ? <TouchableOpacity style={styles.cancelButton} onPress={() => dismiss(cancelButton)} activeOpacity={0.8}><Text style={styles.cancelText}>{cancelButton.text || 'Cancel'}</Text></TouchableOpacity> : null}
            <TouchableOpacity style={[styles.confirmButton, confirmButton.style === 'destructive' && styles.destructiveButton]} onPress={() => dismiss(confirmButton)} activeOpacity={0.8}><Text style={styles.confirmText}>{confirmButton.text || 'OK'}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.58)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 21, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 24 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '800', color: '#4B5563' },
  confirmButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#570490', justifyContent: 'center', alignItems: 'center' },
  destructiveButton: { backgroundColor: '#DC2626' },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
