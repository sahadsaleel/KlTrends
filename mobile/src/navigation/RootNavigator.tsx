import React from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminLoginScreen } from '../screens/AdminLoginScreen';
import { AdminRegisterScreen } from '../screens/AdminRegisterScreen';
import { EmployeeLoginScreen } from '../screens/EmployeeLoginScreen';
import { EmployeeRegisterScreen } from '../screens/EmployeeRegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { SalesReportsScreen } from '../screens/SalesReportsScreen';
import { AddEditReportScreen } from '../screens/AddEditReportScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AdminProfileScreen } from '../screens/AdminProfileScreen';
import { AdminReportDownloadScreen } from '../screens/AdminReportDownloadScreen';
import { Report } from '../api/reports';
import { colors } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';

export type RootStackParamList = {
  EmployeeLogin: undefined;
  EmployeeRegister: undefined;
  AdminLogin: undefined;
  AdminRegister: undefined;
  ForgotPassword: { portal?: 'admin' | 'employee' } | undefined;
  Home: undefined;
  AdminDashboard: undefined;
  Attendance: undefined;
  SalesReports: undefined;
  AddEditReport: { report?: Report };
  EditProfile: undefined;
  AdminProfile: undefined;
  AdminReportDownload: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 160, height: 75, marginBottom: 20 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {isAuthenticated ? (
          // Main Application Stack (User is logged in - Auth screens unmounted)
          <>
            {isAdmin ? (
              <>
                <Stack.Screen
                  name="AdminDashboard"
                  component={AdminDashboardScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AdminProfile"
                  component={AdminProfileScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AdminReportDownload"
                  component={AdminReportDownloadScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Attendance"
                  component={AttendanceScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="SalesReports"
                  component={SalesReportsScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AddEditReport"
                  component={AddEditReportScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </>
        ) : (
          // Auth Stack (User is logged out)
          <>
            <Stack.Screen name="EmployeeLogin" component={EmployeeLoginScreen} />
            <Stack.Screen name="EmployeeRegister" component={EmployeeRegisterScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
