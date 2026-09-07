import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert as NativeAlert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from './common/Text';
import { colors } from '../theme/colors';
import { AppAlert as Alert } from '../utils/appAlert';
import { spacing, borderRadius } from '../theme/spacing';

interface SelfieVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCheckIn: (selfieBase64: string) => Promise<boolean | void>;
  employeeName?: string;
}

export const SelfieVerificationModal: React.FC<SelfieVerificationModalProps> = ({
  visible,
  onClose,
  onConfirmCheckIn,
  employeeName = 'Employee',
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isFaceVerified, setIsFaceVerified] = useState<boolean>(false);

  // Reset states on modal close
  const handleClose = () => {
    if (uploading) return;
    setCapturedImage(null);
    setImageBase64(null);
    setIsFaceVerified(false);
    onClose();
  };

  // Launch Front Camera for Selfie
  const handleTakeSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to capture your check-in selfie.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCapturedImage(asset.uri);
        if (asset.base64) {
          setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageBase64(asset.uri);
        }
        setIsFaceVerified(true);
      }
    } catch (error: any) {
      console.error('Error opening camera:', error);
      Alert.alert(
        'Camera Error',
        'Could not open camera. Please check camera permissions in your settings and try again.'
      );
    }
  };

  // Submit selfie for verification and check in
  const handleConfirm = async () => {
    const payloadImage = imageBase64 || capturedImage;
    if (!payloadImage) {
      Alert.alert('Selfie Required', 'Please take a face selfie to verify your attendance.');
      return;
    }

    try {
      setUploading(true);
      const result = await onConfirmCheckIn(payloadImage);
      if (result !== false) {
        // Success: reset and close modal
        setCapturedImage(null);
        setImageBase64(null);
        setIsFaceVerified(false);
        onClose();
      }
    } catch (error: any) {
      Alert.alert('Check-In Error', error.message || 'Failed to complete check-in. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setImageBase64(null);
    setIsFaceVerified(false);
    handleTakeSelfie();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithBadge}>
              <View style={styles.shieldIconWrap}>
                <Ionicons name="scan-circle" size={26} color="#70007C" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Face Verification</Text>
                <Text style={styles.modalSubtitle}>Employee Live Selfie Check-In</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={uploading}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={28} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          {!capturedImage ? (
            // State 1: Capture Instructions & Camera Trigger
            <View style={styles.captureStepContainer}>
              <View style={styles.ovalFrameContainer}>
                <View style={styles.ovalFrameOuter}>
                  <View style={styles.ovalFrameInner}>
                    <Ionicons name="person-circle-outline" size={88} color="#70007C" />
                    <View style={styles.scanLine} />
                  </View>
                </View>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>

              <Text style={styles.instructionTitle}>Position Your Face Inside</Text>
              <Text style={styles.instructionBody}>
                Take a clear front-camera selfie. Live camera photo is required to verify your identity and record your attendance.
              </Text>

              {/* Action Button: Camera Capture ONLY */}
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleTakeSelfie}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionBtnText}>Take Front Selfie</Text>
              </TouchableOpacity>

              <View style={styles.securityNoteRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
                <Text style={styles.securityNoteText}>
                  Direct camera selfie required • Gallery uploads disabled
                </Text>
              </View>
            </View>
          ) : (
            // State 2: Preview & Confirmation
            <View style={styles.previewStepContainer}>
              <View style={styles.previewImageWrapper}>
                <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                <View style={styles.verifiedCheckBadge}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                </View>
              </View>

              {/* Verification Badges Row */}
              <View style={styles.verificationStatusCard}>
                <View style={styles.statusItemRow}>
                  <Ionicons name="checkmark-done" size={16} color="#10B981" />
                  <Text style={styles.statusItemText}>Face Selfie Captured</Text>
                </View>
                <View style={styles.statusItemRow}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#70007C" />
                  <Text style={styles.statusItemText}>Ready for Cloudinary Verification</Text>
                </View>
                <View style={styles.statusItemRow}>
                  <Ionicons name="time-outline" size={16} color="#4B5563" />
                  <Text style={styles.statusItemText}>
                    Timestamp: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              {/* Confirm / Retake Buttons */}
              {uploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="large" color="#70007C" />
                  <Text style={styles.uploadingText}>Verifying Face & Uploading to Cloudinary...</Text>
                  <Text style={styles.uploadingSubtext}>Please wait a moment while attendance is recorded</Text>
                </View>
              ) : (
                <View style={styles.buttonActionRow}>
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleRetake}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#4B5563" style={{ marginRight: 6 }} />
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmBtnText}>Verify & Check In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: spacing.sm + 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B0040',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  closeBtn: {
    padding: 2,
  },

  // Capture Step
  captureStepContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  ovalFrameContainer: {
    width: 170,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  ovalFrameOuter: {
    width: 156,
    height: 196,
    borderRadius: 78,
    borderWidth: 2.5,
    borderColor: '#70007C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5FF',
  },
  ovalFrameInner: {
    width: 138,
    height: 178,
    borderRadius: 69,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#70007C',
    opacity: 0.6,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#70007C',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#70007C',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#70007C',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#70007C',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionBody: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70007C',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: '#70007C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  securityNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 5,
  },

  // Preview Step
  previewStepContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  previewImageWrapper: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: '#10B981',
    position: 'relative',
    marginBottom: spacing.md,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 85,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verificationStatusCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  statusItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  uploadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70007C',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  uploadingSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  buttonActionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#70007C',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70007C',
    borderRadius: 16,
    paddingVertical: spacing.md,
    shadowColor: '#70007C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
