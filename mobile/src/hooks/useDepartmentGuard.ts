import { useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from './useAuth';
import { AppAlert as Alert } from '../utils/appAlert';
import { Department } from '../types';

/**
 * Hook to protect department-specific screens.
 * If the logged-in user's department is not among the allowed departments (and user is not admin),
 * an alert is presented and the user is redirected back to the Home screen.
 *
 * @param allowedDepartments Allowed department or list of allowed departments
 * @param navigation Navigation prop
 * @returns boolean whether access is authorized
 */
export const useDepartmentGuard = (
  allowedDepartments: Department | Department[],
  navigation: any
): boolean => {
  const { user } = useAuth();
  const hasAlertedRef = useRef(false);

  const isAdmin = user?.role === 'admin';
  const userDept = (user?.department || '').toLowerCase();

  const allowedList = (
    Array.isArray(allowedDepartments) ? allowedDepartments : [allowedDepartments]
  ).map((d) => d.toLowerCase());

  const isAllowed = isAdmin || allowedList.includes(userDept);

  const enforceAccess = () => {
    if (!isAllowed && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      const formattedAllowed = allowedList
        .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
        .join(' or ');

      Alert.alert(
        'Access Restricted',
        `This screen is restricted to the ${formattedAllowed} department. Redirecting to your Home screen.`,
        [
          {
            text: 'OK',
            onPress: () => {
              hasAlertedRef.current = false;
              navigation.navigate('Home');
            },
          },
        ]
      );

      // Immediately navigate back to Home
      navigation.navigate('Home');
    }
  };

  useEffect(() => {
    enforceAccess();
  }, [isAllowed]);

  useFocusEffect(
    () => {
      enforceAccess();
    }
  );

  return isAllowed;
};
