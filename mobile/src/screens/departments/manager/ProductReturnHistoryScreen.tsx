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
import { managerApi, ProductReturn, ProductReturnSummary } from '../../../api/manager';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductReturnHistory'>;

type SourceFilter = 'all' | 'kltrends' | 'klindia';

const formatDisplayDate = (apiDate: string) => {
  if (!apiDate) return '';
  const parts = apiDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return apiDate;
};

export const ProductReturnHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [summary, setSummary] = useState<ProductReturnSummary | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReturns = useCallback(async () => {
    if (!isAuthorized) return;

    const params: any = {};
    if (sourceFilter !== 'all') {
      params.orderSource = sourceFilter;
    }

    const res = await managerApi.getProductReturns(params);
    if (res.success && res.data) {
      setReturns(res.data.returns || []);
      setSummary(res.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized, sourceFilter]);

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
        title="Return History"
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
            <Text style={styles.summaryCount}>{summary?.totalReturns || 0}</Text>
            <Text style={styles.summaryLabel}>total returned</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddProductReturn')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Source Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterRowContainer}
        >
          {(['all', 'kltrends', 'klindia'] as SourceFilter[]).map((src) => {
            const isActive = sourceFilter === src;
            const labels: Record<SourceFilter, string> = { all: 'All', kltrends: 'KLTrends', klindia: 'KLIndia' };
            return (
              <TouchableOpacity
                key={src}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSourceFilter(src)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {labels[src]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
        ) : returns.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No returns found</Text>
          </View>
        ) : (
          returns.map((item) => {
            const isKLTrends = item.orderSource === 'kltrends';
            return (
              <View key={item.id} style={styles.recordCard}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.sourceTag,
                        { backgroundColor: isKLTrends ? '#F3E8FF' : '#E0F2FE' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceTagText,
                          { color: isKLTrends ? '#7E22CE' : '#0369A1' },
                        ]}
                      >
                        {isKLTrends ? 'KLTrends' : 'KLIndia'}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>{formatDisplayDate(item.date)}</Text>
                    {item.notes ? (
                      <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.qtyNum}>{item.returnQuantity}</Text>
                    <Text style={styles.qtyLabel}>units</Text>
                  </View>
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
  recordCard: {
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
  sourceTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardNotes: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  qtyNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
