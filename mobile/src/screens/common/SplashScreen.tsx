import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Splash'>> & {
  isReady?: boolean;
  onFinish?: () => void;
};

// Aspect ratio of the KL Trends logo (943 / 383 ≈ 2.462)
const LOGO_ASPECT_RATIO = 943 / 383;

export const SplashScreen: React.FC<Props> = ({
  navigation,
  isReady = true,
  onFinish,
}) => {
  const { width } = useWindowDimensions();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Animation values for smooth entrance and subtle breathing hold
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // Responsive logo sizing adapted for diverse mobile screen widths
  const logoWidth = Math.min(Math.round(width * 0.72), 300);
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT_RATIO);

  useEffect(() => {
    // 1. Entrance animation: smooth fade-in and scale up to 1.0, followed by subtle breathing hold
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scaleAnim, {
        toValue: 1.03,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Minimum splash display duration timer (approx 2 seconds for a professional moment)
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim]);

  // 3. Automatically navigate to the Sign In page once both min time and ready state resolve
  useEffect(() => {
    if (minTimeElapsed && isReady) {
      if (onFinish) {
        onFinish();
      } else if (navigation) {
        navigation.replace('EmployeeLogin');
      }
    }
  }, [minTimeElapsed, isReady, onFinish, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Perfectly Centered Logo with Scale & Fade-in Animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Image
          source={require('../../../assets/logo-white.png')}
          style={[
            styles.logoImage,
            {
              width: logoWidth,
              height: logoHeight,
            },
          ]}
          resizeMode="contain"
          tintColor="#FFFFFF"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    maxWidth: '85%',
  },
});
