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
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

interface ForgotPasswordFormData {
  identifier: string;
}

interface NewPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const portalType = route.params?.portal || 'employee';
  const [step, setStep] = useState<'identifier' | 'otp' | 'newPassword' | 'success'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);

  const {
    control: identifierControl,
    handleSubmit: handleIdentifierSubmit,
    formState: { errors: identifierErrors },
  } = useForm<ForgotPasswordFormData>({
    defaultValues: { identifier: '' },
  });

  const {
    control: pwdControl,
    handleSubmit: handlePwdSubmit,
    watch: watchPwd,
    formState: { errors: pwdErrors },
  } = useForm<NewPasswordFormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step 1: Send Forgot Password OTP
  const onSendResetOtp = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      setServerError(null);
      setSuccessMessage(null);

      const cleanId = data.identifier.trim();
      const response = await authApi.forgotPassword({ identifier: cleanId });

      if (response.success) {
        setIdentifier(cleanId);
        setTargetEmail(response.email || cleanId);
        setStep('otp');
        setOtp('');
        setCountdown(30);
        setSuccessMessage(response.message || 'A 6-digit verification code has been sent.');
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } else {
        setServerError(response.error || 'No account found with this username or email.');
      }
    } catch (error) {
      console.error('Send reset OTP error:', error);
      setServerError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Reset OTP
  const onResendOtp = async () => {
    if (countdown > 0 || resending || !identifier) return;
    try {
      setResending(true);
      setServerError(null);
      const response = await authApi.forgotPassword({ identifier });

      if (response.success) {
        setCountdown(30);
        setSuccessMessage('A new verification code has been sent!');
      } else {
        setServerError(response.error || 'Failed to resend code.');
      }
    } catch (error) {
      console.error('Resend reset OTP error:', error);
      setServerError('Unable to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify Reset OTP
  const onVerifyResetOtp = async () => {
    if (otp.length !== 6) {
      setServerError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.verifyResetOtp({
        identifier,
        otp: otp.trim(),
      });

      if (response.success) {
        setStep('newPassword');
        setServerError(null);
        setSuccessMessage(null);
      } else {
        setServerError(response.error || 'Invalid or expired verification code.');
      }
    } catch (error) {
      console.error('Verify reset OTP error:', error);
      setServerError('Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const onResetPassword = async (data: NewPasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const response = await authApi.resetPassword({
        identifier,
        otp: otp.trim(),
        newPassword: data.newPassword,
      });

      if (response.success) {
        setStep('success');
        setSuccessMessage(response.message || 'Your password has been reset successfully.');
      } else {
        setServerError(response.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setServerError('Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateBackToLogin = () => {
    if (portalType === 'admin') {
      navigation.navigate('AdminLogin');
    } else {
      navigation.navigate('EmployeeLogin');
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
            {/* Top Back Link */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={navigateBackToLogin}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.backBtnText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Brand Logo Header */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Password Recovery</Text>
            <Text style={styles.subtitle}>
              {step === 'identifier' && 'Enter your username or email to receive a recovery code'}
              {step === 'otp' && 'Enter the 6-digit verification code sent to your email'}
              {step === 'newPassword' && 'Create a strong, new password for your account'}
              {step === 'success' && 'Your account security has been restored'}
            </Text>

            {/* Error Feedback */}
            {serverError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorBoxText}>{serverError}</Text>
              </View>
            )}

            {/* Success Feedback */}
            {successMessage && step !== 'success' && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.successBoxText}>{successMessage}</Text>
              </View>
            )}

            {/* STEP 1: Enter Username / Email */}
            {step === 'identifier' && (
              <View style={styles.formContainer}>
                <Controller
                  control={identifierControl}
                  name="identifier"
                  rules={{
                    required: 'Username or email address is required',
                    minLength: {
                      value: 3,
                      message: 'Please enter a valid username or email',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Username or Corporate Email"
                      placeholder="e.g. john.doe or name@company.com"
                      iconName="person-outline"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={identifierErrors.identifier?.message}
                    />
                  )}
                />

                <Button
                  title="Send Recovery Code"
                  rightIconName="paper-plane-outline"
                  loading={loading}
                  onPress={handleIdentifierSubmit(onSendResetOtp)}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 2: Enter OTP Code */}
            {step === 'otp' && (
              <View style={styles.formContainer}>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail-open-outline" size={16} color={colors.primary} />
                  <Text style={styles.emailBadgeText} numberOfLines={1}>
                    {targetEmail}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStep('identifier');
                      setServerError(null);
                      setSuccessMessage(null);
                    }}
                    style={styles.changeEmailBtn}
                  >
                    <Text style={styles.changeEmailText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.otpLabel}>Enter 6-Digit Code</Text>
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
                  title="Verify Code"
                  rightIconName="arrow-forward-outline"
                  loading={loading}
                  onPress={onVerifyResetOtp}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 'newPassword' && (
              <View style={styles.formContainer}>
                <Controller
                  control={pwdControl}
                  name="newPassword"
                  rules={{
                    required: 'New password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="New Password"
                      placeholder="Minimum 6 characters"
                      iconName="lock-closed-outline"
                      isPassword={true}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={pwdErrors.newPassword?.message}
                    />
                  )}
                />

                <Controller
                  control={pwdControl}
                  name="confirmPassword"
                  rules={{
                    required: 'Please confirm your new password',
                    validate: (val) =>
                      val === watchPwd('newPassword') || 'Passwords do not match',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Confirm New Password"
                      placeholder="Re-enter new password"
                      iconName="lock-closed-outline"
                      isPassword={true}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={pwdErrors.confirmPassword?.message}
                    />
                  )}
                />

                <Button
                  title="Update Password"
                  rightIconName="checkmark-circle-outline"
                  loading={loading}
                  onPress={handlePwdSubmit(onResetPassword)}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* STEP 4: Success State */}
            {step === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-done" size={40} color={colors.success} />
                </View>
                <Text style={styles.successHeading}>Password Updated!</Text>
                <Text style={styles.successBody}>
                  Your password has been changed securely. You can now log in using your username and new password.
                </Text>

                <Button
                  title="Proceed to Sign In"
                  rightIconName="log-in-outline"
                  onPress={navigateBackToLogin}
                  style={styles.submitBtn}
                />
              </View>
            )}

            {/* Card Footer */}
            {step !== 'success' && (
              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <TouchableOpacity onPress={navigateBackToLogin} activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoImage: {
    width: 140,
    height: 65,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  formContainer: {
    paddingHorizontal: spacing.lg + 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginHorizontal: spacing.lg + 4,
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
    marginHorizontal: spacing.lg + 4,
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
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  successContainer: {
    paddingHorizontal: spacing.lg + 4,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successLight,
    borderWidth: 2,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  cardFooter: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: spacing.md + 2,
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
