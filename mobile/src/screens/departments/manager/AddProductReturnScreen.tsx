import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../../components/common/Text';
import { AppHeader } from '../../../components/common/AppHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { managerApi, OrderSource } from '../../../api/manager';
import { AppAlert as Alert } from '../../../utils/appAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProductReturn'>;

const toDisplayDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const toApiDate = (displayDate: string) => {
  const parts = displayDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return displayDate;
};

export const AddProductReturnScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [date, setDate] = useState<string>(toDisplayDate(new Date()));
  const [orderSource, setOrderSource] = useState<OrderSource>('kltrends');
  const [returnQuantity, setReturnQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  if (!isAuthorized) {
    return null;
  }

  const handleSave = async () => {
    // 1. Date validation
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      Alert.alert('Invalid Date', 'Please enter date in DD-MM-YYYY format.');
      return;
    }

    // 2. Order source validation
    if (!orderSource || (orderSource !== 'kltrends' && orderSource !== 'klindia')) {
      Alert.alert('Missing Order Source', 'Please select an order source.');
      return;
    }

    // 3. Return quantity validation
    const parsedQty = parseInt(returnQuantity.trim(), 10);
    if (!returnQuantity.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Number of returned products is required and must be a positive number greater than zero.'
      );
      return;
    }

    setSaving(true);
    const result = await managerApi.createProductReturn({
      date: toApiDate(date),
      orderSource,
      returnQuantity: parsedQty,
      notes: notes.trim() || undefined,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert(
        'Success',
        `Successfully recorded return of ${parsedQty} product(s) for ${
          orderSource === 'kltrends' ? 'KLTrends' : 'KLIndia'
        }.`,
        [
          {
            text: 'View History',
            onPress: () => {
              navigation.replace('ProductReturnHistory');
            },
          },
          {
            text: 'Add Another',
            onPress: () => {
              setReturnQuantity('');
              setNotes('');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to save product return.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="New Product Return"
        showLogo={false}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showNotificationIcon={false}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="cube-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.bannerTextBox}>
              <Text style={styles.bannerTitle}>Record Product Return</Text>
              <Text style={styles.bannerSub}>
                Record return counts for online, Instagram, or website orders
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Date Field */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Date <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={19} color={colors.primary} />
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
              <Text style={styles.fieldHint}>Format: DD-MM-YYYY</Text>
            </View>

            {/* Order Source Selection */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Order Source <Text style={styles.requiredStar}>*</Text>
              </Text>

              {/* KLTrends Option */}
              <TouchableOpacity
                style={[
                  styles.radioCard,
                  orderSource === 'kltrends' && styles.radioCardSelected,
                ]}
                onPress={() => setOrderSource('kltrends')}
                activeOpacity={0.8}
              >
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      orderSource === 'kltrends' && styles.radioCircleSelected,
                    ]}
                  >
                    {orderSource === 'kltrends' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.radioInfo}>
                    <Text style={styles.radioTitle}>KLTrends</Text>
                    <Text style={styles.radioSub}>Online & Instagram Orders</Text>
                  </View>
                </View>
                <View style={[styles.sourceBadge, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={[styles.sourceBadgeText, { color: '#7E22CE' }]}>Social & Online</Text>
                </View>
              </TouchableOpacity>

              {/* KLIndia Option */}
              <TouchableOpacity
                style={[
                  styles.radioCard,
                  orderSource === 'klindia' && styles.radioCardSelected,
                ]}
                onPress={() => setOrderSource('klindia')}
                activeOpacity={0.8}
              >
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      orderSource === 'klindia' && styles.radioCircleSelected,
                    ]}
                  >
                    {orderSource === 'klindia' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.radioInfo}>
                    <Text style={styles.radioTitle}>KLIndia</Text>
                    <Text style={styles.radioSub}>Website Orders</Text>
                  </View>
                </View>
                <View style={[styles.sourceBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.sourceBadgeText, { color: '#0369A1' }]}>Website</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Return Quantity Field */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Number of Returned Products <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="layers-outline" size={19} color={colors.primary} />
                <TextInput
                  style={styles.input}
                  value={returnQuantity}
                  onChangeText={setReturnQuantity}
                  placeholder="Enter quantity (e.g. 5)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
                {returnQuantity.length > 0 && (
                  <TouchableOpacity onPress={() => setReturnQuantity('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.fieldHint}>Must be a valid positive integer greater than 0</Text>
            </View>

            {/* Notes Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Customer returned damaged product, wrong size, etc."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Save Return</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  requiredStar: {
    color: colors.error,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  textAreaWrap: {
    height: 90,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  textArea: {
    marginLeft: 0,
    height: '100%',
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  radioCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 2,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioInfo: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  radioSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
});
