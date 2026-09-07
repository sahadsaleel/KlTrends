import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { spacing, borderRadius } from '../../theme/spacing';
import { colors } from '../../theme/colors';

export type TabName = 'Home' | 'Attendance' | 'Reports' | 'Profile';

interface BottomNavBarProps {
  activeTab: TabName;
  onNavigate: (tab: TabName) => void;
  isAdmin?: boolean;
}

const employeeTabs: { name: TabName; icon: string; iconActive: string; label: string }[] = [
  { name: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { name: 'Attendance', icon: 'finger-print-outline', iconActive: 'finger-print', label: 'Attendance' },
  { name: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart', label: 'Reports' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

const adminTabs: { name: TabName; icon: string; iconActive: string; label: string }[] = [
  { name: 'Home', icon: 'grid-outline', iconActive: 'grid', label: 'Overview' },
  { name: 'Attendance', icon: 'people-outline', iconActive: 'people', label: 'Employees' },
  { name: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart', label: 'Reports' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onNavigate, isAdmin = false }) => {
  const insets = useSafeAreaInsets();
  const tabs = isAdmin ? adminTabs : employeeTabs;
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomPadding, height: 60 + bottomPadding }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        if (isActive) {
          return (
            <View key={tab.name} style={styles.navItemActivePill}>
              <Ionicons name={tab.iconActive as any} size={20} color={colors.textOnPrimary} />
              <Text style={styles.navLabelActive}>{tab.label}</Text>
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.navItem}
            onPress={() => onNavigate(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon as any} size={22} color={colors.iconSecondary} />
            <Text style={styles.navLabelMuted}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    height: 70,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  navLabelMuted: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  navItemActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  navLabelActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
    lineHeight: 18,
    marginLeft: 6,
  },
});
