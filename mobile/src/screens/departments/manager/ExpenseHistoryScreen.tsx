import React, { useCallback, useEffect, useState } from 'react';
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
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { managerApi, DailyExpense, ExpenseSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseHistory'>;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Categories' },
  { id: 'daily_expense', label: 'Daily Expense' },
  { id: 'post_office_kltrends', label: 'Post Office - KLTrends' },
  { id: 'post_office_klindia', label: 'Post Office - KLIndia' },
  { id: 'return_amount', label: 'Return Amount' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'custom', label: 'Custom' },
] as const;

type PeriodOption = 'all' | 'today' | 'week' | 'month';

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
      return 'Post Office Recharge - KLTrends';
    case 'post_office_klindia':
      return 'Post Office Recharge - KLIndia';
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

export const ExpenseHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('month');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const getPeriodParams = (period: PeriodOption) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (period === 'today') {
      return { date: todayStr, startDisplay: formatDisplayDate(todayStr), endDisplay: formatDisplayDate(todayStr) };
    }

    if (period === 'week') {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      const startStr = monday.toISOString().slice(0, 10);
      return {
        startDate: startStr,
        endDate: todayStr,
        startDisplay: formatDisplayDate(startStr),
        endDisplay: formatDisplayDate(todayStr),
      };
    }

    if (period === 'month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startStr = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      return {
        startDate: startStr,
        endDate: endStr,
        startDisplay: formatDisplayDate(startStr),
        endDisplay: formatDisplayDate(endStr),
      };
    }

    return { startDisplay: 'All Records', endDisplay: '' };
  };

  const currentPeriod = getPeriodParams(periodFilter);

  const fetchExpenses = useCallback(async () => {
    if (!isAuthorized) return;

    const params: any = {};
    if (categoryFilter !== 'all') {
      params.category = categoryFilter;
    }

    const p = getPeriodParams(periodFilter);
    if (p.date) {
      params.date = p.date;
    } else if (p.startDate && p.endDate) {
      params.startDate = p.startDate;
      params.endDate = p.endDate;
    }

    const res = await managerApi.getDailyExpenses(params);
    if (res.success && res.data) {
      setExpenses(res.data.expenses || []);
      setSummary(res.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized, categoryFilter, periodFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [fetchExpenses])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  if (!isAuthorized) {
    return null;
  }

  const periodDisplayText =
    periodFilter === 'all'
      ? 'All Time'
      : `${currentPeriod.startDisplay} to ${currentPeriod.endDisplay}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Expense History"
        showLogo={false}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showNotificationIcon={false}
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
        {/* Dynamic Expense Summary Card (Section 10 Requirement) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="calculator" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.summaryTextGroup}>
              <Text style={styles.summarySubTitle}>Selected Period:</Text>
              <Text style={styles.summaryPeriod}>{periodDisplayText}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottomRow}>
            <View>
              <Text style={styles.totalLabel}>Total Expenses</Text>
              <Text style={styles.totalValue}>
                ₹{Number(summary?.totalAmount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeNum}>{summary?.count || expenses.length}</Text>
              <Text style={styles.countBadgeLabel}>entries</Text>
            </View>
          </View>
        </View>

        {/* Date Filter Pills */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Time Period</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(['today', 'week', 'month', 'all'] as PeriodOption[]).map((period) => {
              const isActive = periodFilter === period;
              const labels: Record<PeriodOption, string> = {
                today: 'Today',
                week: 'This Week',
                month: 'This Month',
                all: 'All Records',
              };
              return (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodPill, isActive && styles.periodPillActive]}
                  onPress={() => setPeriodFilter(period)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>
                    {labels[period]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Category Filter Pills */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Expense Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catPill, isActive && styles.catPillActive]}
                  onPress={() => setCategoryFilter(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>
            Expense Records ({expenses.length})
          </Text>
          <TouchableOpacity
            style={styles.addExpenseBtn}
            onPress={() => navigation.navigate('AddDailyExpense')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addExpenseBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Expense List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading expense history...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Expenses Found</Text>
            <Text style={styles.emptySub}>
              {categoryFilter !== 'all' || periodFilter !== 'all'
                ? 'Try adjusting your filters above to see more records.'
                : 'No expenses recorded yet. Tap "+ Add Expense" to get started.'}
            </Text>
          </View>
        ) : (
          expenses.map((item) => {
            const badgeColors = getCategoryBadgeColor(item.category);
            const categoryLabel = getCategoryLabel(item.category, item.customCategoryName);

            return (
              <View key={item.id} style={styles.expenseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: badgeColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: badgeColors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {categoryLabel}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>
                      {formatDisplayDate(item.date)}
                    </Text>
                  </View>

                  <Text style={styles.amountText}>
                    ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                {item.description ? (
                  <View style={styles.descBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.descText}>{item.description}</Text>
                  </View>
                ) : null}

                {item.employeeName && (
                  <View style={styles.cardFooter}>
                    <Text style={styles.employeeNameText}>
                      Recorded by: {item.employeeName}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  summaryTextGroup: {
    flex: 1,
  },
  summarySubTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryPeriod: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs + 2,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  countBadge: {
    alignItems: 'flex-end',
  },
  countBadgeNum: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadgeLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  filterScroll: {
    gap: spacing.xs,
  },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  loadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 240,
  },
  expenseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  descBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: 6,
  },
  descText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: spacing.xs,
    alignItems: 'flex-end',
  },
  employeeNameText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
