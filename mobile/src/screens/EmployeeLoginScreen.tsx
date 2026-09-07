import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

type Props = NativeStackScreenProps<RootStackParamList, 'EmployeeLogin'>;

interface EmployeeLoginFormData {
  identifier: string;
  password: string;
}

export const EmployeeLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeLoginFormData>({
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onLogin = async (data: EmployeeLoginFormData) => {
    try {
      setLoading(true);
      setServerError(null);

      const identifier = data.identifier.trim();
      const password = data.password;

      const response = await authApi.employeeLogin({
        identifier,
        password,
      });

      if (response.success && response.user && response.token) {
        const empUser: User = { ...response.user, role: 'employee' };
        await login(empUser, response.token);
      } else {
        setServerError(response.error || 'Invalid username or password. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Employee login error:', error);
      setServerError('Unable to connect to server. Please try again.');
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
            {/* Top Switcher Link */}
            <TouchableOpacity
              style={styles.portalSwitchBtn}
              onPress={() => navigation.navigate('AdminLogin')}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.portalSwitchText}>Switch to Admin Portal</Text>
            </TouchableOpacity>

            {/* Brand Logo Header */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>Employee Login</Text>
            <Text style={styles.subtitle}>
              Sign in with your username or work email
            </Text>

            {/* Feedback Banner */}
            {serverError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorBoxText}>{serverError}</Text>
              </View>
            )}

            {/* Login Form */}
            <View style={styles.formContainer}>
              {/* Username or Email */}
              <Controller
                control={control}
                name="identifier"
                rules={{
                  required: 'Username or work email is required',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Username or Work Email"
                    placeholder="Enter your username or email"
                    iconName="person-outline"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.identifier?.message}
                  />
                )}
              />

              {/* Password */}
              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    iconName="lock-closed-outline"
                    isPassword={true}
                    rightActionText="Forgot Password?"
                    onRightActionPress={() =>
                      navigation.navigate('ForgotPassword', { portal: 'employee' })
                    }
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.password?.message}
                  />
                )}
              />

              {/* Sign In Button */}
              <Button
                title="Sign In"
                rightIconName="log-in-outline"
                loading={loading}
                disabled={loading}
                onPress={handleSubmit(onLogin)}
                style={styles.submitBtn}
              />
            </View>

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>New employee? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('EmployeeRegister')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Create Account</Text>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  portalSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  portalSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  logoImage: {
    width: 140,
    height: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
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
  submitBtn: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: spacing.lg,
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
