import { colors } from './colors';
import { spacing, borderRadius } from './spacing';

export const theme = {
  colors,
  spacing,
  borderRadius,
};

export type Theme = typeof theme;
export { colors, spacing, borderRadius };
