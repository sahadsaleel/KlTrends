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
import { Text } from '../components/common/Text';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { authApi } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminRegister'>;

interface AdminEmailFormData {
  email: string;
}

interface AdminDetailsFormData {
  username: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

export const AdminRegisterScreen: React.FC<Props> = ({ navigation }) => {
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
  } = useForm<AdminEmailFormData>({
    defaultValues: { email: '' },
  });

  // Admin details form
  const {
    control: detailsControl,
    handleSubmit: handleDetailsSubmit,
    watch: watchDetails,
    formState: { errors: detailsErrors },
  } = useForm<AdminDetailsFormData>({
    defaultValues: {
      username: '',
      fullName: '',
      password: '',
      confirmPassword: '',
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
  const onSendEmailOtp = async (data: AdminEmailFormData) => {
    try {
      setLoading(true);
      setServerError(null);
      setSuccessMessage(null);

      const email = data.email.trim().toLowerCase();
      const response = await authApi.sendOtp({
        email,
        purpose: 'register',
        role: 'admin',
      });

      if (response.success) {
        setVerifiedEmail(email);
        setStep('otp');
        setOtp('');
        setCountdown(30);
        setSuccessMessage(`Admin verification code sent to ${email}`);
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } else {
        setServerError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Admin registration send OTP error:', error);
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
        role: 'admin',
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
      setServerError('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.verifyOtp({
        email: verifiedEmail,
        otp: otp.trim(),
        purpose: 'register',
        role: 'admin',
      });

      if (response.success) {
        setStep('details');
        setServerError(null);
        setSuccessMessage('Email verified! Now set up your administrator credentials.');
      } else {
        setServerError(response.error || 'Invalid or expired verification code.');
      }
    } catch (error) {
      console.error('Admin verification error:', error);
      setServerError('Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Admin Registration
  const onCompleteRegistration = async (data: AdminDetailsFormData) => {
    if (data.password !== data.confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.register({
        email: verifiedEmail,
        otp: otp.trim(),
        username: data.username.trim(),
        fullName: data.fullName?.trim() || data.username.trim(),
        password: data.password,
      });

      if (response.success && response.user && response.token) {
        const adminUser: User = { ...response.user, role: 'admin' };
        await login(adminUser, response.token);
      } else {
        setServerError(response.error || 'Admin registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      setServerError('Unable to create admin account. Please try again.');
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
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Admin Registration</Text>
            <Text style={styles.subtitle}>
              {step === 'email' && 'Step 1: Enter your corporate email to begin'}
              {step === 'otp' && 'Step 2: Enter the 6-digit code sent to your email'}
              {step === 'details' && 'Step 3: Create administrator credentials'}
            </Text>

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

            {/* STEP 1: Corporate Email */}
            {step === 'email' && (
              <View>
                <Controller
                  control={emailControl}
                  name="email"
                  rules={{
                    required: 'Corporate email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Enter a valid corporate email address',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Corporate Email"
                      placeholder="admin@enterprise.com"
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
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
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

                <Text style={styles.otpLabel}>Enter 6-Digit Admin Code</Text>
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
                  title="Verify Admin Email"
                  rightIconName="arrow-forward-outline"
                  loading={loading}
                  onPress={onVerifyOtp}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 3: Admin Details */}
            {step === 'details' && (
              <View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                  <Text style={styles.verifiedBadgeText} numberOfLines={1}>
                    Verified: {verifiedEmail}
                  </Text>
                </View>

                {/* Full Name */}
                <Controller
                  control={detailsControl}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Admin Full Name"
                      placeholder="Admin Name"
                      iconName="person-outline"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />

                {/* Admin Username */}
                <Controller
                  control={detailsControl}
                  name="username"
                  rules={{
                    required: 'Admin username is required for login',
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
                      label="Admin Username (for daily sign in)"
                      placeholder="Choose admin username"
                      iconName="at-outline"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={detailsErrors.username?.message}
                    />
                  )}
                />

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

                <Button
                  title="Create Admin Account"
                  rightIconName="shield-checkmark-outline"
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
                onPress={() => navigation.navigate('AdminLogin')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Log in</Text>
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
    paddingVertical: spacing.xl + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: spacing.xs,
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
    marginBottom: spacing.xl,
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
