import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Image,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../components/common/Text';
import { BottomNavBar, TabName } from '../../components/common/BottomNavBar';
import { colors } from '../../theme/colors';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Today's date string
const getTodayDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const department = (user?.department || 'sales').toLowerCase();

  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home':
          break;
        case 'Attendance':
          navigation.navigate('Attendance');
          break;
        case 'Reports':
        case 'SalesReports':
          navigation.navigate('SalesReports' as any);
          break;
        case 'AddReport':
          navigation.navigate('AddEditReport' as any);
          break;
        case 'ProductReturns':
          navigation.navigate('ProductReturns' as any);
          break;
        case 'DailyExpenses':
          navigation.navigate('DailyExpenses' as any);
          break;
        case 'DailyPacking':
          navigation.navigate('DailyPacking' as any);
          break;
        case 'Profile':
          navigation.navigate('EditProfile');
          break;
      }
    },
    [navigation]
  );

  const firstName = (user?.fullName || user?.username || 'there').split(' ')[0];
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=70007C&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── Minimal top bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarDate}>{getTodayDate()}</Text>
          <Text style={styles.topBarBrand}>KLTrends</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
            <Image
              source={{ uri: user?.avatarUrl || defaultAvatar }}
              style={styles.topBarAvatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Hero greeting ── */}
        <View style={styles.heroSection}>
          <Text style={styles.greetingLabel}>{getGreeting()},</Text>
          <Text style={styles.heroName}>{firstName}</Text>
          {(user?.department || user?.employeeId) && (
            <View style={styles.heroBadgeRow}>
              {user?.department && (
                <View style={styles.heroBadge}>
                  <Ionicons name="briefcase-outline" size={11} color={colors.primary} />
                  <Text style={styles.heroBadgeText}>
                    {user.department.charAt(0).toUpperCase() + user.department.slice(1)} Department
                  </Text>
                </View>
              )}
              {user?.employeeId && (
                <View style={styles.heroBadge}>
                  <Ionicons name="id-card-outline" size={11} color={colors.primary} />
                  <Text style={styles.heroBadgeText}>{user.employeeId}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Admin shortcut (admin-only) ── */}
        {user?.role === 'admin' && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminDashboard')}
            activeOpacity={0.85}
            style={styles.adminCard}
          >
            <View style={styles.adminCardLeft}>
              <View style={styles.adminCardIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.adminCardTitle}>Admin Dashboard</Text>
                <Text style={styles.adminCardSub}>Manage employees & sales reports</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>Department Quick Access</Text>

        {/* ── Quick-access grid (Dynamic per Department) ── */}
        <View style={styles.grid}>
          {department === 'manager' ? (
            <>
              {/* Product Returns */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('ProductReturns' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="repeat" size={24} color="#7E22CE" />
                </View>
                <Text style={styles.gridTitle}>Product Returns</Text>
                <Text style={styles.gridSub}>KLTrends & KLIndia</Text>
              </TouchableOpacity>

              {/* Daily Expenses */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('DailyExpenses' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="wallet" size={24} color="#D97706" />
                </View>
                <Text style={styles.gridTitle}>Daily Expenses</Text>
                <Text style={styles.gridSub}>Fuel, postage & returns</Text>
              </TouchableOpacity>

              {/* Attendance */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="finger-print" size={24} color={colors.primaryLight} />
                </View>
                <Text style={styles.gridTitle}>Attendance</Text>
                <Text style={styles.gridSub}>Check-in & timer</Text>
              </TouchableOpacity>

              {/* My Profile */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="person" size={24} color={colors.success} />
                </View>
                <Text style={styles.gridTitle}>My Profile</Text>
                <Text style={styles.gridSub}>Edit & update info</Text>
              </TouchableOpacity>
            </>
          ) : department === 'packaging' ? (
            <>
              {/* Packaging */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('DailyPacking' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="cube" size={24} color={colors.primary} />
                </View>
                <Text style={styles.gridTitle}>Packaging</Text>
                <Text style={styles.gridSub}>Queue & dispatch list</Text>
              </TouchableOpacity>

              {/* Attendance */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="finger-print" size={24} color={colors.primaryLight} />
                </View>
                <Text style={styles.gridTitle}>Attendance</Text>
                <Text style={styles.gridSub}>Check-in & timer</Text>
              </TouchableOpacity>

              {/* My Profile */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="person" size={24} color={colors.success} />
                </View>
                <Text style={styles.gridTitle}>My Profile</Text>
                <Text style={styles.gridSub}>Edit & update info</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Sales Reports */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('SalesReports')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="bar-chart" size={24} color={colors.accent} />
                </View>
                <Text style={styles.gridTitle}>Sales Reports</Text>
                <Text style={styles.gridSub}>Log & view reports</Text>
              </TouchableOpacity>

              {/* Add Report */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('AddEditReport' as any)}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </View>
                <Text style={styles.gridTitle}>Add Report</Text>
                <Text style={styles.gridSub}>Create new report</Text>
              </TouchableOpacity>

              {/* Attendance */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('Attendance')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="finger-print" size={24} color={colors.primaryLight} />
                </View>
                <Text style={styles.gridTitle}>Attendance</Text>
                <Text style={styles.gridSub}>Check-in & timer</Text>
              </TouchableOpacity>

              {/* My Profile */}
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => navigation.navigate('EditProfile')}
                activeOpacity={0.82}
              >
                <View style={[styles.gridIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="person" size={24} color={colors.success} />
                </View>
                <Text style={styles.gridTitle}>My Profile</Text>
                <Text style={styles.gridSub}>Edit & update info</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <BottomNavBar activeTab="Home" onNavigate={handleNavigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  topBarDate: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  topBarBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  topBarAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.border,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // ── Hero ──
  heroSection: {
    marginBottom: 24,
    paddingTop: 8,
  },
  greetingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  heroName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 10,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Alert strip ──
  alertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  alertStripUrgent: {
    backgroundColor: colors.error,
  },
  alertStripHigh: {
    backgroundColor: colors.warning,
  },
  alertStripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Admin card ──
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.borderPurple,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  adminCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adminCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  adminCardSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // ── 2×2 Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  gridBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  gridBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  gridSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },

  // ── Sign out ──
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertModalBox: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  alertModalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  alertModalNotifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  alertModalNotifBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  alertModalViewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  alertModalViewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
