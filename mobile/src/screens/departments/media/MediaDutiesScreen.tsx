import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../../components/common/Text';
import { AppHeader } from '../../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../../components/common/BottomNavBar';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { useAuth } from '../../../hooks/useAuth';
import { useDepartmentGuard } from '../../../hooks/useDepartmentGuard';
import { RootStackParamList } from '../../../navigation/RootNavigator';
import { mediaApi } from '../../../api/media';

type Props = NativeStackScreenProps<RootStackParamList, 'MediaDuties'>;

export const MediaDutiesScreen: React.FC<Props> = ({ navigation }) => {
  const isAuthorized = useDepartmentGuard('media', navigation);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [videoStats, setVideoStats] = useState({ todayShoot: 0, todayOut: 0, totalShoot: 0, totalOut: 0 });

  const loadVideoStats = useCallback(async () => {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const [shoots, outs, todayShoots, todayOuts] = await Promise.all([
      mediaApi.list('video-shoot'),
      mediaApi.list('video-out'),
      mediaApi.list('video-shoot', { date: todayDate }),
      mediaApi.list('video-out', { date: todayDate }),
    ]);

    setVideoStats({
      todayShoot: todayShoots.data?.summary.totalVideos || 0,
      todayOut: todayOuts.data?.summary.totalVideos || 0,
      totalShoot: shoots.data?.summary.totalVideos || 0,
      totalOut: outs.data?.summary.totalVideos || 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVideoStats();
    }, [loadVideoStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideoStats();
    setRefreshing(false);
  };

  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home':
          navigation.navigate('Home');
          break;
        case 'MediaDuties':
          break;
        case 'Attendance':
          navigation.navigate('Attendance');
          break;
        case 'Profile':
          navigation.navigate('EditProfile');
          break;
      }
    },
    [navigation]
  );

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.fullName || user?.username || 'Media'
  )}&background=70007C&color=fff&size=200`;

  if (!isAuthorized) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Media Duties"
        showLogo={false}
        avatarUrl={user?.avatarUrl || fallbackAvatar}
        showAvatar={true}
        onProfilePress={() => navigation.navigate('EditProfile')}
      />

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
        <View style={styles.overviewCard}>
          <View style={styles.videoStatsRow}>
            <View style={styles.videoStat}><Text style={styles.videoStatValue}>{videoStats.todayShoot}</Text><Text style={styles.videoStatLabel}>Today&apos;s Shoot</Text></View>
            <View style={styles.videoStat}><Text style={styles.videoStatValue}>{videoStats.todayOut}</Text><Text style={styles.videoStatLabel}>Today&apos;s Out</Text></View>
            <View style={styles.videoStat}><Text style={styles.videoStatValue}>{videoStats.totalShoot}</Text><Text style={styles.videoStatLabel}>Total Shoot</Text></View>
            <View style={styles.videoStat}><Text style={styles.videoStatValue}>{videoStats.totalOut}</Text><Text style={styles.videoStatLabel}>Total Out</Text></View>
          </View>
        </View>

        <View style={styles.featureGrid}>
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('TotalVideoShoot')} activeOpacity={0.85}>
            <Ionicons name="videocam-outline" size={25} color={colors.primary} />
            <Text style={styles.featureTitle}>Total Video Shoot</Text>
            <Text style={styles.featureCaption}>Record and track shoots</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('VideoOut')} activeOpacity={0.85}>
            <Ionicons name="paper-plane-outline" size={25} color={colors.primary} />
            <Text style={styles.featureTitle}>Video Out</Text>
            <Text style={styles.featureCaption}>Track released videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Attendance')} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={25} color={colors.primary} />
            <Text style={styles.featureTitle}>Attendance</Text>
            <Text style={styles.featureCaption}>View attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.85}>
            <Ionicons name="person-outline" size={25} color={colors.primary} />
            <Text style={styles.featureTitle}>Profile</Text>
            <Text style={styles.featureCaption}>Manage your profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomNavBar activeTab="MediaDuties" onNavigate={handleNavigation} />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureCard: {
    width: '48%',
    minHeight: 108,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  featureCaption: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  videoStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  videoStat: {
    width: '50%',
    marginBottom: spacing.sm,
  },
  videoStatValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  videoStatLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
