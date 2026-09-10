import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../../components/common/Text';
import { AppHeader } from '../../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../../components/common/BottomNavBar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAuth } from '../../../hooks/useAuth';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { packagingApi } from '../../../api/packaging';
import { RootStackParamList } from '../../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PackagingDuties'>;

export const PackagingDutiesScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('packaging', navigation);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ kltrendsTotal: 0, klindiaTotal: 0, totalOrders: 0 });
  const load = useCallback(async () => {
    const result = await packagingApi.list();
    if (result.success && result.data) setSummary(result.data.summary);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const handleNavigation = useCallback((tab: TabName) => {
    if (tab === 'Home') navigation.navigate('Home');
    if (tab === 'Attendance') navigation.navigate('Attendance');
    if (tab === 'Profile') navigation.navigate('EditProfile');
  }, [navigation]);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.username || 'Packaging')}&background=70007C&color=fff&size=200`;
  if (!isAuthorized) return null;

  return <SafeAreaView style={styles.container} edges={['top']}><AppHeader title="Packaging" showLogo={false} avatarUrl={user?.avatarUrl || fallbackAvatar} showAvatar onProfilePress={() => navigation.navigate('EditProfile')} /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}><View style={styles.totalCard}><Text style={styles.kicker}>TOTAL ORDERS PACKED</Text><Text style={styles.total}>{summary.totalOrders}</Text><Text style={styles.cardLabel}>All packing records</Text></View><View style={styles.sourceRow}><View style={styles.sourceCard}><Text style={styles.sourceLabel}>KLTrends</Text><Text style={styles.sourceValue}>{summary.kltrendsTotal}</Text><Text style={styles.sourceCaption}>Online / Instagram</Text></View><View style={styles.sourceCard}><Text style={styles.sourceLabel}>KLIndia</Text><Text style={styles.sourceValue}>{summary.klindiaTotal}</Text><Text style={styles.sourceCaption}>Website orders</Text></View></View><View style={styles.actions}><TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('DailyPacking')} activeOpacity={0.85}><Ionicons name="cube-outline" size={25} color={colors.primary} /><Text style={styles.actionTitle}>Daily Packing</Text><Text style={styles.actionCaption}>Record and review packing</Text></TouchableOpacity><TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Attendance')} activeOpacity={0.85}><Ionicons name="calendar-outline" size={25} color={colors.primary} /><Text style={styles.actionTitle}>Attendance</Text><Text style={styles.actionCaption}>View attendance</Text></TouchableOpacity><TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.85}><Ionicons name="person-outline" size={25} color={colors.primary} /><Text style={styles.actionTitle}>Profile</Text><Text style={styles.actionCaption}>Manage your profile</Text></TouchableOpacity></View></ScrollView><BottomNavBar activeTab="DailyPacking" onNavigate={handleNavigation} /></SafeAreaView>;
};

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xl }, totalCard: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 180, padding: spacing.xl, justifyContent: 'center', marginBottom: spacing.md }, kicker: { color: '#EEDBFA', fontSize: 11, fontWeight: '700', letterSpacing: 1 }, total: { color: '#FFFFFF', fontSize: 52, lineHeight: 64, fontWeight: '800', marginVertical: spacing.sm, includeFontPadding: true }, cardLabel: { color: '#FFFFFF', fontSize: 16 }, sourceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md }, sourceCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, minHeight: 116 }, sourceLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 }, sourceValue: { color: colors.primary, fontSize: 28, lineHeight: 36, fontWeight: '800', marginTop: spacing.sm }, sourceCaption: { color: colors.textSecondary, fontSize: 11, marginTop: 2 }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm }, actionCard: { width: '48%', minHeight: 112, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md }, actionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: spacing.sm }, actionCaption: { color: colors.textSecondary, fontSize: 11, marginTop: 3 } });
