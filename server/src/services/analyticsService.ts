import { query } from '../config/db.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsDataPoint {
  label: string; // "Jan", "Mon", "9 AM"
  dateKey?: string; // "2026-05" or "2026-09-14"
  value: number; // Sales amount ₹ or count
  orders: number; // Orders count
  reportCount: number; // Number of employee reports
  percentage: number; // 0-100 normalized for graph height
  detail: string; // formatted detail string
}

export interface AnalyticsRangeData {
  title: string;
  currentVal: string;
  targetVal: string;
  targetPercentage: number;
  totalSales: number;
  totalOrders: number;
  totalReports: number;
  points: AnalyticsDataPoint[];
}

export interface DashboardTrendAnalytics {
  day: AnalyticsRangeData;
  week: AnalyticsRangeData;
  month: AnalyticsRangeData;
  departments: {
    sales: {
      totalSales: number;
      totalOrders: number;
      reportCount: number;
    };
    manager: {
      totalExpenses: number;
      totalReturns: number;
      expenseRecords: number;
    };
    packaging: {
      totalPacked: number;
      totalRecords: number;
    };
  };
}

const formatDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getDashboardTrendAnalytics = async (): Promise<DashboardTrendAnalytics> => {
  const now = new Date();
  const todayStr = formatDateString(now);

  // ─────────────────────────────────────────────────────────────
  // 1. MONTH RANGE: Last 6 months (ending with current month)
  // ─────────────────────────────────────────────────────────────
  const sixMonths: Array<{
    label: string;
    ym: string;
    startStr: string;
    endStr: string;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
    const endD = new Date(y, m + 1, 0);
    const startStr = `${ym}-01`;
    const endStr = `${ym}-${String(endD.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    sixMonths.push({ label, ym, startStr, endStr });
  }

  const rangeStart = sixMonths[0].startStr;
  const rangeEnd = sixMonths[5].endStr;

  const monthRows = await query<any[]>(
    `SELECT 
       DATE_FORMAT(date, '%Y-%m') as ym,
       COALESCE(SUM(totalSalesAmount), 0) as totalSales,
       COALESCE(SUM(totalOrders), 0) as totalOrders,
       COUNT(*) as reportCount,
       COUNT(DISTINCT userId) as activeEmployees
     FROM reports
     WHERE date >= ? AND date <= ?
     GROUP BY ym`,
    [rangeStart, rangeEnd]
  );

  const monthMap = new Map<string, any>();
  monthRows.forEach((r) => monthMap.set(r.ym, r));

  let maxMonthSales = 0;
  const rawMonthPoints = sixMonths.map((m) => {
    const r = monthMap.get(m.ym);
    const totalSales = r ? Number(r.totalSales) : 0;
    const totalOrders = r ? Number(r.totalOrders) : 0;
    const reportCount = r ? Number(r.reportCount) : 0;
    if (totalSales > maxMonthSales) maxMonthSales = totalSales;
    return {
      label: m.label,
      dateKey: m.ym,
      value: totalSales,
      orders: totalOrders,
      reportCount,
      percentage: 0,
      detail: `${totalOrders} orders · ${reportCount} reports`,
    };
  });

  const monthPoints: AnalyticsDataPoint[] = rawMonthPoints.map((p) => ({
    ...p,
    percentage: maxMonthSales > 0 ? Math.max(15, Math.round((p.value / maxMonthSales) * 85) + 10) : 20,
  }));

  const currentMonthPoint = monthPoints[monthPoints.length - 1];
  const monthlyTarget = 250000;
  const monthTargetPct = Math.min(100, Math.round((currentMonthPoint.value / monthlyTarget) * 100));

  const monthData: AnalyticsRangeData = {
    title: 'Monthly Sales & Performance Trend',
    currentVal: `₹${(currentMonthPoint.value / 100000).toFixed(2).replace(/\.?0+$/, '')}L`,
    targetVal: `₹${(monthlyTarget / 100000).toFixed(1)}L`,
    targetPercentage: monthTargetPct > 0 ? monthTargetPct : 0,
    totalSales: currentMonthPoint.value,
    totalOrders: currentMonthPoint.orders,
    totalReports: currentMonthPoint.reportCount,
    points: monthPoints,
  };

  // ─────────────────────────────────────────────────────────────
  // 2. WEEK RANGE: Current week (Mon - Sun)
  // ─────────────────────────────────────────────────────────────
  const curr = new Date(now);
  const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, ...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(curr);
  monday.setDate(curr.getDate() - distanceToMonday);

  const weekDays: Array<{ label: string; dateStr: string }> = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push({
      label: dayLabels[i],
      dateStr: formatDateString(d),
    });
  }

  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;

  const weekRows = await query<any[]>(
    `SELECT 
       date,
       COALESCE(SUM(totalSalesAmount), 0) as totalSales,
       COALESCE(SUM(totalOrders), 0) as totalOrders,
       COUNT(*) as reportCount
     FROM reports
     WHERE date >= ? AND date <= ?
     GROUP BY date`,
    [weekStart, weekEnd]
  );

  const weekMap = new Map<string, any>();
  weekRows.forEach((r) => weekMap.set(r.date, r));

  let maxWeekSales = 0;
  let weekTotalSales = 0;
  let weekTotalOrders = 0;
  let weekTotalReports = 0;

  const rawWeekPoints = weekDays.map((w) => {
    const r = weekMap.get(w.dateStr);
    const totalSales = r ? Number(r.totalSales) : 0;
    const totalOrders = r ? Number(r.totalOrders) : 0;
    const reportCount = r ? Number(r.reportCount) : 0;

    weekTotalSales += totalSales;
    weekTotalOrders += totalOrders;
    weekTotalReports += reportCount;

    if (totalSales > maxWeekSales) maxWeekSales = totalSales;

    return {
      label: w.label,
      dateKey: w.dateStr,
      value: totalSales,
      orders: totalOrders,
      reportCount,
      percentage: 0,
      detail: `${totalOrders} orders · ${reportCount} reports`,
    };
  });

  const weekPoints: AnalyticsDataPoint[] = rawWeekPoints.map((p) => ({
    ...p,
    percentage: maxWeekSales > 0 ? Math.max(15, Math.round((p.value / maxWeekSales) * 85) + 10) : 20,
  }));

  const weekTarget = 60000;
  const weekTargetPct = Math.min(100, Math.round((weekTotalSales / weekTarget) * 100));

  const weekData: AnalyticsRangeData = {
    title: 'This Week Sales & Reports Progress',
    currentVal: `₹${(weekTotalSales / 1000).toFixed(1)}K`,
    targetVal: `₹${(weekTarget / 1000).toFixed(0)}K`,
    targetPercentage: weekTargetPct > 0 ? weekTargetPct : 0,
    totalSales: weekTotalSales,
    totalOrders: weekTotalOrders,
    totalReports: weekTotalReports,
    points: weekPoints,
  };

  // ─────────────────────────────────────────────────────────────
  // 3. DAY RANGE: Today's dynamic employee reports
  // ─────────────────────────────────────────────────────────────
  const todayRows = await query<any[]>(
    `SELECT 
       r.*,
       u.fullName,
       u.employeeId
     FROM reports r
     LEFT JOIN users u ON u.id = r.userId
     WHERE r.date = ?
     ORDER BY r.createdAt ASC`,
    [todayStr]
  );

  const timeSlots = [
    { label: '9 AM', maxHour: 10 },
    { label: '11 AM', maxHour: 12 },
    { label: '1 PM', maxHour: 14 },
    { label: '3 PM', maxHour: 16 },
    { label: '5 PM', maxHour: 18 },
    { label: '7 PM', maxHour: 24 },
  ];

  const slotSales = [0, 0, 0, 0, 0, 0];
  const slotOrders = [0, 0, 0, 0, 0, 0];
  const slotReports = [0, 0, 0, 0, 0, 0];

  let todaySales = 0;
  let todayOrders = 0;

  todayRows.forEach((r) => {
    const sale = Number(r.totalSalesAmount) || 0;
    const orders = Number(r.totalOrders) || 0;
    todaySales += sale;
    todayOrders += orders;

    const hour = r.createdAt ? new Date(r.createdAt).getHours() : 12;
    let slotIdx = 5;
    for (let i = 0; i < timeSlots.length; i++) {
      if (hour < timeSlots[i].maxHour) {
        slotIdx = i;
        break;
      }
    }
    slotSales[slotIdx] += sale;
    slotOrders[slotIdx] += orders;
    slotReports[slotIdx] += 1;
  });

  let maxSlotSales = Math.max(...slotSales);
  const dayPoints: AnalyticsDataPoint[] = timeSlots.map((ts, idx) => ({
    label: ts.label,
    value: slotSales[idx],
    orders: slotOrders[idx],
    reportCount: slotReports[idx],
    percentage: maxSlotSales > 0 ? Math.max(15, Math.round((slotSales[idx] / maxSlotSales) * 85) + 10) : 20,
    detail: `${slotOrders[idx]} orders · ${slotReports[idx]} reports`,
  }));

  const dayTarget = 15000;
  const dayTargetPct = Math.min(100, Math.round((todaySales / dayTarget) * 100));

  const dayData: AnalyticsRangeData = {
    title: "Today's Employee Reports & Revenue",
    currentVal: `₹${(todaySales / 1000).toFixed(1)}K`,
    targetVal: `₹${(dayTarget / 1000).toFixed(0)}K`,
    targetPercentage: dayTargetPct > 0 ? dayTargetPct : 0,
    totalSales: todaySales,
    totalOrders: todayOrders,
    totalReports: todayRows.length,
    points: dayPoints,
  };

  // ─────────────────────────────────────────────────────────────
  // 4. DEPARTMENT TOTALS (Manager & Packaging)
  // ─────────────────────────────────────────────────────────────
  const [expenseRows, returnRows, packingRows] = await Promise.all([
    query<any[]>(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM daily_expenses`),
    query<any[]>(`SELECT COALESCE(SUM(returnQuantity), 0) as total, COUNT(*) as cnt FROM product_returns`),
    query<any[]>(`SELECT COALESCE(SUM(ordersPacked), 0) as total, COUNT(*) as cnt FROM packing_records`),
  ]);

  return {
    day: dayData,
    week: weekData,
    month: monthData,
    departments: {
      sales: {
        totalSales: monthData.totalSales,
        totalOrders: monthData.totalOrders,
        reportCount: monthData.totalReports,
      },
      manager: {
        totalExpenses: Number(expenseRows[0]?.total || 0),
        totalReturns: Number(returnRows[0]?.total || 0),
        expenseRecords: Number(expenseRows[0]?.cnt || 0),
      },
      packaging: {
        totalPacked: Number(packingRows[0]?.total || 0),
        totalRecords: Number(packingRows[0]?.cnt || 0),
      },
    },
  };
};

/**
 * Seed realistic employee reports if the database currently has 0 non-admin employees or 0 reports.
 * This guarantees that when the admin opens the dashboard, they immediately see real employee reports
 * plotted on the progress bar and graph, and can add/update reports to watch them update live!
 */
export const seedEmployeeReportsIfEmpty = async (): Promise<void> => {
  const [reportCountRow] = await query<any[]>('SELECT COUNT(*) as count FROM reports');
  if (reportCountRow && Number(reportCountRow.count) > 0) {
    return; // Already has reports
  }

  console.log('[Analytics Seed] Seeding initial employee reports for dynamic dashboard...');

  // Ensure 3 active employees exist:
  const passwordHash = await bcrypt.hash('Employee@123', 10);
  const employees = [
    {
      id: uuidv4(),
      username: 'aisha_sales',
      fullName: 'Aisha Khan',
      employeeId: 'EMP-101',
      email: 'aisha@kltrends.in',
      department: 'sales',
      role: 'employee',
      phone: '9876543210',
    },
    {
      id: uuidv4(),
      username: 'vishnu_sales',
      fullName: 'Vishnu Prasad',
      employeeId: 'EMP-102',
      email: 'vishnu@kltrends.in',
      department: 'sales',
      role: 'employee',
      phone: '9876543211',
    },
    {
      id: uuidv4(),
      username: 'faizal_manager',
      fullName: 'Mohammed Faizal',
      employeeId: 'EMP-103',
      email: 'faizal@kltrends.in',
      department: 'manager',
      role: 'employee',
      phone: '9876543212',
    },
    {
      id: uuidv4(),
      username: 'ramesh_pack',
      fullName: 'Ramesh Kumar',
      employeeId: 'EMP-104',
      email: 'ramesh@kltrends.in',
      department: 'packaging',
      role: 'employee',
      phone: '9876543213',
    },
  ];

  for (const emp of employees) {
    const existing = await User.findByUsername(emp.username);
    if (!existing) {
      await query(
        `INSERT INTO users (id, username, fullName, employeeId, email, password, role, department, phone, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [emp.id, emp.username, emp.fullName, emp.employeeId, emp.email, passwordHash, emp.role, emp.department, emp.phone]
      );
    }
  }

  // Fetch all sales users:
  const salesUsers = await query<any[]>("SELECT id, fullName FROM users WHERE role = 'employee' AND department = 'sales'");
  if (salesUsers.length === 0) return;

  const now = new Date();
  const todayStr = formatDateString(now);

  // Generate historical reports across past 5 months and this month
  const reportInserts: any[] = [];

  // Helper to add report
  const addReport = (userId: string, dateStr: string, sales: number, orders: number, enquiries: number) => {
    const cod = Math.round(orders * 0.65);
    const prepaid = orders - cod;
    reportInserts.push([
      uuidv4(),
      userId,
      dateStr,
      sales,
      enquiries,
      orders,
      cod,
      prepaid,
    ]);
  };

  // 1. Last 5 months data (Jan to current month)
  for (let m = 5; m >= 1; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const dateStr = formatDateString(d);
    // Aisha
    addReport(salesUsers[0].id, dateStr, 24000 + m * 3000, 18 + m * 2, 45 + m * 5);
    // Vishnu
    if (salesUsers[1]) {
      addReport(salesUsers[1].id, dateStr, 28000 + m * 4000, 22 + m * 3, 50 + m * 4);
    }
  }

  // 2. This week data (Monday through today)
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);

  for (let i = 0; i <= distanceToMonday; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateString(d);

    const isToday = dateStr === todayStr;
    const baseSale = isToday ? 6800 : 8500 + i * 1200;
    const baseOrders = isToday ? 8 : 12 + i * 2;

    addReport(salesUsers[0].id, dateStr, baseSale, baseOrders, 25 + i * 3);
    if (salesUsers[1]) {
      addReport(salesUsers[1].id, dateStr, Math.round(baseSale * 1.15), baseOrders + 3, 30 + i * 2);
    }
  }

  // Insert reports into MySQL
  for (const r of reportInserts) {
    await query(
      `INSERT INTO reports (id, userId, date, totalSalesAmount, whatsappEnquiries, totalOrders, codOrders, prepaidOrders, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      r
    );
  }

  // Also seed a few packing records and expenses:
  const packUser = await User.findByUsername('ramesh_pack');
  if (packUser) {
    await query(
      `INSERT INTO packing_records (id, userId, date, ordersPacked, orderSource, createdAt, updatedAt)
       VALUES (?, ?, ?, 48, 'kltrends', NOW(), NOW()), (?, ?, ?, 32, 'klindia', NOW(), NOW())`,
      [uuidv4(), packUser.id, todayStr, uuidv4(), packUser.id, todayStr]
    );
  }

  const managerUser = await User.findByUsername('faizal_manager');
  if (managerUser) {
    await query(
      `INSERT INTO daily_expenses (id, userId, date, amount, category, createdAt, updatedAt)
       VALUES (?, ?, ?, 2400, 'Packaging Materials', NOW(), NOW())`,
      [uuidv4(), managerUser.id, todayStr]
    );
    await query(
      `INSERT INTO product_returns (id, userId, date, returnQuantity, orderSource, createdAt, updatedAt)
       VALUES (?, ?, ?, 3, 'kltrends', NOW(), NOW())`,
      [uuidv4(), managerUser.id, todayStr]
    );
  }

  console.log(`[Analytics Seed] Successfully seeded ${reportInserts.length} dynamic employee reports!`);
};
