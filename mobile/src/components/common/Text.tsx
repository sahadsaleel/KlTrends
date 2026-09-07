import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface CustomTextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: string;
  weight?: 'normal' | 'medium' | 'bold';
}

export const Text: React.FC<CustomTextProps> = ({
  children,
  variant = 'body',
  color = colors.textPrimary,
  weight = 'normal',
  style,
  ...props
}) => {
  return (
    <RNText
      style={[
        styles[variant],
        { color, fontWeight: weight === 'bold' ? '700' : weight === 'medium' ? '500' : '400' },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 22, lineHeight: 28 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, lineHeight: 18 },
});
