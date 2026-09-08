import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert as NativeAlert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '../../components/common/Text';
import { AppHeader } from '../../components/common/AppHeader';
import { BottomNavBar, TabName } from '../../components/common/BottomNavBar';
import { spacing, borderRadius } from '../../theme/spacing';
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
    Alert.alert('Remove profile photo', 'Your photo will be removed when you save these changes.', [
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

      Alert.alert('Success', 'Admin profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
  )}&background=70007C&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Admin Profile"
        avatarUrl={avatarUrl || fallbackAvatar}
        onProfilePress={() => { }}
        showNotificationIcon={false}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Admin Header Banner */}
          <View style={styles.adminHeaderBanner}>
            <TouchableOpacity
              style={styles.avatarDottedContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatarUrl || fallbackAvatar }} style={styles.avatarImage} />
              <View style={styles.cameraBadgeOverlay}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changePhotoPill}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.changePhotoPillText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.removePhotoPill}
                onPress={handleRemoveImage}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.changePhotoPillText}>Remove Photo</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.adminBannerName}>{fullName || 'Administrator'}</Text>
            {/* <View style={styles.adminRoleBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.adminRoleText}>Administrator</Text>
            </View> */}
            <Text style={styles.adminEmailText}>{user?.email || 'admin@kltrends.com'}</Text>
          </View>

          {/* Edit Admin Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="create-outline" size={20} color="#70007C" style={{ marginRight: 8 }} />
              <Text style={styles.sectionHeaderTitle}>Edit Admin Details</Text>
            </View>

            {/* Admin Name Input */}
            <Text style={styles.fieldLabel}>
              Admin Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#70007C" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter admin full name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Profile Photo Gallery Action Button */}
            <TouchableOpacity
              style={styles.galleryChooseBtn}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={18} color="#70007C" style={{ marginRight: 8 }} />
              <Text style={styles.galleryChooseBtnText}>
                {avatarUrl ? 'Change Photo from Gallery' : 'Upload Photo from Gallery'}
              </Text>
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.removePhotoBtnText}>Remove Profile Photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Account Information Card (Read-only reference) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="information-circle-outline" size={20} color="#70007C" style={{ marginRight: 8 }} />
              <Text style={styles.sectionHeaderTitle}>System Info</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Role</Text>
              <Text style={styles.infoValue}>System Administrator</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Corporate Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'admin@kltrends.com'}</Text>
            </View>
          </View>

          {/* Save Button Container */}
          <View style={styles.saveBtnContainer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Update Admin Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar activeTab="Profile" onNavigate={handleNavigation} isAdmin={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  adminHeaderBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarDottedContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  cameraBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: spacing.sm,
  },
  changePhotoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removePhotoPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220, 38, 38, 0.75)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)', marginBottom: spacing.sm,
  },
  adminBannerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  adminRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.xl,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  adminRoleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminEmailText: {
    fontSize: 13,
    color: colors.borderPurple,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primarySoft,
    paddingBottom: spacing.xs + 2,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  requiredAsterisk: {
    color: colors.primary,
  },
  inputWrapper: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.xs,
  },
  galleryChooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.borderPurple,
  },
  galleryChooseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  removePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
    paddingVertical: spacing.md - 2, borderRadius: borderRadius.md, borderWidth: 1.5,
    borderColor: colors.errorLight, backgroundColor: colors.errorLight,
  },
  removePhotoBtnText: { fontSize: 14, fontWeight: '800', color: colors.error },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primarySoft,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  saveBtnContainer: {
    marginTop: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
  },
  signOutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '800',
  },
});
