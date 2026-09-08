import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../../components/common/AppHeader';
import { Button } from '../../../components/common/Button';
import { Text } from '../../../components/common/Text';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { AppAlert as Alert } from '../../../utils/appAlert';
import { mediaApi, MediaActivity, MediaActivityType } from '../../../api/media';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoShootHistory' | 'VideoOutHistory'>;

export const MediaHistoryScreen: React.FC<Props & { activityType: MediaActivityType }> = ({ navigation, activityType }) => {
  const isAuthorized = useDepartmentGuard('media', navigation);
  const [activities, setActivities] = useState<MediaActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const label = activityType === 'video-shoot' ? 'Video Shoot' : 'Video Out';

  const load = useCallback(async () => {
    setRefreshing(true);
    const result = await mediaApi.list(activityType, { startDate: startDate || undefined, endDate: endDate || undefined });
    setRefreshing(false);
    if (!result.success) { Alert.alert('Could not load history', result.error || 'Please try again.'); return; }
    setActivities(result.data?.activities || []);
    setTotal(result.data?.summary.totalVideos || 0);
  }, [activityType, endDate, startDate]);

  useEffect(() => { load(); }, [load]);
  if (!isAuthorized) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={`${label} History`} showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} colors={[colors.primary]} />}>
        <View style={styles.summary}><Text style={styles.summaryLabel}>SELECTED PERIOD TOTAL</Text><Text style={styles.summaryValue}>{total}</Text><Text style={styles.summaryLabel}>{label.toLowerCase()} videos</Text></View>
        <View style={styles.filters}>
          <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.filterInput} />
          <TextInput value={endDate} onChangeText={setEndDate} placeholder="End YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.filterInput} />
          <Button title="Filter" onPress={load} variant="outline" />
        </View>
        <Button title={`Add ${label}`} onPress={() => navigation.navigate(activityType === 'video-shoot' ? 'AddVideoShoot' : 'AddVideoOut')} rightIconName="add-circle-outline" />
        <View style={styles.list}>{activities.map((item) => <View key={item.id} style={styles.item}><View style={styles.itemTop}><Text style={styles.date}>{item.date}</Text><Text style={styles.count}>{item.totalVideos}</Text></View>{item.notes ? <Text style={styles.notes}>{item.notes}</Text> : <Text style={styles.notes}>No notes</Text>}</View>)}</View>
        {!activities.length && <Text style={styles.empty}>No {label.toLowerCase()} records for this period.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  summary: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 150, padding: spacing.lg, marginBottom: spacing.md, justifyContent: 'center' },
  summaryLabel: { color: '#EEDBFA', fontSize: 13 },
  summaryValue: { color: '#FFFFFF', fontSize: 40, lineHeight: 50, fontWeight: '800', marginVertical: spacing.sm, includeFontPadding: true },
  filters: { gap: spacing.sm, marginBottom: spacing.md },
  filterInput: { height: 48, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.card, paddingHorizontal: spacing.md, color: colors.textPrimary },
  list: { marginTop: spacing.lg, gap: spacing.sm },
  item: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.textPrimary, fontWeight: '700' },
  count: { color: colors.primary, fontWeight: '800', fontSize: 20 },
  notes: { color: colors.textSecondary, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});