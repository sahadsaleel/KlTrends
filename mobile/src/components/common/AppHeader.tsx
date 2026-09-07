import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppAlert as Alert } from '../../utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';

interface AppHeaderProps {
  title?: string;
  avatarUrl?: string;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  showLogo?: boolean;
  showAvatar?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotificationIcon?: boolean;
  unreadCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  avatarUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  onProfilePress,
  onNotificationPress,
  showLogo = true,
  showAvatar = false,
  showBackButton = false,
  onBackPress,
  showNotificationIcon = false,
  unreadCount = 0,
}) => {
  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      Alert.alert('Notifications', 'No new notifications');
    }
  };

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : showAvatar ? (
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        </TouchableOpacity>
      ) : (
        <View style={styles.leftPlaceholder} />
      )}

      <View style={styles.centerContainer}>
        {showLogo ? (
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.headerTitle}>{title || 'KL Trends'}</Text>
        )}
      </View>

      {showNotificationIcon ? (
        <TouchableOpacity
          style={styles.bellButton}
          onPress={handleNotification}
          activeOpacity={0.7}
        >
          <View style={styles.bellWrapper}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 175,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  bellButton: {
    padding: spacing.xs,
  },
  bellWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  rightPlaceholder: {
    width: 44,
  },
  leftPlaceholder: {
    width: 44,
  },
});
