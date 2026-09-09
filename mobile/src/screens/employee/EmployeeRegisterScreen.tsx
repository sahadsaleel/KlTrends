import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { authApi } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { User, Department, VALID_DEPARTMENTS } from '../../types';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EmployeeRegister'>;

interface EmailStepFormData {
  email: string;
}

interface AccountDetailsFormData {
  username: string;
  fullName: string;
  department: Department | '';
  password: string;
  confirmPassword: string;
  phone?: string;
}

interface DepartmentOption {
  key: Department;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  description: string;
}

const DEPARTMENT_OPTIONS: DepartmentOption[] = [
  {
    key: 'sales',
    label: 'Sales',
    iconName: 'trending-up-outline',
    description: 'Sales, orders & deals',
  },
  {
    key: 'manager',
    label: 'Manager',
    iconName: 'shield-checkmark-outline',
    description: 'Operations & oversight',
  },
  {
    key: 'packaging',
    label: 'Packaging',
    iconName: 'cube-outline',
    description: 'Inventory & dispatch',
  },
];

export const EmployeeRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<'email' | 'otp' | 'details'>('email');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);

  // Email form
  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailStepFormData>({
    defaultValues: { email: '' },
  });

  // Account details form
  const {
    control: detailsControl,
    handleSubmit: handleDetailsSubmit,
    watch: watchDetails,
    formState: { errors: detailsErrors },
  } = useForm<AccountDetailsFormData>({
    defaultValues: {
      username: '',
      fullName: '',
      department: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
  });

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step 1: Send registration OTP
  const onSendEmailOtp = async (data: EmailStepFormData) => {
    try {
      setLoading(true);
      setServerError(null);
      setSuccessMessage(null);

      const email = data.email.trim().toLowerCase();
      const response = await authApi.sendOtp({
        email,
        purpose: 'register',
        role: 'employee',
      });

      if (response.success) {
        setVerifiedEmail(email);
        setStep('otp');
        setOtp('');
        setCountdown(30);
        setSuccessMessage(`A 6-digit verification code was sent to ${email}`);
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } else {
        setServerError(response.error || 'Failed to send OTP. Please check your email.');
      }
    } catch (error) {
      console.error('Registration send OTP error:', error);
      setServerError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const onResendOtp = async () => {
    if (countdown > 0 || resending || !verifiedEmail) return;
    try {
      setResending(true);
      setServerError(null);
      const response = await authApi.sendOtp({
        email: verifiedEmail,
        purpose: 'register',
        role: 'employee',
      });

      if (response.success) {
        setCountdown(30);
        setSuccessMessage('A new verification code has been sent!');
      } else {
        setServerError(response.error || 'Failed to resend code.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setServerError('Unable to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP
  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      setServerError('Please enter the complete 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.verifyOtp({
        email: verifiedEmail,
        otp: otp.trim(),
        purpose: 'register',
        role: 'employee',
      });

      if (response.success) {
        setStep('details');
        setServerError(null);
        setSuccessMessage('Email verified successfully! Complete your profile below.');
      } else {
        setServerError(response.error || 'Invalid or expired OTP code.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setServerError('Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Registration
  const onCompleteRegistration = async (data: AccountDetailsFormData) => {
    if (!data.department || !data.department.trim()) {
      setServerError('Please select a department before registration.');
      return;
    }

    if (data.password !== data.confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.employeeRegister({
        email: verifiedEmail,
        otp: otp.trim(),
        username: data.username.trim(),
        fullName: data.fullName.trim(),
        department: data.department.trim(),
        password: data.password,
        phone: data.phone?.trim() || '',
      });

      if (response.success && response.user && response.token) {
        const empUser: User = { ...response.user, role: 'employee' };
        await login(empUser, response.token);
      } else {
        setServerError(response.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration completion error:', error);
      setServerError('Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            {/* Brand Logo Header */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Join KLTrends</Text>
            <Text style={styles.subtitle}>
              {step === 'email' && 'Step 1: Enter your corporate email to begin'}
              {step === 'otp' && 'Step 2: Enter the 6-digit code sent to your email'}
              {step === 'details' && 'Step 3: Create your username and password'}
            </Text>

            {/* Feedback Banners */}
            {serverError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorBoxText}>{serverError}</Text>
              </View>
            )}

            {successMessage && step !== 'email' && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.successBoxText}>{successMessage}</Text>
              </View>
            )}

            {/* STEP 1: Email Entry */}
            {step === 'email' && (
              <View>
                <Controller
                  control={emailControl}
                  name="email"
                  rules={{
                    required: 'Corporate email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Please enter a valid work email address',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Corporate Work Email"
                      placeholder="name@company.com"
                      iconName="mail-outline"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={emailErrors.email?.message}
                    />
                  )}
                />

                <Button
                  title="Send Verification Code"
                  rightIconName="paper-plane-outline"
                  loading={loading}
                  onPress={handleEmailSubmit(onSendEmailOtp)}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 'otp' && (
              <View>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={16} color={colors.primary} />
                  <Text style={styles.emailBadgeText} numberOfLines={1}>
                    {verifiedEmail}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStep('email');
                      setServerError(null);
                      setSuccessMessage(null);
                    }}
                    style={styles.changeEmailBtn}
                  >
                    <Text style={styles.changeEmailText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.otpLabel}>Enter 6-Digit Verification Code</Text>
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    ref={otpInputRef}
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={(text) => {
                      const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
                      setOtp(clean);
                      if (clean.length === 6) {
                        setServerError(null);
                      }
                    }}
                    placeholder="••••••"
                    placeholderTextColor={colors.borderPurple}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                {/* Resend OTP Row */}
                <View style={styles.resendRow}>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>
                      Resend code in <Text style={{ fontWeight: '700', color: colors.primary }}>{countdown}s</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={onResendOtp}
                      disabled={resending}
                      style={styles.resendBtn}
                    >
                      <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                      <Text style={styles.resendBtnText}>
                        {resending ? 'Sending…' : 'Resend Code'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Button
                  title="Verify Email"
                  rightIconName="arrow-forward-outline"
                  loading={loading}
                  onPress={onVerifyOtp}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 3: Create Account Details */}
            {step === 'details' && (
              <View>
                {/* Verified Email Banner */}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.verifiedBadgeText} numberOfLines={1}>
                    Verified: {verifiedEmail}
                  </Text>
                </View>

                {/* Full Name */}
                <Controller
                  control={detailsControl}
                  name="fullName"
                  rules={{
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Please enter your full name' },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="e.g. Jane Doe"
                      iconName="person-outline"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={detailsErrors.fullName?.message}
                    />
                  )}
                />

                {/* Username */}
                <Controller
                  control={detailsControl}
                  name="username"
                  rules={{
                    required: 'Unique username is required for login',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters',
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_.-]+$/,
                      message: 'Only letters, numbers, underscores, and dashes',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Username (for daily sign in)"
                      placeholder="Choose a username"
                      iconName="at-outline"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={detailsErrors.username?.message}
                    />
                  )}
                />

                {/* Department Selection */}
                <View style={styles.deptSection}>
                  <View style={styles.deptHeaderRow}>
                    <View style={styles.deptLabelContainer}>
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.deptLabel}>Department</Text>
                      <Text style={styles.requiredAsterisk}> *</Text>
                    </View>
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  </View>
                  <Text style={styles.deptSubtitle}>
                    Select your assigned department
                  </Text>

                  <Controller
                    control={detailsControl}
                    name="department"
                    rules={{
                      required: 'Please select a department before registration',
                      validate: (val) =>
                        (val && VALID_DEPARTMENTS.includes(val as Department)) ||
                        'Please select a valid department',
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <View style={styles.deptGrid}>
                          {DEPARTMENT_OPTIONS.map((dept) => {
                            const isSelected = value === dept.key;
                            return (
                              <TouchableOpacity
                                key={dept.key}
                                style={[
                                  styles.deptCard,
                                  isSelected && styles.deptCardActive,
                                  detailsErrors.department && !value && styles.deptCardError,
                                ]}
                                onPress={() => {
                                  onChange(dept.key);
                                  if (serverError) setServerError(null);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.deptCardHeader}>
                                  <View
                                    style={[
                                      styles.deptIconWrapper,
                                      isSelected && styles.deptIconWrapperActive,
                                    ]}
                                  >
                                    <Ionicons
                                      name={dept.iconName}
                                      size={18}
                                      color={isSelected ? '#FFFFFF' : colors.primary}
                                    />
                                  </View>
                                  <View
                                    style={[
                                      styles.deptRadio,
                                      isSelected && styles.deptRadioActive,
                                    ]}
                                  >
                                    {isSelected && (
                                      <Ionicons
                                        name="checkmark"
                                        size={12}
                                        color="#FFFFFF"
                                      />
                                    )}
                                  </View>
                                </View>
                                <Text
                                  style={[
                                    styles.deptTitle,
                                    isSelected && styles.deptTitleActive,
                                  ]}
                                >
                                  {dept.label}
                                </Text>
                                <Text
                                  style={[
                                    styles.deptDescription,
                                    isSelected && styles.deptDescriptionActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {dept.description}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {detailsErrors.department && (
                          <View style={styles.deptErrorRow}>
                            <Ionicons
                              name="alert-circle"
                              size={15}
                              color={colors.error}
                            />
                            <Text style={styles.deptErrorText}>
                              {detailsErrors.department.message}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  />
                </View>

                {/* Password */}
                <Controller
                  control={detailsControl}
                  name="password"
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 10,
                      message: 'Password must be at least 10 characters long',
                    },
                    validate: (value) =>
                      (/[A-Za-z]/.test(value) && /\d/.test(value)) ||
                      'Password must include at least one letter and one number',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Password"
                      placeholder="At least 10 characters, with a letter and number"
                      iconName="lock-closed-outline"
                      isPassword={true}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={detailsErrors.password?.message}
                    />
                  )}
                />

                {/* Confirm Password */}
                <Controller
                  control={detailsControl}
                  name="confirmPassword"
                  rules={{
                    required: 'Please confirm your password',
                    validate: (val) =>
                      val === watchDetails('password') || 'Passwords do not match',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Confirm Password"
                      placeholder="Re-enter your password"
                      iconName="lock-closed-outline"
                      isPassword={true}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={detailsErrors.confirmPassword?.message}
                    />
                  )}
                />

                {/* Phone */}
                <Controller
                  control={detailsControl}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Phone Number (Optional)"
                      placeholder="+1 (555) 000-0000"
                      iconName="call-outline"
                      keyboardType="phone-pad"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />

                {/* Submit Button */}
                <Button
                  title="Create Account"
                  rightIconName="checkmark-circle-outline"
                  loading={loading}
                  onPress={handleDetailsSubmit(onCompleteRegistration)}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* Footer Navigation */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('EmployeeLogin')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  cardContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoImage: {
    width: 140,
    height: 65,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  errorBoxText: {
    fontSize: 13,
    color: colors.error,
    marginLeft: spacing.xs,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  successBoxText: {
    fontSize: 13,
    color: colors.successDark,
    marginLeft: spacing.xs,
    flex: 1,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  emailBadgeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
    marginLeft: spacing.xs,
  },
  changeEmailBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  changeEmailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  verifiedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.successDark,
    marginLeft: spacing.xs,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  otpInputWrapper: {
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  otpInput: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 12,
    color: colors.primaryDark,
    textAlign: 'center',
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  countdownText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  submitBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  // Department Selection Styles
  deptSection: {
    marginBottom: spacing.md,
  },
  deptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  deptLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  requiredAsterisk: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  requiredBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  deptSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs + 2,
  },
  deptCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  deptCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  deptCardError: {
    borderColor: '#FCA5A5',
    backgroundColor: colors.errorLight,
  },
  deptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deptIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptIconWrapperActive: {
    backgroundColor: colors.primary,
  },
  deptRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  deptRadioActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deptTitleActive: {
    color: colors.primaryDark,
  },
  deptDescription: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  deptDescriptionActive: {
    color: colors.primaryLight,
  },
  deptErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  deptErrorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPurple,
  },
});
