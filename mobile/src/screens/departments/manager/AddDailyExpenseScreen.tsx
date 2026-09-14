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
  { id: 'post_office_kltrends', label: 'Post Office - KLTrends', icon: 'mail-outline', color: '#7E22CE' },
  { id: 'post_office_klindia', label: 'Post Office - KLIndia', icon: 'globe-outline', color: '#0369A1' },
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
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      Alert.alert('Invalid Date', 'Please enter date in DD-MM-YYYY format.');
      return;
    }

    if (!category) {
      Alert.alert('Missing Category', 'Please select an expense category.');
      return;
    }

    if (category === 'custom' && !customCategoryName.trim()) {
      Alert.alert('Missing Custom Name', 'Custom Expense Name is required when Custom category is selected.');
      return;
    }

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
        title="Add Expense"
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
          {/* Form Card */}
          <View style={styles.card}>
            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
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
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
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
                          { backgroundColor: isSelected ? colors.primary : item.color + '15' },
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={isSelected ? '#FFFFFF' : item.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryTileLabel,
                          isSelected && styles.categoryTileLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Custom Name */}
            {category === 'custom' && (
              <View style={styles.field}>
                <Text style={styles.label}>Custom Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                  <TextInput
                    style={styles.input}
                    value={customCategoryName}
                    onChangeText={setCustomCategoryName}
                    placeholder="e.g. Office Supplies"
                    placeholderTextColor={colors.textMuted}
                  />
                  {customCategoryName.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomCategoryName('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
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
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional notes..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Save */}
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
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  currencyPrefix: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  amountInput: {
    fontSize: 17,
    fontWeight: '700',
  },
  textAreaWrap: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  textArea: {
    marginLeft: 0,
    height: '100%',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '48%',
  },
  categoryTileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryTileLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryTileLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    marginTop: spacing.xs,
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
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
});
