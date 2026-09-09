import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
  Alert as NativeAlert,
  BackHandler,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../components/common/Text';
import { BottomNavBar, TabName } from '../../components/common/BottomNavBar';
import { spacing, borderRadius } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { AppAlert as Alert } from '../../utils/appAlert';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/RootNavigator';
import {
  adminApi,
  DashboardStats,
  AdminEmployee,
  EmployeeSales,
  AdminReportsSummary,
} from '../../api/admin';
import { DailyExpense, managerApi, ProductReturn } from '../../api/manager';
import { PackingListResponse } from '../../api/packaging';
import { packagingApi } from '../../api/packaging';
import { EARLY_REASON_PRESETS } from '../common/AttendanceScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;
type ActiveSection = 'overview' | 'employees' | 'reports';
type ReportDepartment = 'sales' | 'manager' | 'packaging';

const getTodayDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });

export const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [salesByEmployee, setSalesByEmployee] = useState<EmployeeSales[]>([]);
  const [reportsSummary, setReportsSummary] = useState<AdminReportsSummary | null>(null);
  const [reportDepartment, setReportDepartment] = useState<ReportDepartment>('sales');
  const [managerReportData, setManagerReportData] = useState<{
    returns: ProductReturn[];
    expenses: DailyExpense[];
  }>({ returns: [], expenses: [] });
  const [packagingReportData, setPackagingReportData] = useState<PackingListResponse['data']>();
  const [selectedSelfieEmployee, setSelectedSelfieEmployee] = useState<AdminEmployee | null>(null);
  const [selfieModalVisible, setSelfieModalVisible] = useState(false);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<AdminEmployee | null>(null);
  const [employeeDetailsModalVisible, setEmployeeDetailsModalVisible] = useState(false);

  const [addEmpModalVisible, setAddEmpModalVisible] = useState(false);
  const [editEmpModalVisible, setEditEmpModalVisible] = useState(false);
  const [empSubmitting, setEmpSubmitting] = useState(false);

  const [newEmpFullName, setNewEmpFullName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Sales');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpAvatarUrl, setNewEmpAvatarUrl] = useState('');

  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editEmpFullName, setEditEmpFullName] = useState('');
  const [editEmpIdVal, setEditEmpIdVal] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpDept, setEditEmpDept] = useState('Sales');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpAvatarUrl, setEditEmpAvatarUrl] = useState('');

  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, empRes, repRes, returnsRes, expensesRes, packagingRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getEmployees(),
        adminApi.getReports(),
        managerApi.getProductReturns(),
        managerApi.getDailyExpenses(),
        packagingApi.list(),
      ]);
      if (dashRes.success && dashRes.data) setStats(dashRes.data);
      if (empRes.success && empRes.data) setEmployees(empRes.data.employees);
      if (repRes.success && repRes.data) {
        setSalesByEmployee(repRes.data.salesByEmployee);
        setReportsSummary(repRes.data.summary);
      }
      setManagerReportData({
        returns: returnsRes.success ? returnsRes.data?.returns || [] : [],
        expenses: expensesRes.success ? expensesRes.data?.expenses || [] : [],
      });
      if (packagingRes.success) setPackagingReportData(packagingRes.data);
    } catch (e) {
      console.error('Admin dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handlePickNewEmpImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to choose employee image.');
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
          setNewEmpAvatarUrl(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
        } else if (asset.uri) {
          setNewEmpAvatarUrl(asset.uri);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handlePickEditEmpImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to choose employee image.');
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
          setEditEmpAvatarUrl(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
        } else if (asset.uri) {
          setEditEmpAvatarUrl(asset.uri);
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpFullName.trim() || !newEmpId.trim() || !newEmpEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name, ID, and email.');
      return;
    }
    setEmpSubmitting(true);
    const res = await adminApi.createEmployee({
      fullName: newEmpFullName.trim(),
      employeeId: newEmpId.trim(),
      email: newEmpEmail.trim(),
      department: newEmpDept.trim(),
      phone: newEmpPhone.trim(),
      password: newEmpPassword.trim() || 'Password123!',
      avatarUrl: newEmpAvatarUrl ? newEmpAvatarUrl.trim() : undefined,
    });
    setEmpSubmitting(false);
    if (res.success) {
      Alert.alert('Success', 'Employee created successfully!');
      setAddEmpModalVisible(false);
      setNewEmpFullName('');
      setNewEmpId('');
      setNewEmpEmail('');
      setNewEmpPhone('');
      setNewEmpPassword('');
      setNewEmpAvatarUrl('');
      fetchData();
    } else {
      Alert.alert('Error', res.error || 'Failed to create employee');
    }
  };

  const handleOpenEditEmployee = (emp: AdminEmployee) => {
    setEditingEmpId(emp.id);
    setEditEmpFullName(emp.fullName);
    setEditEmpIdVal(emp.employeeId);
    setEditEmpEmail(emp.email);
    setEditEmpDept(emp.department || 'Sales');
    setEditEmpPhone(emp.phone || '');
    setEditEmpAvatarUrl(emp.avatarUrl || '');
    setEditEmpModalVisible(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmpId) return;
    if (!editEmpFullName.trim() || !editEmpIdVal.trim() || !editEmpEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name, ID, and email.');
      return;
    }
    setEmpSubmitting(true);
    const res = await adminApi.updateEmployee(editingEmpId, {
      fullName: editEmpFullName.trim(),
      employeeId: editEmpIdVal.trim(),
      email: editEmpEmail.trim(),
      department: editEmpDept.trim(),
      phone: editEmpPhone.trim(),
      avatarUrl: editEmpAvatarUrl ? editEmpAvatarUrl.trim() : undefined,
    });
    setEmpSubmitting(false);
    if (res.success) {
      Alert.alert('Success', 'Employee details updated successfully!');
      setEditEmpModalVisible(false);
      setEditingEmpId(null);
      fetchData();
    } else {
      Alert.alert('Error', res.error || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = (emp: AdminEmployee) => {
    Alert.alert(
      'Delete Employee',
      `Remove ${emp.fullName} (${emp.employeeId}) permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await adminApi.deleteEmployee(emp.id);
            if (res.success) {
              Alert.alert('Deleted', 'Employee removed successfully.');
              fetchData();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  const handleNavigation = useCallback(
    (tab: TabName) => {
      switch (tab) {
        case 'Home': setActiveSection('overview'); break;
        case 'Attendance': setActiveSection('employees'); break;
        case 'Reports': setActiveSection('reports'); break;
        case 'Profile': navigation.navigate('AdminProfile'); break;
      }
    },
    [navigation]
  );

  const getActiveTab = (): TabName => {
    switch (activeSection) {
      case 'overview': return 'Home';
      case 'employees': return 'Attendance';
      case 'reports': return 'Reports';
      default: return 'Home';
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q)
    );
  });

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'Admin')}&background=570490&color=fff&size=200`;
  const selectedEmployeeSales = selectedEmployeeDetails
    ? salesByEmployee.find((sale) => sale.userId === selectedEmployeeDetails.id)
    : undefined;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PRESENT': return { label: 'Present', color: colors.success, bg: colors.successLight };
      case 'LATE': return { label: 'Late', color: colors.warning, bg: colors.warningLight };
      case 'HALF_DAY': return { label: 'Half Day', color: colors.primaryLight, bg: colors.primarySoft };
      case 'ABSENT': return { label: 'Absent', color: colors.error, bg: colors.errorLight };
      default: return { label: status, color: colors.textSecondary, bg: colors.borderLight };
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const getEarlyReasonConfig = (reasonText: string) => {
    const r = (reasonText || '').toLowerCase();
    if (r.includes('medical') || r.includes('health') || r.includes('doctor') || r.includes('sick') || r.includes('hospital') || r.includes('fever')) {
      return { label: 'Health / Medical Issue', icon: 'medical', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
    }
    if (r.includes('emergency') || r.includes('urgent')) {
      return { label: 'Personal Emergency', icon: 'alert-circle', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' };
    }
    if (r.includes('family')) {
      return { label: 'Family Obligation', icon: 'people', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' };
    }
    if (r.includes('official') || r.includes('client') || r.includes('meeting') || r.includes('external') || r.includes('task') || r.includes('field')) {
      return { label: 'Official External Task', icon: 'briefcase', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' };
    }
    if (r.includes('permission') || r.includes('informed') || r.includes('approved')) {
      return { label: 'Prior Permission Taken', icon: 'checkmark-circle', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' };
    }
    return { label: 'Early Departure', icon: 'time', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' };
  };

  const openEmployeeDetails = (employee: AdminEmployee) => {
    setSelectedEmployeeDetails(employee);
    setEmployeeDetailsModalVisible(true);
  };

  const renderEmployeeDepartmentPerformance = () => {
    if (!selectedEmployeeDetails) return null;

    const employeeId = selectedEmployeeDetails.id;
    const department = selectedEmployeeDetails.department.toLowerCase();

    if (department === 'sales') {
      return (
        <>
          <Text style={styles.detailSectionLabel}>SALES PERFORMANCE</Text>
          <View style={styles.detailAttendanceRow}>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Revenue</Text><Text style={[styles.detailValue, { color: colors.primary }]}>{formatCurrency(selectedEmployeeSales?.totalSales || 0)}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Total Orders</Text><Text style={[styles.detailValue, { color: '#7C3AED' }]}>{selectedEmployeeSales?.totalOrders ?? 0}</Text></View>
          </View>
          <View style={[styles.detailAttendanceRow, { marginTop: 8 }]}>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>COD Orders</Text><Text style={[styles.detailValue, { color: '#D97706' }]}>{selectedEmployeeSales?.totalCodOrders || 0}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Prepaid</Text><Text style={[styles.detailValue, { color: '#2563EB' }]}>{selectedEmployeeSales?.totalPrepaidOrders || 0}</Text></View>
          </View>
          <View style={styles.detailReportsRow}><Text style={styles.detailLabel}>WhatsApp Enquiries</Text><Text style={styles.detailValue}>{selectedEmployeeSales?.totalWhatsappEnquiries || 0}</Text></View>
          <View style={[styles.detailReportsRow, { marginTop: 4 }]}><Text style={styles.detailLabel}>Reports submitted</Text><Text style={styles.detailValue}>{selectedEmployeeSales?.reportCount || 0}</Text></View>
        </>
      );
    }

    if (department === 'manager') {
      const returns = managerReportData.returns.filter((record) => record.userId === employeeId);
      const expenses = managerReportData.expenses.filter((record) => record.userId === employeeId);
      return (
        <>
          <Text style={styles.detailSectionLabel}>MANAGER PERFORMANCE</Text>
          <View style={styles.detailAttendanceRow}>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Returns</Text><Text style={[styles.detailValue, { color: '#DC2626' }]}>{returns.reduce((sum, record) => sum + record.returnQuantity, 0)}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Expenses</Text><Text style={[styles.detailValue, { color: '#D97706' }]}>₹{expenses.reduce((sum, record) => sum + record.amount, 0).toLocaleString('en-IN')}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Records</Text><Text style={styles.detailValue}>{returns.length + expenses.length}</Text></View>
          </View>
        </>
      );
    }

    if (department === 'packaging') {
      const records = (packagingReportData?.records || []).filter((record) => record.userId === employeeId);
      const packed = records.reduce((sum, record) => sum + record.ordersPacked, 0);
      const kltrends = records.filter((record) => record.orderSource === 'kltrends').reduce((sum, record) => sum + record.ordersPacked, 0);
      const klindia = records.filter((record) => record.orderSource === 'klindia').reduce((sum, record) => sum + record.ordersPacked, 0);
      return (
        <>
          <Text style={styles.detailSectionLabel}>PACKAGING PERFORMANCE</Text>
          <View style={styles.detailAttendanceRow}>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>Packed</Text><Text style={[styles.detailValue, { color: colors.primary }]}>{packed}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>KLTrends</Text><Text style={[styles.detailValue, { color: '#D97706' }]}>{kltrends}</Text></View>
            <View style={styles.detailAttendanceItem}><Text style={styles.detailLabel}>KLIndia</Text><Text style={[styles.detailValue, { color: '#2563EB' }]}>{klindia}</Text></View>
          </View>
        </>
      );
    }

    return null;
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Section tabs ─────────────────────────────────────────────────────────────
  const renderSectionTabs = () => {
    const tabs: { id: ActiveSection; label: string; icon: string }[] = [
      { id: 'overview', label: 'Overview', icon: 'grid-outline' },
      { id: 'employees', label: 'Employees', icon: 'people-outline' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
    ];
    return (
      <View style={styles.tabRow}>
        {tabs.map((t) => {
          const active = activeSection === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveSection(t.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={t.icon as any}
                size={14}
                color={active ? '#FFFFFF' : colors.primary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Overview ─────────────────────────────────────────────────────────────────
  const renderOverview = () => {
    if (!stats) return null;

    const tiles = [
      { label: 'Total Staff', value: stats.totalEmployees, icon: 'people', accent: colors.primaryLight, bg: colors.primarySoft },
      { label: 'Present', value: stats.presentToday, icon: 'checkmark-circle', accent: colors.success, bg: colors.successLight },
      { label: 'Absent', value: stats.absentToday, icon: 'close-circle', accent: colors.error, bg: colors.errorLight },
      { label: 'Late', value: stats.lateToday, icon: 'time', accent: colors.warning, bg: colors.warningLight },
    ];

    return (
      <>
        {/* Stat tiles */}
        <View style={styles.tilesRow}>
          {tiles.map((t, i) => (
            <View key={i} style={styles.statTile}>
              <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon as any} size={20} color={t.accent} />
              </View>
              <Text style={[styles.statValue, { color: t.accent }]}>{t.value}</Text>
              <Text style={styles.statLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>This Month · {stats.currentMonth} {stats.currentYear}</Text>
          <TouchableOpacity onPress={() => setActiveSection('reports')} activeOpacity={0.7} style={styles.viewAllReportsBtn}>
            <Text style={styles.viewAllReportsText}>View Details</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Main Monthly Performance Card ── */}
        <View style={styles.monthlyHeroCard}>
          {/* Revenue & Total Orders Row */}
          <View style={styles.monthlyHeroTopRow}>
            {/* Revenue Box */}
            <View style={styles.monthlyHeroMainBox}>
              <View style={styles.monthlyHeroIconWrap}>
                <Ionicons name="cash" size={20} color={colors.primary} />
              </View>
              <Text style={styles.monthlyHeroLabel}>TOTAL REVENUE</Text>
              <Text style={styles.monthlyHeroBigVal}>{formatCurrency(stats.totalMonthlySales)}</Text>
            </View>

            {/* Total Orders Box */}
            <View style={[styles.monthlyHeroMainBox, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <View style={[styles.monthlyHeroIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="calculator" size={20} color="#7C3AED" />
              </View>
              <View style={styles.autoTagRow}>
                <Text style={[styles.monthlyHeroLabel, { color: '#6D28D9' }]}>TOTAL ORDERS</Text>
              </View>
              <Text style={[styles.monthlyHeroBigVal, { color: '#5B21B6' }]}>
                {stats.totalMonthlyTotalOrders ?? ((stats.totalMonthlyCodOrders || 0) + (stats.totalMonthlyPrepaidOrders || 0))}
              </Text>
            </View>
          </View>

          {/* 4-Item Breakdown Grid */}
          <View style={styles.breakdownGrid}>
            {/* COD */}
            <View style={[styles.breakdownCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <View style={styles.breakdownCardTop}>
                <Ionicons name="cube-outline" size={15} color="#D97706" />
                <Text style={[styles.breakdownCardLabel, { color: '#92400E' }]}>COD</Text>
              </View>
              <Text style={[styles.breakdownCardVal, { color: '#B45309' }]}>
                {stats.totalMonthlyCodOrders ?? 0}
              </Text>
            </View>

            {/* Prepaid */}
            <View style={[styles.breakdownCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={styles.breakdownCardTop}>
                <Ionicons name="card-outline" size={15} color="#2563EB" />
                <Text style={[styles.breakdownCardLabel, { color: '#1E40AF' }]}>Prepaid</Text>
              </View>
              <Text style={[styles.breakdownCardVal, { color: '#1D4ED8' }]}>
                {stats.totalMonthlyPrepaidOrders ?? 0}
              </Text>
            </View>

          </View>

          {/* WhatsApp Enquiries Footer Bar */}
          <View style={styles.monthlyWhatsappBar}>
            <View style={styles.monthlyWhatsappLeft}>
              <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              <Text style={styles.monthlyWhatsappLabel}>WhatsApp Customer Enquiries</Text>
            </View>
            <View style={styles.monthlyWhatsappBadge}>
              <Text style={styles.monthlyWhatsappValue}>{stats.totalMonthlyWhatsappEnquiries ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Top performers */}
        {stats.topPerformers.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Top Performers</Text>
            {stats.topPerformers.map((p, i) => (
              <View key={p.userId} style={styles.performerRow}>
                <Text style={styles.performerRank}>#{i + 1}</Text>
                <Image
                  source={{ uri: p.avatarUrl || defaultAvatar }}
                  style={styles.performerAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.performerName}>{p.fullName}</Text>
                  <Text style={styles.performerMeta}>{p.department} · {p.employeeId}</Text>
                </View>
                <Text style={styles.performerSales}>{formatCurrency(p.totalSales)}</Text>
              </View>
            ))}
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            {
              title: 'Add Staff',
              desc: 'Create new profile',
              icon: 'person-add',
              iconColor: '#7C3AED',
              iconBg: '#F5F3FF',
              onPress: () => setAddEmpModalVisible(true),
            },
            {
              title: 'Staff List',
              desc: 'Manage & view team',
              icon: 'people',
              iconColor: '#2563EB',
              iconBg: '#EFF6FF',
              onPress: () => setActiveSection('employees'),
            },
            {
              title: 'Sales Report',
              desc: 'Monthly summary',
              icon: 'bar-chart',
              iconColor: '#059669',
              iconBg: '#ECFDF5',
              onPress: () => setActiveSection('reports'),
            },
            {
              title: 'Export Reports',
              desc: 'Download PDF / Excel',
              icon: 'cloud-download',
              iconColor: '#D97706',
              iconBg: '#FFFBEB',
              onPress: () => navigation.navigate('AdminReportDownload'),
            },
          ].map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickActionTile}
              onPress={a.onPress}
              activeOpacity={0.75}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: a.iconBg }]}>
                <Ionicons name={a.icon as any} size={20} color={a.iconColor} />
              </View>
              <View style={styles.quickActionTextWrap}>
                <Text style={styles.quickActionTitle}>{a.title}</Text>
                <Text style={styles.quickActionDesc} numberOfLines={1}>{a.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Early Checkouts Section (Before 5:30 PM) ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithBadge}>
            <Text style={styles.sectionLabel}>Early Checkouts Today</Text>
            {stats.earlyCheckouts && stats.earlyCheckouts.length > 0 ? (
              <View style={styles.earlyCountPill}>
                <Text style={styles.earlyCountPillText}>{stats.earlyCheckouts.length}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cutoffPill}>
            <Ionicons name="time-outline" size={12} color="#92400E" />
            <Text style={styles.cutoffPillText}>Cutoff: 5:30 PM</Text>
          </View>
        </View>

        {(!stats.earlyCheckouts || stats.earlyCheckouts.length === 0) ? (
          <View style={styles.emptyEarlyBox}>
            <View style={styles.emptyEarlyIconWrap}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.emptyEarlyTitle}>No Early Departures Today</Text>
              <Text style={styles.emptyEarlySub}>All active employees are working full shift hours (until 5:30 PM).</Text>
            </View>
          </View>
        ) : (
          <View style={styles.earlyListWrap}>
            {stats.earlyCheckouts.map((item) => {
              const reasonPreset = EARLY_REASON_PRESETS.find(
                (preset) => preset.id === item.reason || preset.label === item.reason
              );

              return (
                <View key={item.id} style={styles.earlyCheckoutCard}>
                  <View style={styles.earlyCheckoutTop}>
                    <Image
                      source={{
                        uri:
                          item.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            item.fullName
                          )}&background=F1E6F8&color=570490&size=200`,
                      }}
                      style={styles.earlyAvatar}
                    />

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.earlyEmpName}>
                        {item.fullName}
                      </Text>

                      <Text style={styles.earlyEmpMeta}>
                        {item.department} · ID: {item.employeeId}
                      </Text>
                    </View>

                    <View style={styles.earlyTimeBadge}>
                      <Ionicons
                        name="log-out-outline"
                        size={13}
                        color="#B45309"
                      />

                      <Text style={styles.earlyTimeBadgeText}>
                        Left at {item.checkOutTimeFormatted}
                      </Text>
                    </View>
                  </View>

                  {/* Reason Callout */}
                  <View style={styles.earlyReasonBox}>
                    <Ionicons
                      name={
                        reasonPreset?.icon as keyof typeof Ionicons.glyphMap ||
                        'chatbubble-ellipses-outline'
                      }
                      size={20}
                      color="#D97706"
                      style={{ marginTop: 2 }}
                    />

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.earlyReasonLabel}>
                        Reason for Leaving Early:
                      </Text>

                      <Text style={styles.earlyReasonText}>
                        {reasonPreset?.label || item.reason}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Late Check-ins Section (After 10:00 AM) ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithBadge}>
            <Text style={styles.sectionLabel}>Late Check-ins Today</Text>
            {stats.lateCheckIns && stats.lateCheckIns.length > 0 ? (
              <View style={styles.earlyCountPill}>
                <Text style={styles.earlyCountPillText}>{stats.lateCheckIns.length}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cutoffPill}>
            <Ionicons name="time-outline" size={12} color="#92400E" />
            <Text style={styles.cutoffPillText}>Start: 10:00 AM</Text>
          </View>
        </View>

        {(!stats.lateCheckIns || stats.lateCheckIns.length === 0) ? (
          <View style={styles.emptyEarlyBox}>
            <View style={styles.emptyEarlyIconWrap}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.emptyEarlyTitle}>No Late Check-ins Today</Text>
              <Text style={styles.emptyEarlySub}>All checked-in employees arrived by 10:00 AM.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.earlyListWrap}>
            {stats.lateCheckIns.map((item) => (
              <View key={item.id} style={styles.earlyCheckoutCard}>
                <View style={styles.earlyCheckoutTop}>
                  <Image
                    source={{
                      uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=F1E6F8&color=570490&size=200`,
                    }}
                    style={styles.earlyAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.earlyEmpName}>{item.fullName}</Text>
                    <Text style={styles.earlyEmpMeta}>{item.department} · ID: {item.employeeId}</Text>
                  </View>
                  <View style={styles.earlyTimeBadge}>
                    <Ionicons name="log-in-outline" size={13} color="#B45309" />
                    <Text style={styles.earlyTimeBadgeText}>In at {item.checkInTime}</Text>
                  </View>
                </View>
                <View style={styles.earlyReasonBox}>
                  <Ionicons name="alert-circle-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.earlyReasonLabel}>Reason for Late Check-in:</Text>
                    <Text style={styles.earlyReasonText}>{item.reason}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

      </>
    );
  };

  // ── Employees ────────────────────────────────────────────────────────────────
  const renderEmployees = () => (
    <>
      <View style={styles.empHeaderRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, dept…"
            placeholderTextColor={colors.textMuted}
            value={employeeSearch}
            onChangeText={setEmployeeSearch}
          />
          {employeeSearch.length > 0 && (
            <TouchableOpacity onPress={() => setEmployeeSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddEmpModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>
        {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
      </Text>

      {filteredEmployees.map((emp) => {
        const sc = getStatusConfig(emp.todayStatus);
        return (
          <View key={emp.id} style={styles.empCard}>
            {/* Header row */}
            <View style={styles.empCardTop}>
              <Image
                source={{ uri: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=F1E6F8&color=570490&size=200` }}
                style={styles.empAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.fullName}</Text>
                <Text style={styles.empMeta}>{emp.department} · {emp.employeeId}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            </View>

            {/* Contact row */}
            <View style={styles.empContactRow}>
              <View style={styles.empContactItem}>
                <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                <Text style={styles.empContactText} numberOfLines={1}>{emp.email}</Text>
              </View>
              {emp.phone ? (
                <View style={styles.empContactItem}>
                  <Ionicons name="call-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.empContactText}>{emp.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Timing row */}
            {emp.checkInTime && (
              <View style={styles.empTimingRow}>
                <View style={styles.empTimingItem}>
                  <Ionicons name="log-in-outline" size={13} color={colors.success} />
                  <Text style={styles.empTimingText}>In {emp.checkInTime}</Text>
                </View>
                {emp.checkOutTime && (
                  <View style={styles.empTimingItem}>
                    <Ionicons name="log-out-outline" size={13} color={colors.error} />
                    <Text style={styles.empTimingText}>Out {emp.checkOutTime}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Early Departure Callout on Emp Card */}
            {emp.earlyCheckoutReason && (
              <View style={styles.empEarlyNoticeBox}>
                <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
                <Text style={styles.empEarlyNoticeText} numberOfLines={2}>
                  Left early: {emp.earlyCheckoutReason}
                </Text>
              </View>
            )}
            {emp.lateCheckInReason && (
              <View style={styles.empLateNoticeBox}>
                <Ionicons name="alert-circle-outline" size={13} color="#B45309" />
                <Text style={styles.empLateNoticeText} numberOfLines={2}>
                  Late check-in reason: {emp.lateCheckInReason}
                </Text>
              </View>
            )}

            {/* Selfie */}
            {emp.selfieUrl && (
              <TouchableOpacity
                style={styles.selfieStrip}
                onPress={() => { setSelectedSelfieEmployee(emp); setSelfieModalVisible(true); }}
                activeOpacity={0.85}
              >
                <Image source={{ uri: emp.selfieUrl }} style={styles.selfieThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selfieVerifiedText}>✓ Check-in selfie verified</Text>
                  <Text style={styles.selfieSubText}>Tap to view photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.empActions}>
              <TouchableOpacity
                style={styles.empDetailsBtn}
                onPress={() => openEmployeeDetails(emp)}
                activeOpacity={0.8}
              >
                <Ionicons name="information-circle-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.empDetailsBtnText}>Full Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.empEditBtn}
                onPress={() => handleOpenEditEmployee(emp)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.empEditBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.empDeleteBtn}
                onPress={() => handleDeleteEmployee(emp)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.empDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {filteredEmployees.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={44} color={colors.border} />
          <Text style={styles.emptyText}>No employees found</Text>
        </View>
      )}
    </>
  );

  // ── Reports ──────────────────────────────────────────────────────────────────
  const renderReportDepartmentTabs = () => (
    <View style={styles.reportDepartmentTabs}>
      {([
        ['sales', 'Sales', 'trending-up-outline'],
        ['manager', 'Manager', 'briefcase-outline'],
        ['packaging', 'Packaging', 'cube-outline'],
      ] as const).map(([id, label, icon]) => (
        <TouchableOpacity
          key={id}
          style={[styles.reportDepartmentTab, reportDepartment === id && styles.reportDepartmentTabActive]}
          onPress={() => setReportDepartment(id)}
          activeOpacity={0.8}
        >
          <Ionicons name={icon} size={15} color={reportDepartment === id ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.reportDepartmentTabText, reportDepartment === id && styles.reportDepartmentTabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderNonSalesDepartmentReport = () => {
    const departmentEmployees = employees.filter(
      (employee) => employee.department.toLowerCase() === reportDepartment
    );

    const cards = departmentEmployees.map((employee) => {
      const returns = managerReportData.returns.filter((record) => record.userId === employee.id);
      const expenses = managerReportData.expenses.filter((record) => record.userId === employee.id);
      const packingRecords = (packagingReportData?.records || []).filter((record) => record.userId === employee.id);

      const metrics = reportDepartment === 'manager'
        ? [
            { label: 'Returns', value: returns.reduce((sum, record) => sum + record.returnQuantity, 0), color: '#DC2626' },
            { label: 'Expenses', value: `₹${expenses.reduce((sum, record) => sum + record.amount, 0).toLocaleString('en-IN')}`, color: '#D97706' },
            { label: 'Records', value: returns.length + expenses.length, color: colors.primary },
          ]
        : reportDepartment === 'packaging'
        ? [
            { label: 'Packed', value: packingRecords.reduce((sum, record) => sum + record.ordersPacked, 0), color: colors.primary },
            { label: 'KLTrends', value: packingRecords.filter((record) => record.orderSource === 'kltrends').reduce((sum, record) => sum + record.ordersPacked, 0), color: '#D97706' },
            { label: 'KLIndia', value: packingRecords.filter((record) => record.orderSource === 'klindia').reduce((sum, record) => sum + record.ordersPacked, 0), color: '#2563EB' },
          ]
        : [
            { label: 'Packed', value: packingRecords.reduce((sum, record) => sum + record.ordersPacked, 0), color: colors.primary },
            { label: 'KLTrends', value: packingRecords.filter((record) => record.orderSource === 'kltrends').reduce((sum, record) => sum + record.ordersPacked, 0), color: '#D97706' },
            { label: 'KLIndia', value: packingRecords.filter((record) => record.orderSource === 'klindia').reduce((sum, record) => sum + record.ordersPacked, 0), color: '#2563EB' },
          ];

      const primaryValue = Number(metrics[0].value) || 0;
      return { employee, metrics, primaryValue, reportCount: metrics[2].value };
    }).sort((a, b) => b.primaryValue - a.primaryValue);

    const maxValue = Math.max(1, ...cards.map((card) => card.primaryValue));
    return (
      <>
        <View style={styles.reportsSectionHeader}>
          <Text style={styles.sectionLabel}>Team {reportDepartment.charAt(0).toUpperCase() + reportDepartment.slice(1)} Performance</Text>
          <Text style={styles.reportsTeamCount}>{cards.length} {cards.length === 1 ? 'employee' : 'employees'}</Text>
        </View>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={card.employee.id}
            style={styles.minimalEmpCard}
            onPress={() => openEmployeeDetails(card.employee)}
            activeOpacity={0.8}
          >
            <View style={styles.minimalEmpTop}>
              <View style={styles.minimalEmpRankBadge}><Text style={styles.minimalEmpRankText}>#{index + 1}</Text></View>
              <Image
                source={{ uri: card.employee.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(card.employee.fullName)}&background=F1E6F8&color=570490&size=200` }}
                style={styles.minimalEmpAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.minimalEmpName}>{card.employee.fullName}</Text>
                <Text style={styles.minimalEmpMeta}>{card.employee.department} · {card.employee.employeeId || '--'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.minimalEmpSales}>{card.primaryValue.toLocaleString('en-IN')}</Text>
                <Text style={styles.minimalEmpReports}>{card.reportCount} records</Text>
              </View>
            </View>
            <View style={styles.minimalEmpStatsRow}>
              {card.metrics.map((metric, metricIndex) => (
                <React.Fragment key={metric.label}>
                  {metricIndex > 0 && <Text style={styles.minimalEmpStatDot}>·</Text>}
                  <View style={styles.minimalEmpStatItem}>
                    <Text style={styles.minimalEmpStatText}>{metric.label}: <Text style={{ fontWeight: '800', color: metric.color }}>{metric.value}</Text></Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <View style={styles.minimalProgressBg}>
              <View style={[styles.minimalProgressFill, { width: `${Math.max(6, (card.primaryValue / maxValue) * 100)}%` }]} />
            </View>
          </TouchableOpacity>
        ))}
        {cards.length === 0 && <View style={styles.emptyWrap}><Ionicons name="bar-chart-outline" size={44} color={colors.border} /><Text style={styles.emptyText}>No {reportDepartment} records this month</Text></View>}
      </>
    );
  };

  const renderReports = () => {
    const totalOrders = reportsSummary
      ? reportsSummary.totalOrders ?? ((reportsSummary.totalCodOrders || 0) + (reportsSummary.totalPrepaidOrders || 0))
      : 0;

    return (
      <>
        {/* Minimal Header with Export Action */}
        <View style={styles.reportsHeaderRow}>
          <View>
            <Text style={styles.reportsHeaderPeriod}>
              {reportsSummary ? `${reportsSummary.month} ${reportsSummary.year}` : 'Monthly Summary'}
            </Text>
            <Text style={styles.reportsHeaderSubtitle}>
              {reportsSummary?.totalReports || 0} reports submitted
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reportsExportBtn}
            onPress={() => navigation.navigate('AdminReportDownload')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={15} color={colors.primary} />
            <Text style={styles.reportsExportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {renderReportDepartmentTabs()}

        {reportDepartment !== 'sales' && renderNonSalesDepartmentReport()}

        {reportDepartment !== 'sales' ? null : <>

        {reportsSummary && (
          <View style={styles.minimalReportCard}>
            {/* Main Revenue Block */}
            <View style={styles.minimalRevenueBlock}>
              <Text style={styles.minimalRevenueLabel}>TOTAL SALES REVENUE</Text>
              <Text style={styles.minimalRevenueVal}>{formatCurrency(reportsSummary.totalSales)}</Text>
            </View>

            {/* Order Metrics */}
            <View style={styles.minimalMetricsRow}>
              <View style={[styles.minimalMetricCol, styles.totalOrdersMetric]}>
                <Ionicons name="cart-outline" size={18} color="#7C3AED" />
                <Text style={styles.minimalMetricNum}>{totalOrders}</Text>
                <Text style={styles.minimalMetricName}>Total Orders</Text>
              </View>
              <View style={[styles.minimalMetricCol, styles.codMetric]}>
                <Ionicons name="cube-outline" size={18} color="#D97706" />
                <Text style={[styles.minimalMetricNum, { color: '#B45309' }]}>
                  {reportsSummary.totalCodOrders ?? 0}
                </Text>
                <Text style={[styles.minimalMetricName, { color: '#92400E' }]}>COD Orders</Text>
              </View>
              <View style={[styles.minimalMetricCol, styles.prepaidMetric]}>
                <Ionicons name="card-outline" size={18} color="#2563EB" />
                <Text style={[styles.minimalMetricNum, { color: '#1D4ED8' }]}>
                  {reportsSummary.totalPrepaidOrders ?? 0}
                </Text>
                <Text style={[styles.minimalMetricName, { color: '#1E40AF' }]}>Prepaid</Text>
              </View>
            </View>

            {/* Minimal WhatsApp Notice */}
            {(reportsSummary.totalWhatsappEnquiries ?? 0) > 0 && (
              <View style={styles.minimalWhatsappRow}>
                <Ionicons name="logo-whatsapp" size={14} color="#16A34A" />
                <Text style={styles.minimalWhatsappText}>
                  <Text style={{ fontWeight: '800' }}>{reportsSummary.totalWhatsappEnquiries}</Text> WhatsApp customer enquiries received
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Sales by Employee Section Header */}
        <View style={styles.reportsSectionHeader}>
          <Text style={styles.sectionLabel}>Team Sales Performance</Text>
          <Text style={styles.reportsTeamCount}>
            {salesByEmployee.length} {salesByEmployee.length === 1 ? 'employee' : 'employees'}
          </Text>
        </View>

        {/* Clean Employee Cards */}
        {salesByEmployee.map((emp, i) => {
          const maxSales = salesByEmployee[0]?.totalSales || 1;
          const pct = Math.max(6, (emp.totalSales / maxSales) * 100);
          const empOrders = emp.totalOrders ?? ((emp.totalCodOrders || 0) + (emp.totalPrepaidOrders || 0));

          return (
            <TouchableOpacity
              key={emp.userId}
              style={styles.minimalEmpCard}
              onPress={() => {
                const fullEmp = employees.find((e) => e.id === emp.userId);
                if (fullEmp) openEmployeeDetails(fullEmp);
              }}
              activeOpacity={0.8}
            >
              {/* Top Row: Avatar, Info, Revenue */}
              <View style={styles.minimalEmpTop}>
                <View style={styles.minimalEmpRankBadge}>
                  <Text style={styles.minimalEmpRankText}>#{i + 1}</Text>
                </View>
                <Image
                  source={{ uri: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=F1E6F8&color=570490&size=200` }}
                  style={styles.minimalEmpAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.minimalEmpName}>{emp.fullName}</Text>
                  <Text style={styles.minimalEmpMeta}>{emp.department} · {emp.employeeId || '--'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.minimalEmpSales}>{formatCurrency(emp.totalSales)}</Text>
                  <Text style={styles.minimalEmpReports}>{emp.reportCount} {emp.reportCount === 1 ? 'report' : 'reports'}</Text>
                </View>
              </View>

              {/* Order Stats Single-line Summary */}
              <View style={styles.minimalEmpStatsRow}>
                <View style={styles.minimalEmpStatItem}>
                  <Ionicons name="calculator-outline" size={12} color="#7C3AED" />
                  <Text style={styles.minimalEmpStatText}>
                    Orders: <Text style={{ fontWeight: '800' }}>{empOrders}</Text>
                  </Text>
                </View>
                <Text style={styles.minimalEmpStatDot}>·</Text>
                <View style={styles.minimalEmpStatItem}>
                  <Text style={styles.minimalEmpStatText}>
                    COD: <Text style={{ fontWeight: '800', color: '#D97706' }}>{emp.totalCodOrders ?? 0}</Text>
                  </Text>
                </View>
                <Text style={styles.minimalEmpStatDot}>·</Text>
                <View style={styles.minimalEmpStatItem}>
                  <Text style={styles.minimalEmpStatText}>
                    Prepaid: <Text style={{ fontWeight: '800', color: '#2563EB' }}>{emp.totalPrepaidOrders ?? 0}</Text>
                  </Text>
                </View>
              </View>

              {/* Minimal Slim Progress Bar */}
              <View style={styles.minimalProgressBg}>
                <View style={[styles.minimalProgressFill, { width: `${pct}%` }]} />
              </View>
            </TouchableOpacity>
          );
        })}

        {salesByEmployee.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="bar-chart-outline" size={44} color={colors.border} />
            <Text style={styles.emptyText}>No sales reports this month</Text>
          </View>
        )}
        </>}
      </>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Minimal top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topDate}>{getTodayDate()}</Text>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity onPress={() => navigation.navigate('AdminProfile')} activeOpacity={0.8}>
            <Image
              source={{ uri: user?.avatarUrl || defaultAvatar }}
              style={styles.topAvatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingHi}>Hello, {(user?.fullName || user?.username || 'Admin').split(' ')[0]}</Text>
        </View>

        {renderSectionTabs()}

        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'employees' && renderEmployees()}
        {activeSection === 'reports' && renderReports()}

        <View style={{ height: 32 }} />
      </ScrollView>

      <BottomNavBar activeTab={getActiveTab()} onNavigate={handleNavigation} isAdmin={true} />

      {/* ── Employee details modal ── */}
      {selectedEmployeeDetails && (
        <Modal
          animationType="slide"
          transparent
          visible={employeeDetailsModalVisible}
          onRequestClose={() => setEmployeeDetailsModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.employeeDetailsCard}>
              <View style={styles.formCardHeader}>
                <Text style={styles.formCardTitle}>Employee Details</Text>
                <TouchableOpacity onPress={() => setEmployeeDetailsModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsProfileHeader}>
                  <Image
                    source={{ uri: selectedEmployeeDetails.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployeeDetails.fullName)}&background=F1E6F8&color=570490&size=200` }}
                    style={styles.detailsAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsName}>{selectedEmployeeDetails.fullName}</Text>
                    <Text style={styles.detailsMeta}>{selectedEmployeeDetails.department} · {selectedEmployeeDetails.employeeId}</Text>
                    <View style={[styles.statusPill, { backgroundColor: getStatusConfig(selectedEmployeeDetails.todayStatus).bg, alignSelf: 'flex-start', marginTop: 8 }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusConfig(selectedEmployeeDetails.todayStatus).color }]} />
                      <Text style={[styles.statusText, { color: getStatusConfig(selectedEmployeeDetails.todayStatus).color }]}>
                        {getStatusConfig(selectedEmployeeDetails.todayStatus).label} today
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.detailSectionLabel}>TODAY'S ATTENDANCE</Text>
                <View style={styles.detailAttendanceRow}>
                  <View style={styles.detailAttendanceItem}>
                    <Text style={styles.detailLabel}>Check-in</Text>
                    <Text style={styles.detailValue}>{selectedEmployeeDetails.checkInTime || '--'}</Text>
                  </View>
                  <View style={styles.detailAttendanceItem}>
                    <Text style={styles.detailLabel}>Check-out</Text>
                    <Text style={styles.detailValue}>{selectedEmployeeDetails.checkOutTime || '--'}</Text>
                  </View>
                  <View style={styles.detailAttendanceItem}>
                    <Text style={styles.detailLabel}>Selfie</Text>
                    <Text style={styles.detailValue}>{selectedEmployeeDetails.isVerified ? 'Verified' : 'Not verified'}</Text>
                  </View>
                </View>

                {selectedEmployeeDetails.earlyCheckoutReason && (
                  <View style={styles.detailEarlyLeaveBox}>
                    <Ionicons name="time-outline" size={17} color="#B45309" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.detailEarlyLeaveLabel}>Early Leave Reason</Text>
                      <Text style={styles.detailEarlyLeaveValue} selectable>
                        {selectedEmployeeDetails.earlyCheckoutReason}
                      </Text>
                    </View>
                  </View>
                )}
                {selectedEmployeeDetails.lateCheckInReason && (
                  <View style={styles.detailLateNoticeBox}>
                    <Ionicons name="alert-circle-outline" size={17} color="#B45309" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.detailLateNoticeLabel}>Late Check-In Reason</Text>
                      <Text style={styles.detailLateNoticeValue} selectable>
                        {selectedEmployeeDetails.lateCheckInReason}
                      </Text>
                    </View>
                  </View>
                )}

                {renderEmployeeDepartmentPerformance()}

                {selectedEmployeeDetails.selfieUrl && (
                  <TouchableOpacity
                    style={styles.detailsSelfieBtn}
                    onPress={() => { setEmployeeDetailsModalVisible(false); setSelectedSelfieEmployee(selectedEmployeeDetails); setSelfieModalVisible(true); }}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.primary} />
                    <Text style={styles.empDetailsBtnText}>View check-in selfie</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Selfie modal ── */}
      {selectedSelfieEmployee && (
        <Modal
          animationType="fade"
          transparent
          visible={selfieModalVisible}
          onRequestClose={() => setSelfieModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.selfieCard}>
              <View style={styles.selfieCardHeader}>
                <View>
                  <Text style={styles.selfieCardName}>{selectedSelfieEmployee.fullName}</Text>
                  <Text style={styles.selfieCardMeta}>
                    {selectedSelfieEmployee.department} · {selectedSelfieEmployee.employeeId}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelfieModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {selectedSelfieEmployee.selfieUrl && (
                <Image
                  source={{ uri: selectedSelfieEmployee.selfieUrl }}
                  style={styles.selfieImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.selfieDetail}>
                <Ionicons name="log-in-outline" size={15} color="#10B981" />
                <Text style={styles.selfieDetailText}>
                  Check-In: {selectedSelfieEmployee.checkInTime || '--'}
                </Text>
              </View>
              <View style={styles.selfieDetail}>
                <Ionicons name="shield-checkmark" size={15} color="#10B981" />
                <Text style={styles.selfieDetailText}>Cloudinary verified & stored</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Add employee modal ── */}
      <Modal animationType="slide" transparent visible={addEmpModalVisible} onRequestClose={() => setAddEmpModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Text style={styles.formCardTitle}>Add Employee</Text>
              <TouchableOpacity onPress={() => setAddEmpModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Photo Picker Header */}
              <View style={styles.modalPhotoPickerWrap}>
                <TouchableOpacity
                  style={styles.modalPhotoPickerBtn}
                  onPress={handlePickNewEmpImage}
                  activeOpacity={0.8}
                >
                  {newEmpAvatarUrl ? (
                    <Image source={{ uri: newEmpAvatarUrl }} style={styles.modalPhotoImage} />
                  ) : (
                    <View style={styles.modalPhotoPlaceholder}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={styles.modalPhotoPlaceholderText}>Add Photo</Text>
                    </View>
                  )}
                  <View style={styles.modalPhotoBadge}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>

              {[
                { label: 'Full Name *', value: newEmpFullName, setter: setNewEmpFullName, placeholder: 'e.g. Rahul Sharma', keyboard: 'default' as const },
                { label: 'Employee ID *', value: newEmpId, setter: setNewEmpId, placeholder: 'e.g. EMP-1050', keyboard: 'default' as const },
                { label: 'Work Email *', value: newEmpEmail, setter: setNewEmpEmail, placeholder: 'rahul@kltrends.com', keyboard: 'email-address' as const },
                { label: 'Department', value: newEmpDept, setter: setNewEmpDept, placeholder: 'e.g. Sales', keyboard: 'default' as const },
                { label: 'Phone', value: newEmpPhone, setter: setNewEmpPhone, placeholder: '9876543210', keyboard: 'phone-pad' as const },
                { label: 'Default Password', value: newEmpPassword, setter: setNewEmpPassword, placeholder: 'Default: Password123!', keyboard: 'default' as const },
              ].map((f, i) => (
                <View key={i}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={f.value}
                    onChangeText={f.setter}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                    secureTextEntry={f.label.includes('Password')}
                  />
                </View>
              ))}
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddEmpModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEmployee} disabled={empSubmitting}>
                  {empSubmitting
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.submitBtnText}>Create</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit employee modal ── */}
      <Modal animationType="slide" transparent visible={editEmpModalVisible} onRequestClose={() => setEditEmpModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Text style={styles.formCardTitle}>Edit Employee</Text>
              <TouchableOpacity onPress={() => setEditEmpModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Photo Picker Header */}
              <View style={styles.modalPhotoPickerWrap}>
                <TouchableOpacity
                  style={styles.modalPhotoPickerBtn}
                  onPress={handlePickEditEmpImage}
                  activeOpacity={0.8}
                >
                  {editEmpAvatarUrl ? (
                    <Image source={{ uri: editEmpAvatarUrl }} style={styles.modalPhotoImage} />
                  ) : (
                    <View style={styles.modalPhotoPlaceholder}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={styles.modalPhotoPlaceholderText}>Change Photo</Text>
                    </View>
                  )}
                  <View style={styles.modalPhotoBadge}>
                    <Ionicons name="camera" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>

              {[
                { label: 'Full Name *', value: editEmpFullName, setter: setEditEmpFullName, placeholder: 'Full Name', keyboard: 'default' as const },
                { label: 'Employee ID *', value: editEmpIdVal, setter: setEditEmpIdVal, placeholder: 'Employee ID', keyboard: 'default' as const },
                { label: 'Work Email *', value: editEmpEmail, setter: setEditEmpEmail, placeholder: 'Work Email', keyboard: 'email-address' as const },
                { label: 'Department', value: editEmpDept, setter: setEditEmpDept, placeholder: 'Department', keyboard: 'default' as const },
                { label: 'Phone', value: editEmpPhone, setter: setEditEmpPhone, placeholder: 'Phone', keyboard: 'phone-pad' as const },
              ].map((f, i) => (
                <View key={i}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={f.value}
                    onChangeText={f.setter}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              ))}
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditEmpModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateEmployee} disabled={empSubmitting}>
                  {empSubmitting
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.submitBtnText}>Save Changes</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 12 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  topDate: { fontSize: 11, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3, textTransform: 'uppercase' },
  topBrand: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  topAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.border },

  scroll: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 },

  // Greeting
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingTop: 4 },
  greetingHi: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderPurple,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  // Tabs
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.borderLight,
    borderRadius: 14, padding: 3, marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 11,
  },
  tabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  tabTextActive: { color: '#FFFFFF' },

  // Stat tiles (overview)
  tilesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },
  statTile: {
    width: '47.5%', backgroundColor: colors.card,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },

  // Revenue card
  revenueCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  revenueLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  revenuePeriod: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  revenueAmount: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  viewAllReportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  viewAllReportsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Redesigned Monthly Hero Card
  monthlyHeroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  monthlyHeroTopRow: {
    flexDirection: 'row',
    gap: 10,
  },
  monthlyHeroMainBox: {
    flex: 1,
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderPurple,
  },
  monthlyHeroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  monthlyHeroLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  monthlyHeroBigVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 2,
  },
  autoTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoPill: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  autoPillText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // 4-Item Breakdown Grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownCard: {
    width: '48.5%',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  breakdownCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  breakdownCardLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  breakdownCardVal: {
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  // Monthly WhatsApp Bar
  monthlyWhatsappBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthlyWhatsappLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthlyWhatsappLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  monthlyWhatsappBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  monthlyWhatsappValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },

  // Performers
  performerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  performerRank: { fontSize: 13, fontWeight: '800', color: colors.primary, width: 28 },
  performerAvatar: { width: 38, height: 38, borderRadius: 19 },
  performerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  performerMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  performerSales: { fontSize: 14, fontWeight: '800', color: colors.primary },

  // Quick actions (2-column modern grid)
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 24,
  },
  quickActionTile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  quickActionTextWrap: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickActionDesc: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },

  // Sign out
  signOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  signOutText: { fontSize: 14, fontWeight: '600', color: colors.error },

  // Employee section
  empHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  addBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  countText: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 12 },

  empCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  empCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  empAvatar: { width: 42, height: 42, borderRadius: 21 },
  empName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  empMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  empContactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  empContactItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 140 },
  empContactText: { fontSize: 12, color: colors.textSecondary, flex: 1 },

  empTimingRow: { flexDirection: 'row', gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, marginBottom: 8 },
  empTimingItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  empTimingText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

  selfieStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 8,
    marginBottom: 10, borderWidth: 1, borderColor: '#D1FAE5',
  },
  selfieThumb: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.success },
  selfieVerifiedText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  selfieSubText: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },

  empActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  empDetailsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empDetailsBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  empEditBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empEditBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  empDeleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empDeleteBtnText: { fontSize: 12, fontWeight: '700', color: colors.error },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: 12 },

  // ── Minimal Reports Styles ──────────────────────────────────────────────
  reportsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  reportsHeaderPeriod: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  reportsHeaderSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  reportsExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderPurple,
  },
  reportsExportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  reportDepartmentTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  reportDepartmentTab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 3,
  },
  reportDepartmentTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reportDepartmentTabText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  reportDepartmentTabTextActive: {
    color: '#FFFFFF',
  },
  departmentReportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  departmentReportTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  departmentReportSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  departmentMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  departmentMetric: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 11,
    minHeight: 72,
  },
  departmentMetricValue: {
    color: colors.primary,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
  },
  departmentMetricLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  minimalReportCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  minimalRevenueBlock: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderPurple,
  },
  minimalRevenueLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  minimalRevenueVal: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  minimalMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  minimalMetricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalOrdersMetric: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  codMetric: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  prepaidMetric: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  minimalMetricNum: {
    fontSize: 23,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    lineHeight: 28,
    marginTop: 3,
  },
  minimalMetricName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 13,
  },
  minimalColDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderLight,
  },
  minimalWhatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  minimalWhatsappText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },

  reportsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  reportsTeamCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Minimal Employee Performance Card
  minimalEmpCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  minimalEmpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimalEmpRankBadge: {
    width: 22,
    alignItems: 'center',
  },
  minimalEmpRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  minimalEmpAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  minimalEmpName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  minimalEmpMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  minimalEmpSales: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  minimalEmpReports: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },

  minimalEmpStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 2,
  },
  minimalEmpStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  minimalEmpStatText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  minimalEmpStatDot: {
    fontSize: 10,
    color: colors.border,
    marginHorizontal: 1,
  },

  minimalProgressBg: {
    height: 3,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  minimalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Modals
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },

  employeeDetailsCard: {
    width: '100%', maxHeight: '88%', backgroundColor: colors.card, borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  detailsProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailsAvatar: { width: 68, height: 68, borderRadius: 34 },
  detailsName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  detailsMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  detailSectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.7, marginTop: 18, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
  detailAttendanceRow: { flexDirection: 'row', gap: 8 },
  detailAttendanceItem: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 10 },
  detailEarlyLeaveBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', padding: 10, marginTop: 10 },
  detailEarlyLeaveLabel: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  detailEarlyLeaveValue: { fontSize: 13, fontWeight: '700', color: '#78350F', marginTop: 3, lineHeight: 18 },
  detailLateNoticeBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF7ED', borderRadius: 10, borderWidth: 1, borderColor: '#FED7AA', padding: 10, marginTop: 10 },
  detailLateNoticeLabel: { fontSize: 11, fontWeight: '700', color: '#9A3412' },
  detailLateNoticeValue: { fontSize: 13, fontWeight: '700', color: '#7C2D12', marginTop: 3, lineHeight: 18 },
  detailReportsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginTop: 8 },
  detailsSelfieBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 16, backgroundColor: colors.primarySoft, borderRadius: 10 },

  selfieCard: {
    width: '100%', backgroundColor: colors.textPrimary, borderRadius: 24, padding: 20, alignItems: 'center',
  },
  selfieCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  selfieCardName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  selfieCardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  selfieImage: { width: 240, height: 240, borderRadius: 120, borderWidth: 3, borderColor: colors.success, marginBottom: 16 },
  selfieDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  selfieDetailText: { fontSize: 13, color: '#D1FAE5', fontWeight: '600' },

  formCard: {
    width: '100%', maxHeight: '88%', backgroundColor: colors.card,
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  formCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  formCardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalPhotoPickerWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  modalPhotoPickerBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
    position: 'relative',
  },
  modalPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  modalPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPhotoPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  modalPhotoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  formLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
  formInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14, color: colors.textPrimary,
  },
  formBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderLight },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  submitBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 12, minWidth: 100, alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Early Checkouts Section Styles
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earlyCountPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 6,
  },
  earlyCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  cutoffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  cutoffPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  emptyEarlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  emptyEarlyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEarlyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  emptyEarlySub: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
  earlyListWrap: {
    gap: 10,
    marginBottom: 16,
  },
  earlyCheckoutCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFDF9',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  earlyCheckoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earlyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
  },
  earlyEmpName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  earlyEmpMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  earlyTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  earlyTimeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  earlyReasonContainer: {
    marginTop: 10,
  },
  earlyPresetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 6,
  },
  earlyPresetTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  earlyReasonBox: {
    backgroundColor: '#FEF9EE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  earlyReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  earlyReasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
    marginTop: 2,
    lineHeight: 17,
  },
  empEarlyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 5,
  },
  empEarlyNoticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  empLateNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 5,
  },
  empLateNoticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#9A3412',
  },
});
