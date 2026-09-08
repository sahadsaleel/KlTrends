import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/common/AppHeader';
import { Button } from '../../../components/common/Button';
import { Text } from '../../../components/common/Text';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { packagingApi } from '../../../api/packaging';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyPacking'>;

export const DailyPackingScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('packaging', navigation);
  const [summary, setSummary] = useState({ kltrendsTotal: 0, klindiaTotal: 0, totalOrders: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const result = await packagingApi.list();
    if (result.success && result.data) setSummary(result.data.summary);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  if (!isAuthorized) return null;

  return <SafeAreaView style={styles.container} edges={['top']}><AppHeader title="Daily Packing" showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}><View style={styles.totalCard}><Text style={styles.kicker}>TOTAL ORDERS PACKED</Text><Text style={styles.total}>{summary.totalOrders}</Text><Text style={styles.cardLabel}>All packing records</Text></View><View style={styles.sourceRow}><View style={styles.sourceCard}><Text style={styles.sourceLabel}>KLTrends</Text><Text style={styles.sourceValue}>{summary.kltrendsTotal}</Text><Text style={styles.sourceCaption}>Online / Instagram</Text></View><View style={styles.sourceCard}><Text style={styles.sourceLabel}>KLIndia</Text><Text style={styles.sourceValue}>{summary.klindiaTotal}</Text><Text style={styles.sourceCaption}>Website orders</Text></View></View><Button title="Add Packing Record" onPress={() => navigation.navigate('AddDailyPacking')} rightIconName="add-circle-outline" /><Button title="View History" variant="outline" onPress={() => navigation.navigate('PackingHistory')} /></ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  totalCard: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 180, padding: spacing.xl, justifyContent: 'center' },
  kicker: { color: '#EEDBFA', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  total: { color: '#FFFFFF', fontSize: 52, lineHeight: 64, fontWeight: '800', marginVertical: spacing.sm, includeFontPadding: true },
  cardLabel: { color: '#FFFFFF', fontSize: 16 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  sourceCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, minHeight: 116 },
  sourceLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  sourceValue: { color: colors.primary, fontSize: 28, lineHeight: 36, fontWeight: '800', marginTop: spacing.sm },
  sourceCaption: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});