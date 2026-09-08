import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../../components/common/Text';
import { AppHeader } from '../../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../../components/common/BottomNavBar';
import { Report, ReportSummary, reportsApi } from '../../../api/reports';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { colors } from '../../../theme/colors';
import { borderRadius, spacing } from '../../../theme/spacing';
import { useAuth } from '../../../hooks/useAuth';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'SalesReports'>;

const displayDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const SalesReportScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('sales', navigation);
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthorized) return;
    const result = await reportsApi.getAll();
    if (result.success && result.data) {
      setReports(result.data.reports || []);
      setSummary(result.data.summary || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthorized) {
        load();
      }
    }, [load, isAuthorized])
  );

  const navigate = useCallback(
    (tab: TabName) => {
      const destinations: Record<TabName, keyof RootStackParamList> = {
        Home: 'Home',
        Attendance: 'Attendance',
        Reports: 'SalesReports',
        SalesReports: 'SalesReports',
        AddReport: 'AddEditReport',
        ProductReturns: 'ProductReturns',
        DailyExpenses: 'DailyExpenses',
        PackagingDuties: 'PackagingDuties',
        MediaDuties: 'MediaDuties',
        Profile: 'EditProfile',
      };
      navigation.navigate(destinations[tab] as any);
    },
    [navigation]
  );

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.fullName || user?.username || 'User'
  )}&background=70007C&color=fff&size=200`;

  if (!isAuthorized) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Sales Reports"
        avatarUrl={user?.avatarUrl || fallbackAvatar}
        onProfilePress={() => navigation.navigate('EditProfile')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Action Button */}
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('AddEditReport', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" color="#fff" size={22} />
          <Text style={styles.newText}>New Sales Report</Text>
        </TouchableOpacity>

        {/* Monthly Summary Banner */}
        {summary && reports.length > 0 && (
          <View style={styles.summaryBanner}>
            <View style={styles.summaryBannerHeader}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={styles.summaryTitle}>
                  {summary.month} {summary.year} Summary
                </Text>
              </View>
              <Text style={styles.summarySalesTotal}>{money(summary.totalSales)}</Text>
            </View>

            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillLabel}>Total Orders</Text>
                <Text style={styles.summaryPillValue}>{summary.totalOrders ?? 0}</Text>
              </View>
              <View style={[styles.summaryPill, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.summaryPillLabel, { color: '#15803D' }]}>Completed</Text>
                <Text style={[styles.summaryPillValue, { color: '#16A34A' }]}>
                  {summary.completedOrders ?? 0}
                </Text>
              </View>
              <View style={[styles.summaryPill, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.summaryPillLabel, { color: '#B91C1C' }]}>Cancelled</Text>
                <Text style={[styles.summaryPillValue, { color: '#DC2626' }]}>
                  {summary.cancelledOrders ?? 0}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Reports List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading reports…</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>Add your first daily sales report to get started.</Text>
          </View>
        ) : (
          reports.map((report) => {
            const totalOrders =
              report.totalOrders !== undefined && report.totalOrders !== null
                ? report.totalOrders
                : (report.codOrders || 0) + (report.prepaidOrders || 0);

            return (
              <View style={styles.card} key={report.id}>
                {/* Header with Date & Edit */}
                <View style={styles.cardHeader}>
                  <View style={styles.dateWrap}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.date}>{displayDate(report.date)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddEditReport', { report })}
                    hitSlop={12}
                    style={styles.editBtn}
                  >
                    <Ionicons name="create-outline" color={colors.primary} size={18} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Main Sales Revenue Display */}
                <View style={styles.revenueBox}>
                  <Text style={styles.revenueLabel}>Total Sales Amount</Text>
                  <Text style={styles.revenueAmount}>{money(report.totalSalesAmount)}</Text>
                </View>

                {/* Orders Breakdown Grid */}
                <View style={styles.metricsGrid}>
                  {/* Total Orders Box */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricCardTop}>
                      <Ionicons name="calculator-outline" size={14} color="#7C3AED" />
                      <Text style={styles.metricLabel}>Total Orders</Text>
                    </View>
                    <Text style={styles.metricValue}>{totalOrders}</Text>
                    <View style={styles.orderPillsRow}>
                      <View style={styles.codPill}>
                        <Text style={styles.codPillText}>COD: {report.codOrders ?? 0}</Text>
                      </View>
                      <View style={styles.prepaidPill}>
                        <Text style={styles.prepaidPillText}>Prepaid: {report.prepaidOrders ?? 0}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Fulfillment Status Box */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricCardTop}>
                      <Ionicons name="cart-outline" size={14} color="#2563EB" />
                      <Text style={styles.metricLabel}>Order Status</Text>
                    </View>
                    <View style={styles.statusRow}>
                      <View style={styles.statusItem}>
                        <Text style={styles.statusItemLabel}>Completed</Text>
                        <Text style={[styles.statusItemValue, { color: '#16A34A' }]}>
                          {report.completedOrders ?? 0}
                        </Text>
                      </View>
                      <View style={styles.statusDivider} />
                      <View style={styles.statusItem}>
                        <Text style={styles.statusItemLabel}>Cancelled</Text>
                        <Text style={[styles.statusItemValue, { color: '#DC2626' }]}>
                          {report.cancelledOrders ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* WhatsApp enquiries row */}
                {report.whatsappEnquiries > 0 && (
                  <View style={styles.enquiriesRow}>
                    <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
                    <Text style={styles.enquiriesText}>
                      <Text style={{ fontWeight: '800', color: '#15803D' }}>
                        {report.whatsappEnquiries}
                      </Text>{' '}
                      WhatsApp {report.whatsappEnquiries === 1 ? 'enquiry' : 'enquiries'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNavBar activeTab="Reports" onNavigate={navigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FB',
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 28,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  newButton: {
    backgroundColor: colors.primary,
    minHeight: 50,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Summary Banner
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderPurple,
    gap: 12,
  },
  summaryBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summarySalesTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  summaryPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryPillValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },

  // Report Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: spacing.md + 2,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // Revenue Box
  revenueBox: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  revenueAmount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  orderPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  codPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  prepaidPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prepaidPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  statusItemValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },

  enquiriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enquiriesText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },

  // Empty state
  empty: {
    backgroundColor: '#fff',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});

export const SalesReportsScreen = SalesReportScreen;
