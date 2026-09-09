import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { spacing, borderRadius } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { useAuth } from '../../hooks/useAuth';
import { Department } from '../../types';

export type TabName =
  | 'Home'
  | 'SalesReports'
  | 'AddReport'
  | 'ProductReturns'
  | 'DailyExpenses'
  | 'DailyPacking'
  | 'Attendance'
  | 'Profile'
  | 'Reports';

interface NavItemConfig {
  name: TabName;
  icon: string;
  iconActive: string;
  label: string;
}

interface BottomNavBarProps {
  activeTab: TabName;
  onNavigate?: (tab: TabName) => void;
  isAdmin?: boolean;
  department?: Department | string;
}

const adminTabs: NavItemConfig[] = [
  { name: 'Home', icon: 'grid-outline', iconActive: 'grid', label: 'Overview' },
  { name: 'Attendance', icon: 'people-outline', iconActive: 'people', label: 'Employees' },
  { name: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart', label: 'Reports' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

const salesTabs: NavItemConfig[] = [
  { name: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { name: 'SalesReports', icon: 'bar-chart-outline', iconActive: 'bar-chart', label: 'Sales' },
  { name: 'AddReport', icon: 'add-circle-outline', iconActive: 'add-circle', label: 'Add' },
  { name: 'Attendance', icon: 'finger-print-outline', iconActive: 'finger-print', label: 'Attendance' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

const managerTabs: NavItemConfig[] = [
  { name: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { name: 'ProductReturns', icon: 'repeat-outline', iconActive: 'repeat', label: 'Returns' },
  { name: 'DailyExpenses', icon: 'wallet-outline', iconActive: 'wallet', label: 'Expenses' },
  { name: 'Attendance', icon: 'finger-print-outline', iconActive: 'finger-print', label: 'Attendance' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

const packagingTabs: NavItemConfig[] = [
  { name: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { name: 'DailyPacking', icon: 'cube-outline', iconActive: 'cube', label: 'Packaging' },
  { name: 'Attendance', icon: 'finger-print-outline', iconActive: 'finger-print', label: 'Attendance' },
  { name: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onNavigate,
  isAdmin = false,
  department: deptProp,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const isAdministrator = isAdmin || user?.role === 'admin';
  const currentDept = (deptProp || user?.department || 'sales').toLowerCase();

  let tabs: NavItemConfig[] = salesTabs;
  if (isAdministrator) {
    tabs = adminTabs;
  } else if (currentDept === 'manager') {
    tabs = managerTabs;
  } else if (currentDept === 'packaging') {
    tabs = packagingTabs;
  } else {
    tabs = salesTabs;
  }

  const isFiveTabs = tabs.length >= 5;
  const bottomPadding = Math.max(insets.bottom, 8);

  const handleTabPress = (tabName: TabName) => {
    if (onNavigate) {
      onNavigate(tabName);
      return;
    }

    // Default fallback navigation
    switch (tabName) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'SalesReports':
      case 'Reports':
        navigation.navigate('SalesReports');
        break;
      case 'AddReport':
        navigation.navigate('AddEditReport');
        break;
      case 'ProductReturns':
        navigation.navigate('ProductReturns');
        break;
      case 'DailyExpenses':
        navigation.navigate('DailyExpenses');
        break;
      case 'DailyPacking':
        navigation.navigate('DailyPacking');
        break;
      case 'Attendance':
        navigation.navigate('Attendance');
        break;
      case 'Profile':
        navigation.navigate(isAdministrator ? 'AdminProfile' : 'EditProfile');
        break;
    }
  };

  const isTabActive = (tabName: TabName): boolean => {
    if (activeTab === tabName) return true;
    if (
      (activeTab === 'Reports' && tabName === 'SalesReports') ||
      (activeTab === 'SalesReports' && tabName === 'Reports')
    ) {
      return true;
    }
    return false;
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomPadding, height: 60 + bottomPadding }]}>
      {tabs.map((tab) => {
        const isActive = isTabActive(tab.name);
        if (isActive) {
          return (
            <View
              key={tab.name}
              style={[
                styles.navItemActivePill,
                isFiveTabs && styles.navItemActivePillCompact,
              ]}
            >
              <Ionicons
                name={tab.iconActive as any}
                size={isFiveTabs ? 18 : 20}
                color={colors.textOnPrimary}
              />
              <Text
                style={[
                  styles.navLabelActive,
                  isFiveTabs && styles.navLabelActiveCompact,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.navItem, isFiveTabs && styles.navItemCompact]}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={isFiveTabs ? 20 : 22}
              color={colors.iconSecondary}
            />
            <Text
              style={[styles.navLabelMuted, isFiveTabs && styles.navLabelMutedCompact]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
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
    paddingHorizontal: spacing.xs,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 54,
  },
  navItemCompact: {
    minWidth: 48,
    paddingHorizontal: 2,
  },
  navLabelMuted: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  navLabelMutedCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  navItemActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  navItemActivePillCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  navLabelActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
    lineHeight: 18,
    marginLeft: 6,
  },
  navLabelActiveCompact: {
    fontSize: 11,
    lineHeight: 15,
    marginLeft: 4,
  },
});
