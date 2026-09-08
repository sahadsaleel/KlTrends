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
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroSubtitle}>Manager Department</Text>
              <Text style={styles.heroTitle}>Daily Expenses</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="wallet-outline" size={26} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heroDescription}>
            Manage and monitor store operations, fuel, post office dispatches, customer returns, and departmental expenses.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => navigation.navigate('AddDailyExpense')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => navigation.navigate('ExpenseHistory')}
              activeOpacity={0.85}
            >
              <Ionicons name="receipt" size={16} color={colors.primary} />
              <Text style={styles.secondaryActionBtnText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Expense Highlight Banner */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardLeft}>
            <Text style={styles.totalCardLabel}>Total Expenses Recorded</Text>
            <Text style={styles.totalCardAmount}>
              ₹{Number(summary?.totalAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.totalCardRight}>
            <Text style={styles.totalCardCount}>{summary?.count || recentExpenses.length}</Text>
            <Text style={styles.totalCardCountLabel}>transactions</Text>
          </View>
        </View>

        {/* Category Shortcuts Grid */}
        <Text style={styles.sectionTitle}>Expense Categories</Text>
        <View style={styles.categoryGrid}>
          {[
            { label: 'Daily Expense', icon: 'wallet-outline', color: '#6366F1' },
            { label: 'Post Office KLTrends', icon: 'mail-outline', color: '#7E22CE' },
            { label: 'Post Office KLIndia', icon: 'globe-outline', color: '#0369A1' },
            { label: 'Return Amount', icon: 'arrow-undo-outline', color: '#DC2626' },
            { label: 'Fuel', icon: 'car-outline', color: '#D97706' },
            { label: 'Custom', icon: 'create-outline', color: '#059669' },
          ].map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.catCard}
              onPress={() => navigation.navigate('ExpenseHistory')}
              activeOpacity={0.8}
            >
              <View style={[styles.catIconBox, { backgroundColor: cat.color + '15' }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <Text style={styles.catCardLabel} numberOfLines={2}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Expenses Header */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Expenses List */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : recentExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
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
              <View key={item.id} style={styles.recentItemCard}>
                <View style={styles.recentItemLeft}>
                  <View style={[styles.recentItemBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.recentItemBadgeText, { color: badge.text }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                  <Text style={styles.recentItemDate}>{formatDisplayDate(item.date)}</Text>
                  {item.description ? (
                    <Text style={styles.recentItemDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.recentItemAmount}>
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
  heroCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  totalCardLeft: {
    flex: 1,
  },
  totalCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalCardAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  totalCardRight: {
    alignItems: 'flex-end',
  },
  totalCardCount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalCardCountLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  catCard: {
    width: '31%',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  catCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
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
  recentItemCard: {
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
  recentItemLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recentItemBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  recentItemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentItemDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentItemDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentItemAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
