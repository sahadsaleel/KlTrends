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
        {/* Summary + Actions */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryCount}>{summary?.totalReturns || 0}</Text>
              <Text style={styles.summaryLabel}>total returned</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('AddProductReturn')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('ProductReturnHistory')}
                activeOpacity={0.85}
              >
                <Ionicons name="time-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Source Breakdown */}
          {summary && (
            <View style={styles.sourceBreakdown}>
              <View style={styles.sourceItem}>
                <View style={[styles.sourceDot, { backgroundColor: '#7E22CE' }]} />
                <Text style={styles.sourceText}>KLTrends</Text>
                <Text style={styles.sourceCount}>{summary.kltrendsCount}</Text>
              </View>
              <View style={styles.sourceDivider} />
              <View style={styles.sourceItem}>
                <View style={[styles.sourceDot, { backgroundColor: '#0369A1' }]} />
                <Text style={styles.sourceText}>KLIndia</Text>
                <Text style={styles.sourceCount}>{summary.klindiaCount}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Recent Returns */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductReturnHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : recentReturns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No returns yet</Text>
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
              <View key={item.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <View
                    style={[
                      styles.recentTag,
                      { backgroundColor: isKLTrends ? '#F3E8FF' : '#E0F2FE' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recentTagText,
                        { color: isKLTrends ? '#7E22CE' : '#0369A1' },
                      ]}
                    >
                      {isKLTrends ? 'KLTrends' : 'KLIndia'}
                    </Text>
                  </View>
                  <Text style={styles.recentDate}>{formatDisplayDate(item.date)}</Text>
                  {item.notes ? (
                    <Text style={styles.recentNotes} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.recentItemRight}>
                  <Text style={styles.recentQty}>{item.returnQuantity}</Text>
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
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  sourceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sourceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  sourceCount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sourceDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
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
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  recentItemLeft: {
    flex: 1,
  },
  recentTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  recentTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentItemRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  recentQty: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  recentQtyLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
