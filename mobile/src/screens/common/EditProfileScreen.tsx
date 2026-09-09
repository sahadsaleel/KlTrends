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
import { colors } from '../../theme/colors';
import { AppAlert as Alert } from '../../utils/appAlert';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const getDepartmentLabel = (dept?: string): string => {
  if (!dept) return 'Not assigned';
  return dept.charAt(0).toUpperCase() + dept.slice(1);
};

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, login, logout } = useAuth();

  // Form states
  const [fullName, setFullName] = useState<string>(user?.fullName || user?.username || '');
  const [age, setAge] = useState<string>(user?.age ? String(user.age) : '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [joiningDate, setJoiningDate] = useState<string>(user?.joiningDate || '');
  const [department, setDepartment] = useState<string>(user?.department || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');

  const [saving, setSaving] = useState<boolean>(false);

  // Initialize form with logged in user data if available
  useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.age) setAge(String(user.age));
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      if (user.joiningDate) setJoiningDate(user.joiningDate);
      if (user.department) setDepartment(user.department);
      if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
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
      console.error('Gallery image pick error:', error);
      Alert.alert('Error', 'Unable to pick image from gallery. Please try again.');
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
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      age: age ? parseInt(age, 10) : undefined,
      email: email.trim(),
      phone: phone.trim(),
      joiningDate: joiningDate.trim(),
      avatarUrl: avatarUrl.trim(),
    };

    const response = await authApi.updateProfile(payload);
    setSaving(false);

    if (response.success && response.user) {
      const token = await import('../../services/storage').then((s) => s.storage.getToken());
      if (token) {
        await login(response.user, token);
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', response.error || 'Failed to save profile changes.');
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
          navigation.navigate('Home');
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
          break;
      }
    },
    [navigation]
  );

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || 'User'
  )}&background=70007C&color=fff&size=200`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="KL Trends"
        avatarUrl={avatarUrl || fallbackAvatar}
        onProfilePress={() => {}}
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
          {/* Section 1: Profile Picture Card */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.avatarDottedContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: avatarUrl || fallbackAvatar }}
                style={styles.avatarImage}
              />
              <View style={styles.cameraBadgeOverlay}>
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.avatarTitle}>Profile Picture</Text>
            <TouchableOpacity
              style={styles.galleryChooseBtn}
              onPress={handlePickImage}
              activeOpacity={0.75}
            >
              <Ionicons name="images-outline" size={16} color="#70007C" style={{ marginRight: 6 }} />
              <Text style={styles.galleryChooseBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.removePhotoBtnText}>Remove Photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Section 2: Personal Information Card */}
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>Personal Information</Text>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>
              Full Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Age */}
            <Text style={styles.fieldLabel}>Age</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 30"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>

            {/* Email Address */}
            <Text style={styles.fieldLabel}>
              Email Address <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="jane.doe@company.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Number */}
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Section 3: Employment Details Card */}
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>Employment Details</Text>

            {/* Joining Date */}
            <Text style={styles.fieldLabel}>
              Joining Date <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, styles.inputWithRightIcon]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={joiningDate}
                onChangeText={setJoiningDate}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#9CA3AF"
              />
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </View>

            {/* Department */}
            <Text style={styles.fieldLabel}>
              Department <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, styles.dropdownPicker]}>
              <Text
                style={[
                  styles.dropdownText,
                ]}
              >
                {getDepartmentLabel(department)}
              </Text>
              <Ionicons name="lock-closed-outline" size={17} color="#6B7280" />
            </View>
            <Text style={styles.inputHelpText}>Department is assigned during account creation.</Text>
          </View>

          {/* Save Button Row */}
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
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save Profile</Text>
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

      <BottomNavBar activeTab="Profile" onNavigate={handleNavigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarDottedContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  cameraBadgeOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  galleryChooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    alignSelf: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderPurple,
  },
  galleryChooseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  removePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginTop: 10, paddingHorizontal: spacing.md + 4, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.errorLight, backgroundColor: colors.errorLight,
  },
  removePhotoBtnText: { fontSize: 13, fontWeight: '700', color: colors.error },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs + 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  requiredAsterisk: {
    color: colors.error,
  },
  inputWrapper: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  inputWithRightIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  input: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.xs,
  },
  inputHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  saveBtnContainer: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md - 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  deptOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  deptOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
