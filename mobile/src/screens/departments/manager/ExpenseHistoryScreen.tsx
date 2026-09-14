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
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { managerApi, DailyExpense, ExpenseSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseHistory'>;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'daily_expense', label: 'Daily' },
  { id: 'post_office_kltrends', label: 'PO KLTrends' },
  { id: 'post_office_klindia', label: 'PO KLIndia' },
  { id: 'return_amount', label: 'Return' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'custom', label: 'Custom' },
] as const;

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

export const ExpenseHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchExpenses = useCallback(async () => {
    if (!isAuthorized) return;

    const params: any = {};
    if (categoryFilter !== 'all') {
      params.category = categoryFilter;
    }

    const res = await managerApi.getDailyExpenses(params);
    if (res.success && res.data) {
      setExpenses(res.data.expenses || []);
      setSummary(res.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized, categoryFilter]);

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
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryAmount}>
              ₹{Number(summary?.totalAmount || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.summaryLabel}>{summary?.count || expenses.length} entries</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddDailyExpense')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterRowContainer}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterPill, isActive && styles.filterPillDark]}
                onPress={() => setCategoryFilter(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No expenses found</Text>
          </View>
        ) : (
          expenses.map((item) => {
            const badgeColors = getCategoryBadgeColor(item.category);
            const categoryLabel = getCategoryLabel(item.category, item.customCategoryName);

            return (
              <View key={item.id} style={styles.expenseCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                      <Text style={[styles.badgeText, { color: badgeColors.text }]} numberOfLines={1}>
                        {categoryLabel}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>{formatDisplayDate(item.date)}</Text>
                    {item.description ? (
                      <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.cardAmount}>
                    ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterRowContainer: {
    marginBottom: 8,
  },
  filterRow: {
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillDark: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  expenseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
