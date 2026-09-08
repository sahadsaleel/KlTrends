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
import { mediaApi } from '../../../api/media';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TotalVideoShoot' | 'VideoOut'>;

export const MediaSummaryScreen: React.FC<Props & { activityType: 'video-shoot' | 'video-out' }> = ({ navigation, activityType }) => {
  const isAuthorized = useDepartmentGuard('media', navigation);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const label = activityType === 'video-shoot' ? 'Video Shoot' : 'Video Out';
  const loadTotal = useCallback(async () => {
    const result = await mediaApi.list(activityType);
    setTotal(result.data?.summary.totalVideos || 0);
  }, [activityType]);

  useFocusEffect(useCallback(() => { loadTotal(); }, [loadTotal]));

  const refresh = async () => {
    setRefreshing(true);
    await loadTotal();
    setRefreshing(false);
  };

  if (!isAuthorized) return null;
  return <SafeAreaView style={styles.container} edges={['top']}><AppHeader title={label} showLogo={false} showBackButton onBackPress={() => navigation.goBack()} showNotificationIcon={false} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}><Text style={styles.eyebrow}>MEDIA TRACKING</Text><Text style={styles.heading}>{label}</Text><Text style={styles.description}>Record today&apos;s work and review the complete history.</Text><View style={styles.card}><Text style={styles.kicker}>TOTAL RECORDED</Text><Text style={styles.total}>{total}</Text><Text style={styles.label}>{label.toLowerCase()} videos</Text></View><Button title={`Add ${label}`} onPress={() => navigation.navigate(activityType === 'video-shoot' ? 'AddVideoShoot' : 'AddVideoOut')} rightIconName="add-circle-outline" /><Button title="View History" variant="outline" onPress={() => navigation.navigate(activityType === 'video-shoot' ? 'VideoShootHistory' : 'VideoOutHistory')} /></ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heading: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: -spacing.sm },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: spacing.md },
  card: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 190, padding: spacing.xl, marginBottom: spacing.md, justifyContent: 'center' },
  kicker: { color: '#EEDBFA', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  total: { color: '#FFFFFF', fontSize: 52, lineHeight: 64, fontWeight: '800', marginVertical: spacing.sm, includeFontPadding: true },
  label: { color: '#FFFFFF', fontSize: 16 },
});