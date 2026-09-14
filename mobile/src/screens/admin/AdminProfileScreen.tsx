import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../components/common/Text';
import { BottomNavBar, TabName } from '../../components/common/BottomNavBar';
import { colors } from '../../theme/colors';
import { AppAlert as Alert } from '../../utils/appAlert';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminProfile'>;

export const AdminProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, login, logout } = useAuth();

  const [fullName, setFullName] = useState<string>(user?.fullName || user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      if (user.fullName || user.username) setFullName(user.fullName || user.username || '');
      if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const hasChanges =
    fullName.trim() !== (user?.fullName || user?.username || '').trim() ||
    (avatarUrl || '').trim() !== (user?.avatarUrl || '').trim();

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to choose an admin profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setAvatarUrl(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
        } else if (asset.uri) {
          setAvatarUrl(asset.uri);
        }
      }
    } catch (error) {
      console.error('Admin gallery pick error:', error);
      Alert.alert('Error', 'Failed to select image from gallery.');
    }
  };

  const handleRemoveImage = () => {
    Alert.alert('Remove Profile Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAvatarUrl('') },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Admin name cannot be empty.');
      return;
    }

    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      avatarUrl: avatarUrl.trim(),
    };

    const response = await authApi.updateProfile(payload);
    setSaving(false);

    if (response.success && response.user) {
      const token = await import('../../services/storage').then((s) => s.storage.getToken());
      if (token) {
        await login(response.user, token);
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', response.error || 'Failed to update admin profile.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home':
        case 'Attendance':
        case 'Reports':
          navigation.navigate('AdminDashboard');
          break;
        case 'Profile':
          break;
      }
    },
    [navigation]
  );

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || 'Admin'
  )}&background=570490&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Profile Card */}
          <View style={styles.heroCard}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickImage}
              activeOpacity={0.85}
            >
              <Image source={{ uri: avatarUrl || fallbackAvatar }} style={styles.avatarImg} />
              <View style={styles.cameraPill}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.adminName}>{fullName || 'Administrator'}</Text>

            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
              <Text style={styles.rolePillText}>System Administrator</Text>
            </View>

            <Text style={styles.adminEmail}>{user?.email || 'admin@kltrends.com'}</Text>

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={14} color={colors.primary} />
                <Text style={styles.photoActionText}>
                  {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                </Text>
              </TouchableOpacity>

              {avatarUrl ? (
                <>
                  <Text style={styles.photoActionDot}>·</Text>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={handleRemoveImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={[styles.photoActionText, { color: colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>

          {/* Account Information Section */}
          <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
          <View style={styles.card}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={17} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter administrator name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Work Email (Read-only) */}
            <View style={styles.readOnlyRow}>
              <View style={styles.readOnlyIconWrap}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.readOnlyLabel}>Corporate Email</Text>
                <Text style={styles.readOnlyValue}>{user?.email || 'admin@kltrends.com'}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Access Role */}
            <View style={styles.readOnlyRow}>
              <View style={styles.readOnlyIconWrap}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.readOnlyLabel}>Access Level</Text>
                <Text style={styles.readOnlyValue}>Full Administrator Access</Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="lock-closed" size={11} color={colors.primary} />
                <Text style={[styles.verifiedBadgeText, { color: colors.primary }]}>Active</Text>
              </View>
            </View>
          </View>

          {/* Quick Shortcuts Section */}
          <Text style={styles.sectionLabel}>QUICK SHORTCUTS</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.shortcutRow}
              onPress={() => navigation.navigate('AdminReportDownload')}
              activeOpacity={0.7}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="download-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shortcutTitle}>Export Reports</Text>
                <Text style={styles.shortcutDesc}>Download PDF and Excel summaries</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            <TouchableOpacity
              style={styles.shortcutRow}
              onPress={() => navigation.navigate('AdminDashboard')}
              activeOpacity={0.7}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="grid-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shortcutTitle}>Dashboard & Attendance</Text>
                <Text style={styles.shortcutDesc}>Live staff stats and departments</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Save Profile Button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              !hasChanges && styles.saveBtnDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={saving || !hasChanges}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>
                  {hasChanges ? 'Save Changes' : 'Saved'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out of Admin Account</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar activeTab="Profile" onNavigate={handleNavigation} isAdmin={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primarySoft,
    borderWidth: 2.5,
    borderColor: colors.borderPurple,
  },
  cameraPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  adminName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  adminEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    fontWeight: '500',
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  photoActionDot: {
    color: colors.borderPurple,
    fontSize: 14,
  },

  // Section Labels & Cards
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },

  // Form Inputs
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPurple,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
  },

  // Read-only rows
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readOnlyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  readOnlyValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },

  // Shortcuts
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shortcutDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Save Button
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: colors.borderPurple,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Sign out Button
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
});
