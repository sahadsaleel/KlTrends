import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  rightIconName?: keyof typeof Ionicons.glyphMap;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  rightIconName,
  disabled,
  style,
  ...props
}) => {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const backgroundColor = isOutline
    ? 'transparent'
    : isSecondary
    ? colors.inputBg
    : colors.primary;

  const textColor = isOutline
    ? colors.primary
    : isSecondary
    ? colors.textPrimary
    : colors.textOnPrimary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor },
        isOutline && styles.outlineBorder,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          <Text variant="label" weight="bold" color={textColor} style={styles.buttonText}>
            {title}
          </Text>
          {rightIconName && (
            <Ionicons
              name={rightIconName}
              size={18}
              color={textColor}
              style={styles.iconMargin}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineBorder: {
    borderWidth: 1,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
  iconMargin: {
    marginLeft: spacing.xs + 2,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});
