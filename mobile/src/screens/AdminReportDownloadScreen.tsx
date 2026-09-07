import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert as NativeAlert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../components/common/Text';
import { AppHeader } from '../components/common/AppHeader';
import { BottomNavBar, TabName } from '../components/common/BottomNavBar';
import { spacing, borderRadius } from '../theme/spacing';
import { colors } from '../theme/colors';
import { AppAlert as Alert } from '../utils/appAlert';
import { useAuth } from '../hooks/useAuth';
import { adminApi } from '../api/admin';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReportDownload'>;

type Period = 'daily' | 'monthly' | 'yearly';
type Format = 'pdf' | 'excel';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Format-specific colors
const FORMAT_COLORS = {
  pdf: {
    primary: '#DC2626',
    light: '#FEF2F2',
    border: '#FECACA',
    soft: '#FEE2E2',
    icon: '#B91C1C',
  },
  excel: {
    primary: '#16A34A',
    light: '#F0FDF4',
    border: '#BBF7D0',
    soft: '#DCFCE7',
    icon: '#15803D',
  },
};

export const AdminReportDownloadScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  // State
  const [period, setPeriod] = useState<Period>('monthly');
  const [format, setFormat] = useState<Format>('pdf');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Date adjustment for daily picker
  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Download handler
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params: { date?: string; month?: number; year?: number } = {};

      if (period === 'daily') {
        params.date = selectedDate;
      } else if (period === 'monthly') {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else {
        params.year = selectedYear;
      }

      const result = await adminApi.downloadReport(period, format, params);

      if (!result.success || !result.data) {
        Alert.alert('No Data', result.error || 'No reports found for the selected period.');
        setDownloading(false);
        return;
      }

      // Write base64 data to a temporary file
      const fileUri = `${FileSystem.cacheDirectory}${result.filename}`;
      await FileSystem.writeAsStringAsync(fileUri, result.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: result.mimeType,
          dialogTitle: `Share ${result.filename}`,
          UTI: format === 'excel'
            ? 'org.openxmlformats.spreadsheetml.sheet'
            : 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `Report saved to: ${fileUri}`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', error.message || 'Failed to download the report.');
    } finally {
      setDownloading(false);
    }
  };

  // Navigation
  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home':
        case 'Attendance':
        case 'Reports':
          navigation.navigate('AdminDashboard');
          break;
        case 'Profile':
          navigation.navigate('AdminProfile');
          break;
        default:
          navigation.navigate('AdminDashboard');
          break;
      }
    },
    [navigation]
  );

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.fullName || 'Admin'
  )}&background=70007C&color=fff&size=200`;

  const fc = FORMAT_COLORS[format];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Download Reports"
        avatarUrl={user?.avatarUrl || fallbackAvatar}
        onProfilePress={() => navigation.navigate('AdminProfile')}
        showNotificationIcon={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="cloud-download-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Export Reports</Text>
          <Text style={styles.heroSubtitle}>
            Download employee sales reports as PDF or Excel
          </Text>
        </View>

        {/* ─── Period Selector ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Report Period</Text>
          </View>

          <View style={styles.segmentedControl}>
            {(['daily', 'monthly', 'yearly'] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.segmentBtn, period === p && styles.segmentBtnActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    p === 'daily'
                      ? 'today-outline'
                      : p === 'monthly'
                      ? 'calendar-outline'
                      : 'albums-outline'
                  }
                  size={15}
                  color={period === p ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    period === p && styles.segmentBtnTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── Date Controls ─── */}
          {period === 'daily' && (
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustDate(-1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Ionicons name="today" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.dateDisplayText}>{formatDisplayDate(selectedDate)}</Text>
              </View>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => adjustDate(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {period === 'monthly' && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        selectedMonth === idx + 1 && styles.pickerItemActive,
                      ]}
                      onPress={() => setSelectedMonth(idx + 1)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMonth === idx + 1 && styles.pickerItemTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.pickerDivider} />
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.pickerItem,
                        selectedYear === y && styles.pickerItemActive,
                      ]}
                      onPress={() => setSelectedYear(y)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedYear === y && styles.pickerItemTextActive,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {period === 'yearly' && (
            <View style={styles.yearOnlyContainer}>
              <Text style={styles.pickerLabel}>Select Year</Text>
              <View style={styles.yearChipsRow}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[
                      styles.yearChip,
                      selectedYear === y && styles.yearChipActive,
                    ]}
                    onPress={() => setSelectedYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        selectedYear === y && styles.yearChipTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ─── Format Selector ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>File Format</Text>
          </View>

          <View style={styles.formatRow}>
            {/* PDF Card (Red) */}
            <TouchableOpacity
              style={[
                styles.formatCard,
                {
                  borderColor: format === 'pdf' ? FORMAT_COLORS.pdf.primary : '#E5E7EB',
                  backgroundColor: format === 'pdf' ? FORMAT_COLORS.pdf.light : '#FFFFFF',
                },
              ]}
              onPress={() => setFormat('pdf')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.formatIconBg,
                  {
                    backgroundColor: format === 'pdf'
                      ? FORMAT_COLORS.pdf.primary
                      : FORMAT_COLORS.pdf.soft,
                  },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={24}
                  color={format === 'pdf' ? '#FFFFFF' : FORMAT_COLORS.pdf.icon}
                />
              </View>
              <Text
                style={[
                  styles.formatTitle,
                  { color: format === 'pdf' ? FORMAT_COLORS.pdf.primary : colors.textPrimary },
                ]}
              >
                PDF
              </Text>
              <Text style={styles.formatDesc}>
                Formatted report with tables
              </Text>
              {format === 'pdf' && (
                <View style={[styles.formatCheck, { backgroundColor: FORMAT_COLORS.pdf.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Excel Card (Green) */}
            <TouchableOpacity
              style={[
                styles.formatCard,
                {
                  borderColor: format === 'excel' ? FORMAT_COLORS.excel.primary : '#E5E7EB',
                  backgroundColor: format === 'excel' ? FORMAT_COLORS.excel.light : '#FFFFFF',
                },
              ]}
              onPress={() => setFormat('excel')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.formatIconBg,
                  {
                    backgroundColor: format === 'excel'
                      ? FORMAT_COLORS.excel.primary
                      : FORMAT_COLORS.excel.soft,
                  },
                ]}
              >
                <Ionicons
                  name="grid"
                  size={24}
                  color={format === 'excel' ? '#FFFFFF' : FORMAT_COLORS.excel.icon}
                />
              </View>
              <Text
                style={[
                  styles.formatTitle,
                  { color: format === 'excel' ? FORMAT_COLORS.excel.primary : colors.textPrimary },
                ]}
              >
                Excel
              </Text>
              <Text style={styles.formatDesc}>
                Spreadsheet with styled data
              </Text>
              {format === 'excel' && (
                <View style={[styles.formatCheck, { backgroundColor: FORMAT_COLORS.excel.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Summary Card ─── */}
        <View style={[styles.summaryCard, { borderColor: fc.border, backgroundColor: fc.light }]}>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.summaryLabel}>Period</Text>
            <Text style={styles.summaryValue}>
              {period === 'daily'
                ? formatDisplayDate(selectedDate)
                : period === 'monthly'
                ? `${MONTHS[selectedMonth - 1]} ${selectedYear}`
                : `Year ${selectedYear}`}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: fc.border }]} />
          <View style={styles.summaryRow}>
            <Ionicons name="document-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.summaryLabel}>Format</Text>
            <Text style={[styles.summaryValue, { color: fc.primary }]}>
              {format === 'excel' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}
            </Text>
          </View>
        </View>

        {/* ─── Download Button ─── */}
        <TouchableOpacity
          style={[
            styles.downloadBtn,
            { backgroundColor: fc.primary },
            downloading && styles.downloadBtnDisabled,
          ]}
          onPress={handleDownload}
          disabled={downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.downloadBtnText}>Generating Report…</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.downloadBtnText}>Download Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <BottomNavBar activeTab="Home" onNavigate={handleNavigation} isAdmin={true} />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },

  // Daily Date Picker
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  dateDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Month/Year Picker
  pickerContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    height: 180,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: spacing.sm,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    paddingLeft: 4,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: 2,
  },
  pickerItemActive: {
    backgroundColor: colors.primary,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  pickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Year Only Picker
  yearOnlyContainer: {
    marginTop: spacing.md,
  },
  yearChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  yearChip: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  yearChipTextActive: {
    color: '#FFFFFF',
  },

  // Format Selector
  formatRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    borderWidth: 2,
    position: 'relative',
  },
  formatIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  formatDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formatCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary Card
  summaryCard: {
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // Download Button
  downloadBtn: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnDisabled: {
    opacity: 0.65,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
