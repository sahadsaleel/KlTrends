import React from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { AdminRegisterScreen } from '../screens/admin/AdminRegisterScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { AdminReportDownloadScreen } from '../screens/admin/AdminReportDownloadScreen';

import { EmployeeLoginScreen } from '../screens/employee/EmployeeLoginScreen';
import { EmployeeRegisterScreen } from '../screens/employee/EmployeeRegisterScreen';
import { ForgotPasswordScreen } from '../screens/employee/ForgotPasswordScreen';

import { HomeScreen } from '../screens/common/HomeScreen';
import { AttendanceScreen } from '../screens/common/AttendanceScreen';
import { EditProfileScreen } from '../screens/common/EditProfileScreen';

import { SalesReportScreen, SalesReportsScreen } from '../screens/departments/sales/SalesReportScreen';
import { AddEditReportScreen } from '../screens/departments/sales/AddEditReportScreen';
import { ProductReturnsScreen } from '../screens/departments/manager/ProductReturnsScreen';
import { AddProductReturnScreen } from '../screens/departments/manager/AddProductReturnScreen';
import { ProductReturnHistoryScreen } from '../screens/departments/manager/ProductReturnHistoryScreen';
import { DailyExpenseScreen } from '../screens/departments/manager/DailyExpenseScreen';
import { AddDailyExpenseScreen } from '../screens/departments/manager/AddDailyExpenseScreen';
import { ExpenseHistoryScreen } from '../screens/departments/manager/ExpenseHistoryScreen';
import { PackagingDutiesScreen } from '../screens/departments/packaging/PackagingDutiesScreen';
import { DailyPackingScreen } from '../screens/departments/packaging/DailyPackingScreen';
import { AddDailyPackingScreen } from '../screens/departments/packaging/AddDailyPackingScreen';
import { PackingHistoryScreen } from '../screens/departments/packaging/PackingHistoryScreen';
import { MediaDutiesScreen } from '../screens/departments/media/MediaDutiesScreen';
import { TotalVideoShootScreen } from '../screens/departments/media/TotalVideoShootScreen';
import { AddVideoShootScreen } from '../screens/departments/media/AddVideoShootScreen';
import { VideoShootHistoryScreen } from '../screens/departments/media/VideoShootHistoryScreen';
import { VideoOutScreen } from '../screens/departments/media/VideoOutScreen';
import { AddVideoOutScreen } from '../screens/departments/media/AddVideoOutScreen';
import { VideoOutHistoryScreen } from '../screens/departments/media/VideoOutHistoryScreen';
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
  AddEditReport: { report?: Report } | undefined;
  ProductReturns: undefined;
  AddProductReturn: undefined;
  ProductReturnHistory: undefined;
  DailyExpenses: undefined;
  AddDailyExpense: undefined;
  ExpenseHistory: undefined;
  PackagingDuties: undefined;
  DailyPacking: undefined;
  AddDailyPacking: undefined;
  PackingHistory: undefined;
  MediaDuties: undefined;
  TotalVideoShoot: undefined;
  AddVideoShoot: undefined;
  VideoShootHistory: undefined;
  VideoOut: undefined;
  AddVideoOut: undefined;
  VideoOutHistory: undefined;
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
  const department = (user?.department || 'sales').toLowerCase();

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
              // Admin Navigation
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
            ) : department === 'manager' ? (
              // Manager Department Navigation: Home -> Product Returns -> Daily Expenses -> Attendance -> Profile
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="ProductReturns"
                  component={ProductReturnsScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AddProductReturn"
                  component={AddProductReturnScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="ProductReturnHistory"
                  component={ProductReturnHistoryScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="DailyExpenses"
                  component={DailyExpenseScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AddDailyExpense"
                  component={AddDailyExpenseScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="ExpenseHistory"
                  component={ExpenseHistoryScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Attendance"
                  component={AttendanceScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ headerShown: false }}
                />
              </>
            ) : department === 'packaging' ? (
              // Packaging Department Navigation: Home -> Packaging Duties -> Attendance -> Profile
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="PackagingDuties"
                  component={PackagingDutiesScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="DailyPacking" component={DailyPackingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AddDailyPacking" component={AddDailyPackingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PackingHistory" component={PackingHistoryScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="Attendance"
                  component={AttendanceScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ headerShown: false }}
                />
              </>
            ) : department === 'media' ? (
              // Media Department Navigation: Home -> Media Duties -> Attendance -> Profile
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="MediaDuties"
                  component={MediaDutiesScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="TotalVideoShoot" component={TotalVideoShootScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AddVideoShoot" component={AddVideoShootScreen} options={{ headerShown: false }} />
                <Stack.Screen name="VideoShootHistory" component={VideoShootHistoryScreen} options={{ headerShown: false }} />
                <Stack.Screen name="VideoOut" component={VideoOutScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AddVideoOut" component={AddVideoOutScreen} options={{ headerShown: false }} />
                <Stack.Screen name="VideoOutHistory" component={VideoOutHistoryScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="Attendance"
                  component={AttendanceScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{ headerShown: false }}
                />
              </>
            ) : (
              // Sales Department Navigation: Home -> Sales Reports -> Add Report -> Attendance -> Profile
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
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
                  name="Attendance"
                  component={AttendanceScreen}
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
