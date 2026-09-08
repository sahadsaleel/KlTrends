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
import { managerApi, ProductReturn, ProductReturnSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductReturnHistory'>;

type SourceFilter = 'all' | 'kltrends' | 'klindia';
type PeriodFilter = 'all' | 'today' | 'month';

const formatDisplayDate = (apiDate: string) => {
  if (!apiDate) return '';
  const parts = apiDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return apiDate;
};

const getTodayApiDate = () => new Date().toISOString().slice(0, 10);

const getMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
};

export const ProductReturnHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [summary, setSummary] = useState<ProductReturnSummary | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReturns = useCallback(async () => {
    if (!isAuthorized) return;

    const params: any = {};
    if (sourceFilter !== 'all') {
      params.orderSource = sourceFilter;
    }

    if (periodFilter === 'today') {
      params.date = getTodayApiDate();
    } else if (periodFilter === 'month') {
      const { start, end } = getMonthRange();
      params.startDate = start;
      params.endDate = end;
    }

    const res = await managerApi.getProductReturns(params);
    if (res.success && res.data) {
      setReturns(res.data.returns || []);
      setSummary(res.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized, sourceFilter, periodFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchReturns();
    }, [fetchReturns])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReturns();
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Product Return History"
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
        {/* Filter Section: Order Source */}
        <View style={styles.filterCard}>
          <Text style={styles.filterSectionTitle}>Filter by Order Source</Text>
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, sourceFilter === 'all' && styles.filterPillActive]}
              onPress={() => setSourceFilter('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  sourceFilter === 'all' && styles.filterPillTextActive,
                ]}
              >
                All Sources
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                sourceFilter === 'kltrends' && styles.filterPillActive,
              ]}
              onPress={() => setSourceFilter('kltrends')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  sourceFilter === 'kltrends' && styles.filterPillTextActive,
                ]}
              >
                KLTrends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                sourceFilter === 'klindia' && styles.filterPillActive,
              ]}
              onPress={() => setSourceFilter('klindia')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  sourceFilter === 'klindia' && styles.filterPillTextActive,
                ]}
              >
                KLIndia
              </Text>
            </TouchableOpacity>
          </View>

          {/* Period Filter */}
          <Text style={[styles.filterSectionTitle, { marginTop: spacing.sm }]}>Date Range</Text>
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.periodPill, periodFilter === 'all' && styles.periodPillActive]}
              onPress={() => setPeriodFilter('all')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={periodFilter === 'all' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.periodPillText,
                  periodFilter === 'all' && styles.periodPillTextActive,
                ]}
              >
                All Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, periodFilter === 'today' && styles.periodPillActive]}
              onPress={() => setPeriodFilter('today')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="today-outline"
                size={13}
                color={periodFilter === 'today' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.periodPillText,
                  periodFilter === 'today' && styles.periodPillTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, periodFilter === 'month' && styles.periodPillActive]}
              onPress={() => setPeriodFilter('month')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={periodFilter === 'month' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.periodPillText,
                  periodFilter === 'month' && styles.periodPillTextActive,
                ]}
              >
                This Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Counts Summary Banner */}
        {summary && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: '#E9D5FF' }]}>
              <Text style={styles.summaryLabel}>Total Returned</Text>
              <Text style={[styles.summaryNumber, { color: '#7E22CE' }]}>
                {summary.totalReturns}
              </Text>
              <Text style={styles.summarySub}>items</Text>
            </View>

            <View style={[styles.summaryCard, { borderColor: '#BAE6FD' }]}>
              <Text style={styles.summaryLabel}>KLTrends</Text>
              <Text style={[styles.summaryNumber, { color: '#0369A1' }]}>
                {summary.kltrendsCount}
              </Text>
              <Text style={styles.summarySub}>returns</Text>
            </View>

            <View style={[styles.summaryCard, { borderColor: '#BBF7D0' }]}>
              <Text style={styles.summaryLabel}>KLIndia</Text>
              <Text style={[styles.summaryNumber, { color: '#15803D' }]}>
                {summary.klindiaCount}
              </Text>
              <Text style={styles.summarySub}>returns</Text>
            </View>
          </View>
        )}

        {/* Header with Add Button */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listSectionTitle}>
            Returned Products ({returns.length})
          </Text>
          <TouchableOpacity
            style={styles.addReturnBtn}
            onPress={() => navigation.navigate('AddProductReturn')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addReturnBtnText}>Add Return</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading product returns...</Text>
          </View>
        ) : returns.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Product Returns Found</Text>
            <Text style={styles.emptySub}>
              {sourceFilter !== 'all' || periodFilter !== 'all'
                ? 'Try adjusting your filters above.'
                : 'Tap "+ Add Return" above to record your first product return.'}
            </Text>
          </View>
        ) : (
          /* Table / Card List */
          returns.map((item) => {
            const isKLTrends = item.orderSource === 'kltrends';
            return (
              <View key={item.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordHeaderLeft}>
                    <View
                      style={[
                        styles.sourceTag,
                        {
                          backgroundColor: isKLTrends ? '#F3E8FF' : '#E0F2FE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceTagText,
                          {
                            color: isKLTrends ? '#7E22CE' : '#0369A1',
                          },
                        ]}
                      >
                        {isKLTrends ? 'KLTrends' : 'KLIndia'}
                      </Text>
                    </View>
                    <Text style={styles.recordDate}>
                      {formatDisplayDate(item.date)}
                    </Text>
                  </View>

                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeNum}>{item.returnQuantity}</Text>
                    <Text style={styles.qtyBadgeLabel}>Returned</Text>
                  </View>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                ) : null}

                {item.employeeName && (
                  <View style={styles.recordFooter}>
                    <Text style={styles.recordedByText}>
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
  filterCard: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 2,
  },
  summarySub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addReturnBtnText: {
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
    marginTop: spacing.sm,
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
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  sourceTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  qtyBadge: {
    alignItems: 'flex-end',
  },
  qtyBadgeNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyBadgeLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  recordFooter: {
    marginTop: spacing.xs,
    alignItems: 'flex-end',
  },
  recordedByText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
