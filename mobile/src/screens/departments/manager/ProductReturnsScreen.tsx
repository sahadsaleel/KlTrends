import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../../components/common/Text';
import { AppHeader } from '../../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../../components/common/BottomNavBar';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useAuth } from '../../../hooks/useAuth';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { managerApi, ProductReturn, ProductReturnSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductReturns'>;

const formatDisplayDate = (apiDate: string) => {
  if (!apiDate) return '';
  const parts = apiDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return apiDate;
};

export const ProductReturnsScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);
  const { user } = useAuth();

  const [recentReturns, setRecentReturns] = useState<ProductReturn[]>([]);
  const [summary, setSummary] = useState<ProductReturnSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    const res = await managerApi.getProductReturns();
    if (res.success && res.data) {
      setRecentReturns((res.data.returns || []).slice(0, 5));
      setSummary(res.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTabNavigate = (tab: TabName) => {
    switch (tab) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'ProductReturns':
        break;
      case 'DailyExpenses':
        navigation.navigate('DailyExpenses');
        break;
      case 'Attendance':
        navigation.navigate('Attendance');
        break;
      case 'Profile':
        navigation.navigate('EditProfile');
        break;
    }
  };

  if (!isAuthorized) {
    return null;
  }

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.fullName || user?.username || 'User'
  )}&background=70007C&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Product Returns"
        avatarUrl={user?.avatarUrl || fallbackAvatar}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('EditProfile')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroSubtitle}>Manager Department</Text>
              <Text style={styles.heroTitle}>Product Returns</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="repeat-outline" size={26} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Track and record product returns received across KLTrends social channels and KLIndia website orders.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => navigation.navigate('AddProductReturn')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Record Return</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => navigation.navigate('ProductReturnHistory')}
              activeOpacity={0.85}
            >
              <Ionicons name="time" size={16} color={colors.primary} />
              <Text style={styles.secondaryActionBtnText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Source Breakdown Cards */}
        <Text style={styles.sectionTitle}>Order Sources</Text>
        <View style={styles.sourceGrid}>
          {/* KLTrends Card */}
          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => navigation.navigate('ProductReturnHistory')}
            activeOpacity={0.8}
          >
            <View style={[styles.sourceCardIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="logo-instagram" size={22} color="#7E22CE" />
            </View>
            <Text style={styles.sourceCardTitle}>KLTrends</Text>
            <Text style={styles.sourceCardDesc}>Online & Instagram</Text>
            <View style={styles.sourceStatBadge}>
              <Text style={styles.sourceStatNumber}>
                {summary ? summary.kltrendsCount : '0'}
              </Text>
              <Text style={styles.sourceStatLabel}>returned</Text>
            </View>
          </TouchableOpacity>

          {/* KLIndia Card */}
          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => navigation.navigate('ProductReturnHistory')}
            activeOpacity={0.8}
          >
            <View style={[styles.sourceCardIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="globe-outline" size={22} color="#0369A1" />
            </View>
            <Text style={styles.sourceCardTitle}>KLIndia</Text>
            <Text style={styles.sourceCardDesc}>Website Orders</Text>
            <View style={styles.sourceStatBadge}>
              <Text style={styles.sourceStatNumber}>
                {summary ? summary.klindiaCount : '0'}
              </Text>
              <Text style={styles.sourceStatLabel}>returned</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Total Summary Bar */}
        {summary && (
          <View style={styles.totalBar}>
            <View style={styles.totalBarLeft}>
              <Ionicons name="stats-chart" size={20} color={colors.primary} />
              <Text style={styles.totalBarLabel}>Total Returned Products</Text>
            </View>
            <Text style={styles.totalBarValue}>{summary.totalReturns}</Text>
          </View>
        )}

        {/* Recent Returns Section */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Returns</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductReturnHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All ({summary?.totalRecords || 0})</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : recentReturns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No returns recorded yet.</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate('AddProductReturn')}
            >
              <Text style={styles.emptyAddBtnText}>+ Record First Return</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentReturns.map((item) => {
            const isKLTrends = item.orderSource === 'kltrends';
            return (
              <View key={item.id} style={styles.recentCard}>
                <View style={styles.recentCardLeft}>
                  <View
                    style={[
                      styles.recentCardTag,
                      { backgroundColor: isKLTrends ? '#F3E8FF' : '#E0F2FE' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recentCardTagText,
                        { color: isKLTrends ? '#7E22CE' : '#0369A1' },
                      ]}
                    >
                      {isKLTrends ? 'KLTrends' : 'KLIndia'}
                    </Text>
                  </View>
                  <Text style={styles.recentCardDate}>{formatDisplayDate(item.date)}</Text>
                  {item.notes ? (
                    <Text style={styles.recentCardNotes} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.recentCardRight}>
                  <Text style={styles.recentQtyNumber}>{item.returnQuantity}</Text>
                  <Text style={styles.recentQtyLabel}>units</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNavBar activeTab="ProductReturns" onNavigate={handleTabNavigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  heroCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: 6,
  },
  secondaryActionBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sourceCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  sourceCardIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sourceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourceCardDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sourceStatBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sourceStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sourceStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  totalBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalBarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalBarValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  emptyAddBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
  },
  emptyAddBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  recentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  recentCardLeft: {
    flex: 1,
  },
  recentCardTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  recentCardTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentCardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentCardNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentCardRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  recentQtyNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  recentQtyLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
