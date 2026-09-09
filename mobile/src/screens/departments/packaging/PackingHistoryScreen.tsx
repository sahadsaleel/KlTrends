import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/common/AppHeader';
import { Button } from '../../../components/common/Button';
import { Text } from '../../../components/common/Text';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { AppAlert as Alert } from '../../../utils/appAlert';
import { packagingApi, PackingOrderSource, PackingRecord } from '../../../api/packaging';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PackingHistory'>;
export const PackingHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('packaging', navigation);
  const [records, setRecords] = useState<PackingRecord[]>([]);
  const [summary, setSummary] = useState({ kltrendsTotal: 0, klindiaTotal: 0, totalOrders: 0 });
  const [source, setSource] = useState<PackingOrderSource | 'all'>('all');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    const result = await packagingApi.list({ orderSource: source, date: date || undefined, startDate: date ? undefined : startDate || undefined, endDate: date ? undefined : endDate || undefined });
    setRefreshing(false);
    if (!result.success) { Alert.alert('Could not load history', result.error || 'Please try again.'); return; }
    setRecords(result.data?.records || []); if (result.data?.summary) setSummary(result.data.summary);
  }, [date, endDate, source, startDate]);
  useEffect(() => { load(); }, [load]);
  if (!isAuthorized) return null;

  return <SafeAreaView style={styles.container} edges={['top']}><AppHeader title="Packing History" showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} colors={[colors.primary]} />}><View style={styles.summary}><View><Text style={styles.summaryLabel}>KLTrends</Text><Text style={styles.summaryValue}>{summary.kltrendsTotal}</Text></View><View><Text style={styles.summaryLabel}>KLIndia</Text><Text style={styles.summaryValue}>{summary.klindiaTotal}</Text></View><View><Text style={styles.summaryLabel}>Total</Text><Text style={styles.summaryValue}>{summary.totalOrders}</Text></View></View><View style={styles.filters}><View style={styles.sourceFilters}><Button style={styles.sourceFilterButton} title="All" variant={source === 'all' ? 'primary' : 'outline'} onPress={() => setSource('all')} /><Button style={styles.sourceFilterButton} title="KLTrends" variant={source === 'kltrends' ? 'primary' : 'outline'} onPress={() => setSource('kltrends')} /><Button style={styles.sourceFilterButton} title="KLIndia" variant={source === 'klindia' ? 'primary' : 'outline'} onPress={() => setSource('klindia')} /></View><TextInput value={date} onChangeText={setDate} placeholder="Specific date YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} /><View style={styles.dateRow}><TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date" placeholderTextColor={colors.textMuted} style={[styles.input, styles.half]} /><TextInput value={endDate} onChangeText={setEndDate} placeholder="End date" placeholderTextColor={colors.textMuted} style={[styles.input, styles.half]} /></View><Button title="Apply Filters" onPress={load} /></View><Button title="Add Packing Record" variant="outline" onPress={() => navigation.navigate('AddDailyPacking')} /><View style={styles.list}>{records.map((record) => <View key={record.id} style={styles.record}><View style={styles.recordTop}><Text style={styles.recordDate}>{record.date}</Text><Text style={styles.recordCount}>{record.ordersPacked}</Text></View><Text style={styles.recordSource}>{record.orderSource === 'kltrends' ? 'KLTrends - Online / Instagram' : 'KLIndia - Website'}</Text><Text style={styles.notes}>{record.notes || 'No notes'}</Text></View>)}</View>{!records.length && <Text style={styles.empty}>No packing records for this filter.</Text>}</ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg }, summary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.primary, borderRadius: 16, minHeight: 122, padding: spacing.lg, marginBottom: spacing.md }, summaryLabel: { color: '#EEDBFA', fontSize: 11 }, summaryValue: { color: '#FFFFFF', fontSize: 28, lineHeight: 36, fontWeight: '800', marginTop: spacing.sm, includeFontPadding: true }, filters: { gap: spacing.sm, marginBottom: spacing.md }, sourceFilters: { flexDirection: 'row', gap: spacing.sm }, sourceFilterButton: { flex: 1, minWidth: 0, height: 48 }, input: { height: 48, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.card, paddingHorizontal: spacing.md, color: colors.textPrimary }, dateRow: { flexDirection: 'row', gap: spacing.sm }, half: { flex: 1 }, list: { marginTop: spacing.lg, gap: spacing.sm }, record: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: spacing.md }, recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, recordDate: { color: colors.textPrimary, fontWeight: '700' }, recordCount: { color: colors.primary, fontSize: 22, lineHeight: 30, fontWeight: '800' }, recordSource: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm }, notes: { color: colors.textSecondary, marginTop: spacing.xs }, empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl } });