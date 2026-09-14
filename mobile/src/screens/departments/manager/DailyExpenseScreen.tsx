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
import { managerApi, DailyExpense, ExpenseSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyExpenses'>;

const formatDisplayDate = (apiDate: string) => {
  if (!apiDate) return '';
  const parts = apiDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return apiDate;
};

const getCategoryLabel = (category: string, customName?: string) => {
  if (category === 'custom') {
    return customName ? `Custom: ${customName}` : 'Custom';
  }
  switch (category) {
    case 'daily_expense':
      return 'Daily Expense';
    case 'post_office_kltrends':
      return 'Post Office - KLTrends';
    case 'post_office_klindia':
      return 'Post Office - KLIndia';
    case 'return_amount':
      return 'Return Amount';
    case 'fuel':
      return 'Fuel';
    default:
      return category;
  }
};

const getCategoryBadgeColor = (category: string) => {
  switch (category) {
    case 'daily_expense':
      return { bg: '#EEF2FF', text: '#4F46E5' };
    case 'post_office_kltrends':
      return { bg: '#F3E8FF', text: '#7E22CE' };
    case 'post_office_klindia':
      return { bg: '#E0F2FE', text: '#0369A1' };
    case 'return_amount':
      return { bg: '#FEE2E2', text: '#DC2626' };
    case 'fuel':
      return { bg: '#FEF3C7', text: '#D97706' };
    default:
      return { bg: '#ECFDF5', text: '#059669' };
  }
};

export const DailyExpenseScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);
  const { user } = useAuth();

  const [recentExpenses, setRecentExpenses] = useState<DailyExpense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    const res = await managerApi.getDailyExpenses();
    if (res.success && res.data) {
      setRecentExpenses((res.data.expenses || []).slice(0, 5));
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
        navigation.navigate('ProductReturns');
        break;
      case 'DailyExpenses':
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
        title="Daily Expenses"
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
              <Text style={styles.summaryAmount}>
                ₹{Number(summary?.totalAmount || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.summaryLabel}>
                {summary?.count || recentExpenses.length} transactions
              </Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('AddDailyExpense')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('ExpenseHistory')}
                activeOpacity={0.85}
              >
                <Ionicons name="time-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Expenses */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : recentExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate('AddDailyExpense')}
            >
              <Text style={styles.emptyAddBtnText}>+ Add First Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentExpenses.map((item) => {
            const badge = getCategoryBadgeColor(item.category);
            const label = getCategoryLabel(item.category, item.customCategoryName);
            return (
              <View key={item.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <View style={[styles.recentBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.recentBadgeText, { color: badge.text }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                  <Text style={styles.recentDate}>{formatDisplayDate(item.date)}</Text>
                  {item.description ? (
                    <Text style={styles.recentDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.recentAmount}>
                  ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNavBar activeTab="DailyExpenses" onNavigate={handleTabNavigate} />
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
  summaryAmount: {
    fontSize: 22,
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
    marginRight: spacing.sm,
  },
  recentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  recentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
