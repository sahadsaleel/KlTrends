import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  error?: string;
  rightActionText?: string;
  onRightActionPress?: () => void;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  iconName,
  error,
  rightActionText,
  onRightActionPress,
  isPassword = false,
  style,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(!isPassword);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {(label || rightActionText) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {rightActionText && (
            <TouchableOpacity onPress={onRightActionPress} activeOpacity={0.7}>
              <Text style={styles.rightActionText}>{rightActionText}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={20}
            color={colors.inputIcon}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[styles.textInput, style]}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.inputIcon}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rightActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPurple,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.inputBorderFocus,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    marginRight: spacing.sm + 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
});
