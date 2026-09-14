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
    if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      Alert.alert('Invalid Date', 'Please enter date in DD-MM-YYYY format.');
      return;
    }

    if (!orderSource || (orderSource !== 'kltrends' && orderSource !== 'klindia')) {
      Alert.alert('Missing Order Source', 'Please select an order source.');
      return;
    }

    const parsedQty = parseInt(returnQuantity.trim(), 10);
    if (!returnQuantity.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Return quantity must be a positive number greater than zero.'
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
        `Recorded return of ${parsedQty} product(s) for ${
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
        title="Add Return"
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

            {/* Order Source */}
            <View style={styles.field}>
              <Text style={styles.label}>Order Source</Text>
              <View style={styles.sourceRow}>
                <TouchableOpacity
                  style={[
                    styles.sourceOption,
                    orderSource === 'kltrends' && styles.sourceOptionSelected,
                  ]}
                  onPress={() => setOrderSource('kltrends')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="logo-instagram"
                    size={18}
                    color={orderSource === 'kltrends' ? '#FFFFFF' : '#7E22CE'}
                  />
                  <Text
                    style={[
                      styles.sourceOptionText,
                      orderSource === 'kltrends' && styles.sourceOptionTextSelected,
                    ]}
                  >
                    KLTrends
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sourceOption,
                    orderSource === 'klindia' && styles.sourceOptionSelected,
                  ]}
                  onPress={() => setOrderSource('klindia')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={orderSource === 'klindia' ? '#FFFFFF' : '#0369A1'}
                  />
                  <Text
                    style={[
                      styles.sourceOptionText,
                      orderSource === 'klindia' && styles.sourceOptionTextSelected,
                    ]}
                  >
                    KLIndia
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.field}>
              <Text style={styles.label}>Return Quantity</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
                <TextInput
                  style={styles.input}
                  value={returnQuantity}
                  onChangeText={setReturnQuantity}
                  placeholder="Enter quantity"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
                {returnQuantity.length > 0 && (
                  <TouchableOpacity onPress={() => setReturnQuantity('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrap, styles.textAreaWrap]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
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
  textAreaWrap: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  textArea: {
    marginLeft: 0,
    height: '100%',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    gap: 8,
  },
  sourceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sourceOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourceOptionTextSelected: {
    color: '#FFFFFF',
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
