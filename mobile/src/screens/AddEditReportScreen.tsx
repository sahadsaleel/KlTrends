import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppAlert as Alert } from '../utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/common/Text';
import { AppHeader } from '../components/common/AppHeader';
import { BottomNavBar, TabName } from '../components/common/BottomNavBar';
import { Report, reportsApi } from '../api/reports';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditReport'>;

const toDisplayDate = (date: string) => (date ? date.split('-').reverse().join('-') : '');
const toApiDate = (date: string) => date.split('-').reverse().join('-');
const today = () => toDisplayDate(new Date().toISOString().slice(0, 10));
const parseCount = (value: string) => Math.max(0, parseInt(value, 10) || 0);
const parseAmount = (value: string) => Math.max(0, Number(value.replace(/,/g, '')) || 0);

export const AddEditReportScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const existing: Report | undefined = route.params?.report;

  const [date, setDate] = useState(existing ? toDisplayDate(existing.date) : today());
  const [totalSalesAmount, setTotalSalesAmount] = useState(
    existing ? String(existing.totalSalesAmount) : ''
  );
  const [whatsappEnquiries, setWhatsappEnquiries] = useState(
    existing ? String(existing.whatsappEnquiries) : ''
  );
  const [codOrders, setCodOrders] = useState(
    existing?.codOrders !== undefined ? String(existing.codOrders) : ''
  );
  const [prepaidOrders, setPrepaidOrders] = useState(
    existing?.prepaidOrders !== undefined ? String(existing.prepaidOrders) : ''
  );
  const [completedOrders, setCompletedOrders] = useState(
    existing?.completedOrders !== undefined ? String(existing.completedOrders) : ''
  );
  const [cancelledOrders, setCancelledOrders] = useState(
    existing?.cancelledOrders !== undefined ? String(existing.cancelledOrders) : ''
  );
  const [saving, setSaving] = useState(false);

  // Auto-calculated Total Orders = COD Orders + Prepaid Orders
  const autoCalculatedTotalOrders = useMemo(() => {
    const cod = parseInt(codOrders, 10) || 0;
    const prepaid = parseInt(prepaidOrders, 10) || 0;
    return Math.max(0, cod + prepaid);
  }, [codOrders, prepaidOrders]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const save = async () => {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      Alert.alert('Check the date', 'Use DD-MM-YYYY format.');
      return;
    }
    if (!totalSalesAmount.trim()) {
      Alert.alert('Missing Field', 'Please enter the total sales amount.');
      return;
    }

    const payload = {
      date: toApiDate(date),
      totalSalesAmount: parseAmount(totalSalesAmount),
      whatsappEnquiries: parseCount(whatsappEnquiries),
      codOrders: parseCount(codOrders),
      prepaidOrders: parseCount(prepaidOrders),
      totalOrders: autoCalculatedTotalOrders,
      completedOrders: parseCount(completedOrders),
      cancelledOrders: parseCount(cancelledOrders),
    };

    setSaving(true);
    const result = existing
      ? await reportsApi.update(existing.id, payload)
      : await reportsApi.create(payload);
    setSaving(false);

    if (result.success) {
      Alert.alert(
        'Saved',
        existing ? 'Sales report updated successfully.' : 'Sales report saved successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Could not save report', result.error || 'Please try again.');
    }
  };

  const navigate = useCallback(
    (tab: TabName) => {
      const destinations: Record<TabName, keyof RootStackParamList> = {
        Home: 'Home',
        Attendance: 'Attendance',
        Reports: 'SalesReports',
        Profile: 'EditProfile',
      };
      navigation.navigate(destinations[tab] as any);
    },
    [navigation]
  );

  const field = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    keyboardType: 'decimal-pad' | 'number-pad' | 'numbers-and-punctuation' = 'number-pad',
    prefix?: string,
    hint?: string
  ) => (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      </View>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={19} color={colors.primary} />
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          keyboardType={keyboardType}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Back button */}
      <AppHeader
        title={existing ? 'Edit Sales Report' : 'New Sales Report'}
        showLogo={false}
        showBackButton={true}
        onBackPress={handleGoBack}
        showNotificationIcon={false}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card: Basic & Revenue */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>
                  {existing ? 'Edit Daily Report' : 'Enter Daily Sales'}
                </Text>
                <Text style={styles.cardSubTitle}>Date & Revenue details</Text>
              </View>
            </View>

            {field('Report Date (DD-MM-YYYY)', date, setDate, 'calendar-outline', 'numbers-and-punctuation')}
            {field('Total Sales Amount', totalSalesAmount, setTotalSalesAmount, 'cash-outline', 'decimal-pad', '₹')}
            {field('WhatsApp Enquiries', whatsappEnquiries, setWhatsappEnquiries, 'logo-whatsapp')}
          </View>

          {/* Card: Orders Breakdown */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="cart" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Orders Breakdown</Text>
                <Text style={styles.cardSubTitle}>COD, Prepaid & Fulfillment status</Text>
              </View>
            </View>

            {/* Payment Method Orders */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                {field('COD Orders', codOrders, setCodOrders, 'cube-outline')}
              </View>
              <View style={{ flex: 1 }}>
                {field('Prepaid Orders', prepaidOrders, setPrepaidOrders, 'card-outline')}
              </View>
            </View>

            {/* Auto-Calculated Total Orders Box */}
            <View style={styles.autoCalcBox}>
              <View style={styles.autoCalcLeft}>
                <View style={styles.autoCalcIconWrap}>
                  <Ionicons name="calculator" size={18} color={colors.primary} />
                </View>
                <View>
                  <View style={styles.autoCalcTitleRow}>
                    <Text style={styles.autoCalcTitle}>Total Orders</Text>
                    <View style={styles.autoBadge}>
                      <Text style={styles.autoBadgeText}>AUTO-CALCULATED</Text>
                    </View>
                  </View>
                  <Text style={styles.autoCalcFormula}>
                    COD ({parseInt(codOrders, 10) || 0}) + Prepaid ({parseInt(prepaidOrders, 10) || 0})
                  </Text>
                </View>
              </View>
              <Text style={styles.autoCalcValue}>{autoCalculatedTotalOrders}</Text>
            </View>

            {/* Completed & Cancelled Orders */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                {field(
                  'Completed Orders',
                  completedOrders,
                  setCompletedOrders,
                  'checkmark-done-circle-outline'
                )}
              </View>
              <View style={{ flex: 1 }}>
                {field(
                  'Complete Order Cancel',
                  cancelledOrders,
                  setCancelledOrders,
                  'close-circle-outline'
                )}
              </View>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.save}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>
                  {existing ? 'Update Sales Report' : 'Save Sales Report'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar activeTab="Reports" onNavigate={navigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  inputWrap: {
    height: 50,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  prefix: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
    fontWeight: '600',
  },

  // Auto-calculated box
  autoCalcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
  },
  autoCalcLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  autoCalcIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoCalcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoCalcTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  autoBadge: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  autoBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  autoCalcFormula: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  autoCalcValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    marginLeft: 12,
  },

  save: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
