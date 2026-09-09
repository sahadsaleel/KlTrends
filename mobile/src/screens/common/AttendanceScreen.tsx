import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert as NativeAlert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../components/common/Text';
import { AppHeader } from '../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../components/common/BottomNavBar';
import { SelfieVerificationModal } from '../../components/SelfieVerificationModal';
import { colors } from '../../theme/colors';
import { AppAlert as Alert } from '../../utils/appAlert';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi, ActivityItem, AttendanceStats } from '../../api/attendance';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export interface EarlyReasonPreset {
  id: string;
  label: string;
  icon: string;
}

export const EARLY_REASON_PRESETS: EarlyReasonPreset[] = [
  { id: 'emergency', label: 'Personal Emergency', icon: 'alert-circle' },
  { id: 'medical', label: 'Health / Medical Issue', icon: 'medical' },
  { id: 'family', label: 'Family Obligation', icon: 'people' },
  { id: 'official', label: 'Official External Task', icon: 'briefcase' },
  { id: 'permission', label: 'Prior Permission Taken', icon: 'checkmark-circle' },
  { id: 'other', label: 'Other Reason', icon: 'ellipsis-horizontal-circle' },
];

export const AttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  // State management
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [isCheckedOut, setIsCheckedOut] = useState<boolean>(false);
  const [checkInTimestamp, setCheckInTimestamp] = useState<string | null>(null);
  const [checkOutTimestamp, setCheckOutTimestamp] = useState<string | null>(null);
  const [todaySelfieUrl, setTodaySelfieUrl] = useState<string | null>(null);
  const [isFaceVerified, setIsFaceVerified] = useState<boolean>(false);
  const [todayStatusText, setTodayStatusText] = useState<string>('PRESENT');
  const [workDurationMinutes, setWorkDurationMinutes] = useState<number>(0);
  const [todayEarlyCheckoutReason, setTodayEarlyCheckoutReason] = useState<string | null>(null);
  const [todayLateCheckInReason, setTodayLateCheckInReason] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modals
  const [selfieModalVisible, setSelfieModalVisible] = useState<boolean>(false);
  const [calendarVisible, setCalendarVisible] = useState<boolean>(false);
  const [selfiePreviewModalVisible, setSelfiePreviewModalVisible] = useState<boolean>(false);
  const [earlyCheckoutModalVisible, setEarlyCheckoutModalVisible] = useState<boolean>(false);
  const [lateCheckInModalVisible, setLateCheckInModalVisible] = useState<boolean>(false);
  const [lateCheckInReason, setLateCheckInReason] = useState('');
  const [pendingLateCheckInReason, setPendingLateCheckInReason] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customReasonText, setCustomReasonText] = useState<string>('');

  // Summary stats and activity records (dynamic)
  const [stats, setStats] = useState<AttendanceStats>({
    hoursThisWeek: 0,
    targetWeeklyHours: 40,
    daysPresent: 0,
    totalWorkingDays: 22,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Live Digital Clock Effect (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Attendance Data from Backend
  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch independent requests together to reduce the page-open wait.
      const [todayRes, monthlyRes] = await Promise.all([
        attendanceApi.getTodayStatus(),
        attendanceApi.getMonthlyAttendance(),
      ]);

      // Fetch Today's check-in/out status
      if (todayRes.success && todayRes.data?.attendance) {
        const att = todayRes.data.attendance;
        if (att.checkInTime) {
          setIsCheckedIn(true);
          setCheckInTimestamp(
            new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );
        } else {
          setIsCheckedIn(false);
          setCheckInTimestamp(null);
        }

        if (att.checkOutTime) {
          setIsCheckedOut(true);
          setCheckOutTimestamp(
            new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );
        } else {
          setIsCheckedOut(false);
          setCheckOutTimestamp(null);
        }

        if (att.selfieUrl) {
          setTodaySelfieUrl(att.selfieUrl);
        }
        if (att.isVerified !== undefined) {
          setIsFaceVerified(att.isVerified);
        }
        if (att.status) {
          setTodayStatusText(att.status);
        }
        if (att.workDurationMinutes) {
          setWorkDurationMinutes(att.workDurationMinutes);
        }
        if (att.earlyCheckoutReason) {
          setTodayEarlyCheckoutReason(att.earlyCheckoutReason);
        } else {
          setTodayEarlyCheckoutReason(null);
        }
        setTodayLateCheckInReason(att.lateCheckInReason || null);
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
        setCheckInTimestamp(null);
        setCheckOutTimestamp(null);
        setTodaySelfieUrl(null);
        setIsFaceVerified(false);
        setTodayEarlyCheckoutReason(null);
        setTodayLateCheckInReason(null);
      }

      // Apply monthly logs and summary stats
      if (monthlyRes.success && monthlyRes.data) {
        if (monthlyRes.data.stats) {
          setStats(monthlyRes.data.stats);
        }
        setActivities(monthlyRes.data.recentActivity || []);
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error('Attendance fetch error:', e);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceData();
    }, [fetchAttendanceData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  // Trigger Check In Modal
  const handleCheckInPress = () => {
    if (isCheckedIn) {
      Alert.alert('Already Checked In', `You checked in today at ${checkInTimestamp || '10:00 AM'}.`);
      return;
    }
    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(10, 0, 0, 0);
    if (now > shiftStart) {
      setLateCheckInReason('');
      setLateCheckInModalVisible(true);
      return;
    }
    setSelfieModalVisible(true);
  };

  const confirmLateCheckInReason = () => {
    const reason = lateCheckInReason.trim();
    if (!reason) {
      Alert.alert('Reason Required', 'Please enter a reason for checking in late.');
      return;
    }
    setPendingLateCheckInReason(reason);
    setLateCheckInModalVisible(false);
    setSelfieModalVisible(true);
  };

  // Process selfie check-in with Cloudinary upload
  const handleConfirmCheckInWithSelfie = async (selfieBase64: string): Promise<boolean> => {
    setActionLoading(true);
    const res = await attendanceApi.checkIn({
      selfieImage: selfieBase64,
      lateCheckInReason: pendingLateCheckInReason || undefined,
    });
    setActionLoading(false);

    if (res.success && res.data) {
      const checkInDate = new Date(res.data.checkInTime || new Date());
      const nowStr = checkInDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setIsCheckedIn(true);
      setCheckInTimestamp(nowStr);
      if (res.data.selfieUrl) {
        setTodaySelfieUrl(res.data.selfieUrl);
      }
      setIsFaceVerified(true);
      setPendingLateCheckInReason(null);
      if (res.data.status) {
        setTodayStatusText(res.data.status);
      }
      Alert.alert(
        'Check-In Successful! 🎉',
        `Your face selfie was verified and saved to Cloudinary.\nRecorded at: ${nowStr}`
      );
      fetchAttendanceData();
      return true;
    } else {
      Alert.alert(
        'Check-In Error',
        res.error || 'Failed to complete check-in. Please ensure good lighting and try again.'
      );
      return false;
    }
  };

  // Process check-out with optional early checkout reason
  const processCheckOut = async (reasonText?: string) => {
    setActionLoading(true);
    const res = await attendanceApi.checkOut({
      earlyCheckoutReason: reasonText,
      reason: reasonText,
    });
    setActionLoading(false);

    if (res.success && res.data) {
      const nowStr = new Date(res.data.checkOutTime || new Date()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setIsCheckedOut(true);
      setCheckOutTimestamp(nowStr);
      if (res.data.workDurationMinutes) {
        setWorkDurationMinutes(res.data.workDurationMinutes);
      }
      if (res.data.earlyCheckoutReason) {
        setTodayEarlyCheckoutReason(res.data.earlyCheckoutReason);
      }
      setEarlyCheckoutModalVisible(false);
      Alert.alert(
        'Check-Out Successful! 👋',
        `Shift completed at ${nowStr}.${reasonText ? `\nReason: ${reasonText}` : ''}\nTotal logged: ${Math.floor((res.data.workDurationMinutes || 0) / 60)}h ${(res.data.workDurationMinutes || 0) % 60}m`
      );
      fetchAttendanceData();
    } else {
      Alert.alert('Check-Out Error', res.error || 'Failed to check out. Please try again.');
    }
  };

  // Handle Check Out Action with 5:30 PM cutoff check
  const handleCheckOut = () => {
    if (!isCheckedIn) {
      Alert.alert('Check-Out Notice', 'Please Check In with face verification first before checking out.');
      return;
    }
    if (isCheckedOut) {
      Alert.alert('Already Checked Out', `You already checked out today at ${checkOutTimestamp || '05:30 PM'}`);
      return;
    }

    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    // Shift ends at 5:30 PM (17:30)
    const isEarly = hours < 17 || (hours === 17 && mins < 30);

    if (isEarly) {
      setSelectedPreset('');
      setCustomReasonText('');
      setEarlyCheckoutModalVisible(true);
    } else {
      Alert.alert('Confirm Check Out', 'Are you sure you want to end your shift and check out now?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'default',
          onPress: () => processCheckOut(),
        },
      ]);
    }
  };

  // Format Clock & Date strings
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${dayNames[currentTime.getDay()]}, ${monthNames[currentTime.getMonth()]} ${currentTime.getDate()}`;

  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home':
          navigation.navigate('Home');
          break;
        case 'Attendance':
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

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.fullName || user?.username || 'User'
  )}&background=70007C&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="KL Trends"
        avatarUrl={user?.avatarUrl || fallbackAvatar}
        onProfilePress={() => navigation.navigate('EditProfile')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Main Attendance Clock & Action Card */}
        <View style={styles.mainCard}>
          <Text style={styles.currentTimeLabel}>CURRENT TIME</Text>
          <Text style={styles.clockDisplay} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formattedTime}
          </Text>
          <Text style={styles.dateDisplay}>{formattedDate}</Text>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {/* Check In Button */}
            <TouchableOpacity
              style={[
                styles.checkInBtn,
                isCheckedIn && styles.checkInBtnActive,
              ]}
              onPress={handleCheckInPress}
              disabled={actionLoading || isCheckedIn}
              activeOpacity={0.85}
            >
              <View style={styles.btnIconWrapper}>
                <Ionicons
                  name={isCheckedIn ? 'checkmark-circle' : 'camera'}
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.btnTextWrapper}>
                <Text style={styles.checkInBtnText}>
                  {isCheckedIn ? 'Checked' : 'Check'}
                </Text>
                <Text style={styles.checkInBtnText}>
                  {isCheckedIn ? 'In ✓' : 'In (Face)'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Check Out Button */}
            <TouchableOpacity
              style={[
                styles.checkOutBtn,
                (!isCheckedIn || isCheckedOut) && styles.checkOutBtnDisabled,
              ]}
              onPress={handleCheckOut}
              disabled={actionLoading || !isCheckedIn || isCheckedOut}
              activeOpacity={0.85}
            >
              <View style={styles.btnIconWrapperOut}>
                <Ionicons
                  name={isCheckedOut ? 'checkmark-done-circle' : 'exit-outline'}
                  size={24}
                  color={isCheckedOut ? colors.success : colors.primary}
                />
              </View>
              <View style={styles.btnTextWrapper}>
                <Text style={[styles.checkOutBtnText, isCheckedOut && { color: colors.success }]}>
                  {isCheckedOut ? 'Checked' : 'Check'}
                </Text>
                <Text style={[styles.checkOutBtnText, isCheckedOut && { color: colors.success }]}>
                  {isCheckedOut ? 'Out ✓' : 'Out'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Shift Status Subtext */}
          <Text style={styles.shiftSubtext}>
            {isCheckedIn
              ? `Checked In at ${checkInTimestamp || '10:00 AM'}${isCheckedOut ? ` | Out at ${checkOutTimestamp}` : ' | Shift in progress'}`
              : 'Shift: 10:00 AM – 5:30 PM • Face Selfie Required'}
          </Text>
        </View>

        {/* Verified Face Check-In Card (when checked in) */}
        {isCheckedIn && (
          <View style={styles.verifiedCard}>
            <View style={styles.verifiedCardHeader}>
              <View style={styles.verifiedLeftHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.verifiedTitle}>Today's Verified Check-In</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{todayStatusText}</Text>
              </View>
            </View>

            <View style={styles.verifiedContentRow}>
              {todaySelfieUrl ? (
                <TouchableOpacity
                  onPress={() => setSelfiePreviewModalVisible(true)}
                  activeOpacity={0.85}
                  style={styles.selfieThumbnailWrap}
                >
                  <Image source={{ uri: todaySelfieUrl }} style={styles.selfieThumbnail} />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="scan" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.selfiePlaceholderWrap}>
                  <Ionicons name="person" size={32} color="#70007C" />
                </View>
              )}

              <View style={styles.verifiedDetailsCol}>
                <View style={styles.verifiedDetailItem}>
                  <Ionicons name="time-outline" size={15} color="#70007C" />
                  <Text style={styles.verifiedDetailText}>Check-In: {checkInTimestamp}</Text>
                </View>
                {checkOutTimestamp && (
                  <View style={styles.verifiedDetailItem}>
                    <Ionicons name="log-out-outline" size={15} color="#8D009C" />
                    <Text style={styles.verifiedDetailText}>Check-Out: {checkOutTimestamp}</Text>
                  </View>
                )}
                <View style={styles.verifiedDetailItem}>
                  <Ionicons name="cloud-done-outline" size={15} color="#10B981" />
                  <Text style={styles.verifiedDetailText}>Stored in Cloudinary</Text>
                </View>
              </View>
            </View>

            {todayEarlyCheckoutReason && (
              <View style={styles.todayEarlyNoticeBox}>
                <Ionicons name="information-circle" size={16} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.todayEarlyNoticeLabel}>Early Checkout Reason (Left before 5:30 PM):</Text>
                  <Text style={styles.todayEarlyNoticeVal}>{todayEarlyCheckoutReason}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Stats Grid Cards Row */}
        <View style={styles.statsGrid}>
          {/* Card 1: Hours This Week */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="time-outline" size={18} color="#4B5563" />
              <Text style={styles.statTitle}>Hours This Week</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statPrimaryVal}>{stats.hoursThisWeek}</Text>
              <Text style={styles.statSecondaryVal}>/{stats.targetWeeklyHours}</Text>
            </View>
          </View>

          {/* Card 2: Days Present */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="calendar-outline" size={18} color="#4B5563" />
              <Text style={styles.statTitle}>Days Present</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statPrimaryVal}>{stats.daysPresent}</Text>
              <Text style={styles.statSecondaryVal}>/{stats.totalWorkingDays}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            style={styles.viewCalendarBtn}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewCalendarText}>View Calendar</Text>
            <Ionicons name="calendar" size={16} color="#70007C" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Activity Items List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <View style={styles.activityList}>
            {activities.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <Ionicons name="calendar-outline" size={44} color="#D8B4E2" />
                <Text style={styles.emptyActivityTitle}>No attendance records this month</Text>
                <Text style={styles.emptyActivitySub}>
                  Use the check-in button above to record your attendance.
                </Text>
              </View>
            ) : (
              activities.map((item) => {
                const isAbsent = item.status === 'ABSENT';
                return (
                  <View key={item.id} style={styles.activityCard}>
                    {/* Left Vertical Color Bar Indicator */}
                    <View
                      style={[
                        styles.verticalIndicator,
                        { backgroundColor: isAbsent ? colors.error : colors.primary },
                      ]}
                    />

                    <View style={styles.activityContent}>
                      {/* Left: Date & Day */}
                      <View style={styles.dateCol}>
                        <Text style={styles.activityDate}>{item.date}</Text>
                        <Text style={styles.activityDay}>{item.dayName}</Text>
                      </View>

                      {/* Center & Right: Time & Duration Pill */}
                      <View style={styles.timeDurationCol}>
                        <Text
                          style={[
                            styles.timeRangeText,
                            isAbsent && styles.absentTimeText,
                          ]}
                        >
                          {item.timeRange}
                        </Text>
                        <View
                          style={[
                            styles.durationBadge,
                            {
                              backgroundColor: isAbsent ? colors.errorLight : colors.primarySoft,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationBadgeText,
                              { color: isAbsent ? colors.error : colors.primary },
                            ]}
                          >
                            {item.durationText}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {item.earlyCheckoutReason && (
                      <View style={styles.activityEarlyBox}>
                        <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
                        <Text style={styles.activityEarlyText} numberOfLines={2}>
                          Early Leave: {item.earlyCheckoutReason}
                        </Text>
                      </View>
                    )}
                    {item.lateCheckInReason && (
                      <View style={styles.activityLateBox}>
                        <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                        <Text style={styles.activityLateText} numberOfLines={2}>
                          Late Check-In: {item.lateCheckInReason}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <BottomNavBar activeTab="Attendance" onNavigate={handleNavigation} />

      {/* Selfie Capture & Verification Modal */}
      <SelfieVerificationModal
        visible={selfieModalVisible}
        onClose={() => setSelfieModalVisible(false)}
        onConfirmCheckIn={handleConfirmCheckInWithSelfie}
        employeeName={user?.fullName || user?.username}
      />

      <Modal
        animationType="fade"
        transparent
        visible={lateCheckInModalVisible}
        onRequestClose={() => setLateCheckInModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.earlyModalCard}>
            <View style={styles.earlyModalHeader}>
              <View style={styles.earlyModalIconWrap}>
                <Ionicons name="alert-circle" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.earlyModalTitle}>Late Check-In</Text>
                <Text style={styles.earlyModalSub}>Shift starts at 10:00 AM</Text>
              </View>
              <TouchableOpacity onPress={() => setLateCheckInModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View style={styles.earlyNoticeBanner}>
              <Ionicons name="information-circle" size={18} color="#B45309" />
              <Text style={styles.earlyNoticeText}>
                You are checking in after the scheduled start time. Please provide a reason.
              </Text>
            </View>
            <Text style={styles.presetSectionTitle}>Reason for late check-in *</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Traffic, transport delay, emergency..."
              placeholderTextColor="#9CA3AF"
              value={lateCheckInReason}
              onChangeText={setLateCheckInReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.earlyModalBtnRow}>
              <TouchableOpacity style={styles.cancelEarlyBtn} onPress={() => setLateCheckInModalVisible(false)}>
                <Text style={styles.cancelEarlyBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitEarlyBtn} onPress={confirmLateCheckInReason}>
                <Text style={styles.submitEarlyBtnText}>Continue to Check-In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-size Selfie Inspector Modal */}
      {todaySelfieUrl && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={selfiePreviewModalVisible}
          onRequestClose={() => setSelfiePreviewModalVisible(false)}
        >
          <View style={styles.imageViewerOverlay}>
            <View style={styles.imageViewerCard}>
              <View style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>Check-In Face Selfie</Text>
                <TouchableOpacity onPress={() => setSelfiePreviewModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: todaySelfieUrl }} style={styles.fullSelfieImage} resizeMode="contain" />
              <View style={styles.imageViewerFooter}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.imageViewerFooterText}>Verified Face Check-In • {checkInTimestamp}</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Early Check-Out Reason Modal (Before 5:30 PM) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={earlyCheckoutModalVisible}
        onRequestClose={() => {
          if (!actionLoading) setEarlyCheckoutModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.earlyModalCard}>
            {/* Header */}
            <View style={styles.earlyModalHeader}>
              <View style={styles.earlyModalIconWrap}>
                <Ionicons name="time" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.earlyModalTitle}>Early Check-Out</Text>
                <Text style={styles.earlyModalSub}>Shift hours: 10:00 AM – 5:30 PM</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!actionLoading) setEarlyCheckoutModalVisible(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Warning Banner */}
            <View style={styles.earlyNoticeBanner}>
              <Ionicons name="information-circle" size={18} color="#B45309" style={{ marginTop: 1 }} />
              <Text style={styles.earlyNoticeText}>
                You are checking out before regular shift end time (5:30 PM). Please specify the reason for early departure for admin records.
              </Text>
            </View>

            {/* Preset chips */}
            <Text style={styles.presetSectionTitle}>Select Common Reason:</Text>
            <View style={styles.presetChipsWrap}>
              {EARLY_REASON_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.label;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => setSelectedPreset(isSelected ? '' : preset.label)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={preset.icon as any}
                      size={14}
                      color={isSelected ? colors.primary : '#6B7280'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Input */}
            <Text style={styles.presetSectionTitle}>
              {selectedPreset ? `Additional Notes for ${selectedPreset}:` : 'Or Type Reason / Notes *'}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={selectedPreset ? 'Optional additional details / notes...' : 'e.g. Doctor appointment, family emergency, official client visit...'}
              placeholderTextColor="#9CA3AF"
              value={customReasonText}
              onChangeText={setCustomReasonText}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              editable={!actionLoading}
            />

            {/* Buttons */}
            <View style={styles.earlyModalBtnRow}>
              <TouchableOpacity
                style={styles.cancelEarlyBtn}
                onPress={() => setEarlyCheckoutModalVisible(false)}
                disabled={actionLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelEarlyBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitEarlyBtn,
                  (!selectedPreset && !customReasonText.trim() || actionLoading) && styles.submitEarlyBtnDisabled,
                ]}
                onPress={() => {
                  const finalReason = selectedPreset
                    ? (customReasonText.trim() ? `${selectedPreset} — ${customReasonText.trim()}` : selectedPreset)
                    : customReasonText.trim();

                  if (!finalReason) {
                    Alert.alert('Reason Required', 'Please select or enter a reason for early check-out.');
                    return;
                  }
                  processCheckOut(finalReason);
                }}
                disabled={(!selectedPreset && !customReasonText.trim()) || actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitEarlyBtnText}>Check Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar View Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Monthly Calendar</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>Attendance log overview for current month</Text>
            <View style={styles.calendarDemoBox}>
              <Ionicons name="calendar-sharp" size={60} color="#70007C" />
              <Text style={styles.calendarDemoText}>{stats.daysPresent} Working Days Logged</Text>
              <Text style={styles.calendarDemoSub}>Face-Verified Attendance Active</Text>
            </View>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Close Overview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  currentTimeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  clockDisplay: {
    width: '100%',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0,
    textAlign: 'center',
  },
  dateDisplay: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  checkInBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInBtnActive: {
    backgroundColor: colors.success,
    opacity: 0.9,
  },
  checkOutBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  checkOutBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  btnIconWrapper: {
    marginRight: 8,
  },
  btnIconWrapperOut: {
    marginRight: 8,
  },
  btnTextWrapper: {
    alignItems: 'flex-start',
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  checkOutBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  shiftSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Verified Check-In Card
  verifiedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  verifiedLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginLeft: 6,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  verifiedContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfieThumbnailWrap: {
    position: 'relative',
    marginRight: spacing.md,
  },
  selfieThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfiePlaceholderWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  verifiedDetailsCol: {
    flex: 1,
    gap: 4,
  },
  verifiedDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  todayEarlyNoticeBox: {
    marginTop: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  todayEarlyNoticeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  todayEarlyNoticeVal: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
    marginTop: 1,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statPrimaryVal: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  statSecondaryVal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 2,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  viewCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCalendarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Activity List
  activityList: {
    gap: spacing.sm,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'column',
    overflow: 'hidden',
    padding: spacing.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  verticalIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 6,
  },
  dateCol: {},
  activityDate: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  activityDay: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  timeDurationCol: {
    alignItems: 'flex-end',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  absentTimeText: {
    color: colors.error,
  },
  durationBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activityEarlyBox: {
    marginTop: spacing.xs,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  activityEarlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },
  activityLateBox: {
    marginTop: spacing.xs,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  activityLateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A3412',
    marginLeft: 4,
  },

  // Image Viewer Modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  imageViewerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.textPrimary,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  imageViewerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fullSelfieImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: colors.success,
  },
  imageViewerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  imageViewerFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.border,
    marginLeft: 6,
  },

  // Early Leave Modal
  earlyModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  earlyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  earlyModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earlyModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  earlyModalSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
  earlyNoticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
  },
  earlyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 17,
    marginLeft: 6,
  },
  presetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  presetChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: '#1F2937',
    minHeight: 70,
    marginBottom: spacing.lg,
  },
  earlyModalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelEarlyBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEarlyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitEarlyBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitEarlyBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitEarlyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  modalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  calendarDemoBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  calendarDemoText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.md,
  },
  calendarDemoSub: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  closeModalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyActivityBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
    marginVertical: spacing.sm,
  },
  emptyActivityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.md,
  },
  emptyActivitySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
