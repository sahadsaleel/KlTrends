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
import { managerApi } from '../../../api/manager';
import { AppAlert as Alert } from '../../../utils/appAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDailyExpense'>;

const CATEGORY_OPTIONS = [
  { id: 'daily_expense', label: 'Daily Expense', icon: 'wallet-outline', color: '#6366F1' },
  { id: 'post_office_kltrends', label: 'Post Office Recharge - KLTrends', icon: 'mail-outline', color: '#7E22CE' },
  { id: 'post_office_klindia', label: 'Post Office Recharge - KLIndia', icon: 'globe-outline', color: '#0369A1' },
  { id: 'return_amount', label: 'Return Amount', icon: 'arrow-undo-outline', color: '#DC2626' },
  { id: 'fuel', label: 'Fuel', icon: 'car-outline', color: '#D97706' },
  { id: 'custom', label: 'Custom', icon: 'create-outline', color: '#059669' },
] as const;

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

export const AddDailyExpenseScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('manager', navigation);

  const [date, setDate] = useState<string>(toDisplayDate(new Date()));
  const [category, setCategory] = useState<string>('daily_expense');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
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

    // 2. Category validation
    if (!category) {
      Alert.alert('Missing Category', 'Please select an expense category.');
      return;
    }

    // 3. Custom category name validation
    if (category === 'custom' && !customCategoryName.trim()) {
      Alert.alert('Missing Custom Name', 'Custom Expense Name is required when Custom category is selected.');
      return;
    }

    // 4. Amount validation
    const parsedAmount = parseFloat(amount.trim());
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(
        'Invalid Amount',
        'Amount is required and must be a valid positive number greater than zero.'
      );
      return;
    }

    setSaving(true);
    const result = await managerApi.createDailyExpense({
      date: toApiDate(date),
      category,
      customCategoryName: category === 'custom' ? customCategoryName.trim() : undefined,
      amount: parsedAmount,
      description: description.trim() || undefined,
    });
    setSaving(false);

    if (result.success) {
      const displayCat =
        category === 'custom'
          ? customCategoryName.trim()
          : CATEGORY_OPTIONS.find((c) => c.id === category)?.label || category;

      Alert.alert(
        'Expense Recorded',
        `₹${parsedAmount.toLocaleString('en-IN')} for "${displayCat}" has been successfully recorded.`,
        [
          {
            text: 'View History',
            onPress: () => {
              navigation.replace('ExpenseHistory');
            },
          },
          {
            text: 'Add Another',
            onPress: () => {
              setAmount('');
              setDescription('');
              setCustomCategoryName('');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to save daily expense.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Add Daily Expense"
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
          {/* Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.bannerTextBox}>
              <Text style={styles.bannerTitle}>Record Department Expense</Text>
              <Text style={styles.bannerSub}>
                Fuel, Post Office recharges, customer returns, or custom expenses
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Date Input */}
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

            {/* Category Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Expense Category <Text style={styles.requiredStar}>*</Text>
              </Text>

              <View style={styles.categoriesGrid}>
                {CATEGORY_OPTIONS.map((item) => {
                  const isSelected = category === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.categoryTile,
                        isSelected && styles.categoryTileSelected,
                      ]}
                      onPress={() => setCategory(item.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.categoryTileIcon,
                          { backgroundColor: isSelected ? colors.primary : colors.surface },
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={isSelected ? '#FFFFFF' : item.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryTileLabel,
                          isSelected && styles.categoryTileLabelSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      <View
                        style={[
                          styles.categoryRadio,
                          isSelected && styles.categoryRadioSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.categoryRadioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Conditional Custom Name Field */}
            {category === 'custom' && (
              <View style={[styles.field, styles.customFieldBox]}>
                <Text style={styles.label}>
                  Custom Expense Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="pencil-outline" size={19} color={colors.primary} />
                  <TextInput
                    style={styles.input}
                    value={customCategoryName}
                    onChangeText={setCustomCategoryName}
                    placeholder="e.g. Office Supplies, Maintenance, etc."
                    placeholderTextColor={colors.textMuted}
                  />
                  {customCategoryName.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomCategoryName('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.fieldHint}>Specify the name for this custom expense</Text>
              </View>
            )}

            {/* Amount Field */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Amount <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                {amount.length > 0 && (
                  <TouchableOpacity onPress={() => setAmount('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.fieldHint}>Must be a positive amount greater than ₹0</Text>
            </View>

            {/* Description Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (Optional)</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Speed post dispatch for online batch, Diesel for vehicle, etc."
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
                  <Text style={styles.submitButtonText}>Save Expense</Text>
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
  customFieldBox: {
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
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
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 2,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
  },
  textAreaWrap: {
    height: 85,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  textArea: {
    marginLeft: 0,
    height: '100%',
  },
  categoriesGrid: {
    marginTop: 4,
  },
  categoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  categoryTileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  categoryTileLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryTileLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  categoryRadioSelected: {
    borderColor: colors.primary,
  },
  categoryRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
