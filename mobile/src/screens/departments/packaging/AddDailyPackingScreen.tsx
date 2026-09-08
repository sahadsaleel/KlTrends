import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/common/AppHeader';
import { Button } from '../../../components/common/Button';
import { Text } from '../../../components/common/Text';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { AppAlert as Alert } from '../../../utils/appAlert';
import { packagingApi, PackingOrderSource } from '../../../api/packaging';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDailyPacking'>;
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export const AddDailyPackingScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('packaging', navigation);
  const [date, setDate] = useState(today());
  const [orderSource, setOrderSource] = useState<PackingOrderSource>('kltrends');
  const [ordersPacked, setOrdersPacked] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  if (!isAuthorized) return null;

  const save = async () => {
    const quantity = Number(ordersPacked.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Invalid date', 'Use YYYY-MM-DD format.'); return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { Alert.alert('Invalid quantity', 'Orders packed must be a positive whole number.'); return; }
    setSaving(true);
    const result = await packagingApi.create({ date, orderSource, ordersPacked: quantity, notes: notes.trim() || undefined });
    setSaving(false);
    if (!result.success) { Alert.alert('Could not save', result.error || 'Please try again.'); return; }
    Alert.alert('Saved', 'Packing record saved successfully.', [{ text: 'View history', onPress: () => navigation.replace('PackingHistory') }, { text: 'Add another', onPress: () => { setOrdersPacked(''); setNotes(''); } }]);
  };

  return <SafeAreaView style={styles.container} edges={['top']}><AppHeader title="Add Packing Record" showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.label}>Date</Text><TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} /><Text style={styles.label}>Order Source</Text><View style={styles.sourceOptions}><TouchableOpacity style={[styles.sourceOption, orderSource === 'kltrends' && styles.sourceSelected]} onPress={() => setOrderSource('kltrends')}><Text style={[styles.sourceTitle, orderSource === 'kltrends' && styles.selectedText]}>KLTrends</Text><Text style={[styles.sourceCaption, orderSource === 'kltrends' && styles.selectedText]}>Online / Instagram</Text></TouchableOpacity><TouchableOpacity style={[styles.sourceOption, orderSource === 'klindia' && styles.sourceSelected]} onPress={() => setOrderSource('klindia')}><Text style={[styles.sourceTitle, orderSource === 'klindia' && styles.selectedText]}>KLIndia</Text><Text style={[styles.sourceCaption, orderSource === 'klindia' && styles.selectedText]}>Website orders</Text></TouchableOpacity></View><Text style={styles.label}>Number of Orders Packed</Text><TextInput value={ordersPacked} onChangeText={setOrdersPacked} keyboardType="number-pad" placeholder="Enter a positive whole number" placeholderTextColor={colors.textMuted} style={styles.input} /><Text style={styles.label}>Notes (Optional)</Text><TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder="Add a note about this packing work" placeholderTextColor={colors.textMuted} style={[styles.input, styles.notes]} /><Button title="Save Packing Record" onPress={save} loading={saving} rightIconName="checkmark-circle-outline" /></ScrollView></KeyboardAvoidingView></SafeAreaView>;
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { padding: spacing.lg }, label: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: spacing.md, color: colors.textPrimary, fontSize: 16 }, sourceOptions: { flexDirection: 'row', gap: spacing.sm }, sourceOption: { flex: 1, minHeight: 78, justifyContent: 'center', padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card }, sourceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, sourceTitle: { color: colors.textPrimary, fontWeight: '700' }, sourceCaption: { color: colors.textSecondary, fontSize: 11, marginTop: 4 }, selectedText: { color: '#FFFFFF' }, notes: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md } });