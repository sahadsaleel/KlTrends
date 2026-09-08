import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../../components/common/AppHeader';
import { Button } from '../../../components/common/Button';
import { Text } from '../../../components/common/Text';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { AppAlert as Alert } from '../../../utils/appAlert';
import { mediaApi, MediaActivityType } from '../../../api/media';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddVideoShoot' | 'AddVideoOut'>;

const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const MediaActivityScreen: React.FC<Props & { activityType: MediaActivityType }> = ({ navigation, activityType }) => {
  const isAuthorized = useDepartmentGuard('media', navigation);
  const [date, setDate] = useState(formatDate(new Date()));
  const [totalVideos, setTotalVideos] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const label = activityType === 'video-shoot' ? 'Video Shoot' : 'Video Out';

  if (!isAuthorized) return null;

  const save = async () => {
    const total = Number(totalVideos.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }
    if (!Number.isInteger(total) || total <= 0) {
      Alert.alert('Invalid number', `Enter a positive whole number of ${label.toLowerCase()} videos.`);
      return;
    }
    setSaving(true);
    const result = await mediaApi.create(activityType, { date, totalVideos: total, notes: notes.trim() || undefined });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could not save', result.error || 'Please try again.');
      return;
    }
    Alert.alert('Saved', `${label} count recorded successfully.`, [
      { text: 'View history', onPress: () => navigation.replace(activityType === 'video-shoot' ? 'VideoShootHistory' : 'VideoOutHistory') },
      { text: 'Add another', onPress: () => { setTotalVideos(''); setNotes(''); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={`Add ${label}`} showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>MEDIA TRACKING</Text>
          <Text style={styles.title}>Record {label}</Text>
          <Text style={styles.subtitle}>Add a count to keep the department totals accurate.</Text>
          <View style={styles.iconRule}><Ionicons name={activityType === 'video-shoot' ? 'videocam-outline' : 'paper-plane-outline'} size={20} color={colors.primary} /><Text style={styles.formLabel}>{label} details</Text></View>
          <Text style={styles.label}>Date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Text style={styles.hint}>Required. Format: YYYY-MM-DD</Text>
          <Text style={styles.label}>Number of Videos</Text>
          <TextInput value={totalVideos} onChangeText={setTotalVideos} keyboardType="number-pad" placeholder="Enter a positive whole number" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder="Add a note about this work" placeholderTextColor={colors.textMuted} style={[styles.input, styles.notes]} />
          <Button title={`Save ${label}`} onPress={save} loading={saving} rightIconName="checkmark-circle-outline" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { marginTop: spacing.sm, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.lg },
  iconRule: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: spacing.sm, marginBottom: spacing.md },
  formLabel: { marginLeft: spacing.sm, color: colors.textPrimary, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: spacing.md, color: colors.textPrimary, fontSize: 16 },
  notes: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});