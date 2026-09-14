import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  ScrollView,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { Text } from '../common/Text';
import {
  AdminReportItem,
  DashboardStats,
  AdminReportsSummary,
  AnalyticsDataPoint,
  AnalyticsRangeData,
} from '../../api/admin';

type TimeRange = 'Week' | 'Month';
type ChartType = 'line' | 'bar';

interface Props {
  stats?: DashboardStats | null;
  reportsSummary?: AdminReportsSummary | null;
  reports?: AdminReportItem[];
}

export const DashboardAnalyticsChart: React.FC<Props> = ({
  stats,
  reports = [],
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('Month');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [containerWidth, setContainerWidth] = useState<number>(320);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && Math.abs(width - containerWidth) > 5) {
      setContainerWidth(width);
    }
  };

  // Helper: compute dynamic range data from reports if server analytics is not present
  const computeClientFallback = (range: TimeRange): AnalyticsRangeData => {
    const now = new Date();

    if (range === 'Month') {
      const months: AnalyticsDataPoint[] = [];
      let maxVal = 0;
      let curMonthVal = 0;
      let totalOrders = 0;
      let totalReps = 0;

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });

        const monthReports = reports.filter((r) => r.date && r.date.startsWith(ym));
        const sales = monthReports.reduce((sum, r) => sum + (Number(r.totalSalesAmount) || 0), 0);
        const orders = monthReports.reduce((sum, r) => sum + (Number(r.totalOrders) || 0), 0);
        const count = monthReports.length;

        if (sales > maxVal) maxVal = sales;
        if (i === 0) {
          curMonthVal = sales || stats?.totalMonthlySales || 0;
          totalOrders = orders || stats?.totalMonthlyTotalOrders || 0;
          totalReps = count;
        }

        months.push({
          label,
          dateKey: ym,
          value: sales,
          orders,
          reportCount: count,
          percentage: 0,
          detail: `${orders} orders`,
        });
      }

      const effectiveMax = Math.max(maxVal, curMonthVal, 1000);
      const points = months.map((pt, idx) => ({
        ...pt,
        value: pt.value > 0 ? pt.value : idx === 5 ? curMonthVal : 0,
        percentage: effectiveMax > 0
          ? Math.max(15, Math.round(((pt.value > 0 ? pt.value : idx === 5 ? curMonthVal : 0) / effectiveMax) * 85) + 10)
          : 20,
      }));

      return {
        title: '',
        currentVal: `₹${(curMonthVal / 100000).toFixed(2).replace(/\.?0+$/, '')}L`,
        targetVal: '₹2.5L',
        targetPercentage: 0,
        totalSales: curMonthVal,
        totalOrders,
        totalReports: totalReps,
        points,
      };
    }

    // Week
    const curr = new Date(now);
    const dayOfWeek = curr.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let weekTotal = 0;
    let weekOrders = 0;
    let weekReps = 0;
    let maxVal = 0;

    const points: AnalyticsDataPoint[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayReports = reports.filter((r) => r.date === dateStr);
      const sales = dayReports.reduce((sum, r) => sum + (Number(r.totalSalesAmount) || 0), 0);
      const orders = dayReports.reduce((sum, r) => sum + (Number(r.totalOrders) || 0), 0);
      const count = dayReports.length;

      weekTotal += sales;
      weekOrders += orders;
      weekReps += count;
      if (sales > maxVal) maxVal = sales;

      points.push({
        label: dayLabels[i],
        dateKey: dateStr,
        value: sales,
        orders,
        reportCount: count,
        percentage: 0,
        detail: `${orders} orders`,
      });
    }

    const effectiveMax = Math.max(maxVal, 1000);
    const normalizedPoints = points.map((p) => ({
      ...p,
      percentage: effectiveMax > 0 ? Math.max(15, Math.round((p.value / effectiveMax) * 85) + 10) : 20,
    }));

    return {
      title: '',
      currentVal: `₹${(weekTotal / 1000).toFixed(1)}K`,
      targetVal: '₹60K',
      targetPercentage: 0,
      totalSales: weekTotal,
      totalOrders: weekOrders,
      totalReports: weekReps,
      points: normalizedPoints,
    };
  };

  // Get active dataset
  const getActiveDataset = (): AnalyticsRangeData => {
    const serverAnalytics = stats?.analytics;
    if (serverAnalytics) {
      if (timeRange === 'Week' && serverAnalytics.week) return serverAnalytics.week;
      if (timeRange === 'Month' && serverAnalytics.month) return serverAnalytics.month;
    }
    return computeClientFallback(timeRange);
  };

  const currentDataset = getActiveDataset();
  const dataPoints = currentDataset.points || [];

  // Chart dimensions inside the card
  const chartHeight = 175;
  const cardInnerPadding = 32;
  const baseAvailableWidth = Math.max(containerWidth - cardInnerPadding, 260);

  // Allow generous horizontal room so user can move/scroll smoothly
  const minPointSpacing = timeRange === 'Week' ? 52 : 56;
  const calculatedWidth = Math.max(baseAvailableWidth, dataPoints.length * minPointSpacing);
  const graphWidth = calculatedWidth;

  const baselineY = chartHeight - 14;
  const topPadding = 20;
  const graphInnerHeight = baselineY - topPadding;

  // Margin for left and right edges so end dots don't clip
  const marginX = 20;
  const usableWidth = graphWidth - marginX * 2;

  // Compute (x, y) coordinates for each marker point
  const stepX = usableWidth / (dataPoints.length > 1 ? dataPoints.length - 1 : 1);
  const coords = dataPoints.map((pt, index) => {
    const x = marginX + index * stepX;
    const y = baselineY - (pt.percentage / 100) * graphInnerHeight;
    return { x, y, pt, index };
  });

  // Touch scrubbing handler: moves selected point left/right as finger moves
  const handleTouchLocation = (touchX: number) => {
    if (coords.length === 0) return;
    let closestIdx = 0;
    let minDiff = Infinity;
    coords.forEach((c, idx) => {
      const diff = Math.abs(c.x - touchX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setSelectedIndex(closestIdx);
  };

  // Build connecting SVG curve across all data points
  const buildSvgPath = () => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const midX = (curr.x + next.x) / 2;
      path += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const svgPath = buildSvgPath();
  const selectedPoint = selectedIndex !== null && coords[selectedIndex] ? coords[selectedIndex] : null;

  const formatAmount = (val: number, isMonth: boolean) => {
    if (isMonth) {
      const inLakh = val / 100000;
      const formatted = inLakh >= 10 ? inLakh.toFixed(1) : inLakh.toFixed(2);
      return `₹${formatted.replace(/\.?0+$/, '')}L`;
    }
    if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.?0+$/, '')}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  return (
    <View style={styles.outerWrapper} onLayout={onLayout}>
      {/* ── 1. Minimal Segmented Filter Pill (Week | Month) ── */}
      <View style={styles.pillContainer}>
        {(['Week', 'Month'] as TimeRange[]).map((tab) => {
          const isActive = timeRange === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.pillItem, isActive && styles.pillItemActive]}
              onPress={() => {
                setTimeRange(tab);
                setSelectedIndex(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 2. Clean Minimalist Graph Card (Movable / Touch Controlled) ── */}
      <View style={styles.card}>
        {/* Sleek Tooltip when a point/bar is scrubbed or tapped */}
        {selectedPoint ? (
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipLabel}>{selectedPoint.pt.label}: </Text>
              <Text style={styles.tooltipValue}>
                {formatAmount(selectedPoint.pt.value, timeRange === 'Month')}
              </Text>
              {selectedPoint.pt.orders > 0 && (
                <Text style={styles.tooltipDetail}> · {selectedPoint.pt.orders} orders</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.tooltipPlaceholder} />
        )}

        {/* ── Horizontally Scrollable & Touch-Controllable Canvas ── */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={true}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.scrollableChartContent}
        >
          <View
            style={[styles.chartCanvasContainer, { width: graphWidth }]}
            onTouchStart={(e) => handleTouchLocation(e.nativeEvent.locationX)}
            onTouchMove={(e) => handleTouchLocation(e.nativeEvent.locationX)}
          >
            <Svg width={graphWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#8B2FC0" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#B784F2" stopOpacity="0.85" />
                </LinearGradient>
                <LinearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#570490" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#7410B5" stopOpacity="0.95" />
                </LinearGradient>
              </Defs>

              {/* Render Bar Chart Mode */}
              {chartType === 'bar' && (
                <>
                  {coords.map((c, i) => {
                    const barWidth = Math.max(16, (usableWidth / coords.length) * 0.44);
                    const barX = c.x - barWidth / 2;
                    const barHeight = Math.max(8, baselineY - c.y);
                    const isSelected = selectedIndex === i;

                    return (
                      <React.Fragment key={`bar-${i}`}>
                        {/* Background slot track */}
                        <Rect
                          x={barX}
                          y={topPadding}
                          width={barWidth}
                          height={graphInnerHeight}
                          rx={barWidth / 2}
                          ry={barWidth / 2}
                          fill="#F3E8FF"
                          opacity={0.35}
                        />
                        {/* Active Fill Bar */}
                        <Rect
                          x={barX}
                          y={c.y}
                          width={barWidth}
                          height={barHeight}
                          rx={barWidth / 2}
                          ry={barWidth / 2}
                          fill={isSelected ? 'url(#barGradientActive)' : 'url(#barGradient)'}
                        />
                        {/* Highlight Dot on top of active bar */}
                        {isSelected && (
                          <Circle
                            cx={c.x}
                            cy={c.y - 4}
                            r={4}
                            fill="#570490"
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* Render Line Chart Mode (Exact Reference Image Style) */}
              {chartType === 'line' && (
                <>
                  {/* 1. Thin vertical drop lines from each point down to baseline */}
                  {coords.map((c, i) => {
                    const isSelected = selectedIndex === i;
                    return (
                      <Line
                        key={`drop-line-${i}`}
                        x1={c.x}
                        y1={c.y}
                        x2={c.x}
                        y2={baselineY}
                        stroke={isSelected ? '#C084FC' : '#F3E8FF'}
                        strokeWidth={isSelected ? 2 : 1.5}
                      />
                    );
                  })}

                  {/* 2. Main Purple / Lavender Trend Line */}
                  <Path
                    d={svgPath}
                    fill="none"
                    stroke="#B784F2"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* 3. Circular Markers: Solid black ring with crisp white center */}
                  {coords.map((c, i) => {
                    const isSelected = selectedIndex === i;
                    return (
                      <React.Fragment key={`marker-${i}`}>
                        {isSelected && (
                          <Circle
                            cx={c.x}
                            cy={c.y}
                            r={11}
                            fill="#8B2FC0"
                            opacity={0.2}
                          />
                        )}
                        <Circle
                          cx={c.x}
                          cy={c.y}
                          r={isSelected ? 6 : 4.5}
                          fill="#FFFFFF"
                          stroke="#111827"
                          strokeWidth={isSelected ? 3 : 2.4}
                        />
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </Svg>

            {/* ── X-Axis Labels ── */}
            <View style={[styles.xAxisRow, { width: graphWidth }]}>
              {coords.map((c, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <View
                    key={`label-${i}`}
                    style={[
                      styles.xAxisLabelWrapper,
                      {
                        left: c.x,
                        transform: [{ translateX: -18 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.xAxisText,
                        isSelected && styles.xAxisTextSelected,
                      ]}
                    >
                      {c.pt.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* ── 4. Bottom Switcher Icon Toggle (Line Chart vs Bar Chart) ── */}
        <View style={styles.toggleContainer}>
          <View style={styles.togglePill}>
            {/* Line Chart Toggle Icon */}
            <TouchableOpacity
              style={[
                styles.toggleIconBtn,
                chartType === 'line' && styles.toggleIconBtnActive,
              ]}
              onPress={() => setChartType('line')}
              activeOpacity={0.8}
            >
              <Svg width={18} height={14} viewBox="0 0 18 14" fill="none">
                <Path
                  d="M1.5 12.5L6.5 6.5L10.5 9.5L16.5 1.5"
                  stroke={chartType === 'line' ? '#111827' : '#9CA3AF'}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M1 13.5H17"
                  stroke={chartType === 'line' ? '#111827' : '#CBD5E1'}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>

            {/* Bar Chart Toggle Icon */}
            <TouchableOpacity
              style={[
                styles.toggleIconBtn,
                chartType === 'bar' && styles.toggleIconBtnActive,
              ]}
              onPress={() => setChartType('bar')}
              activeOpacity={0.8}
            >
              <Svg width={18} height={14} viewBox="0 0 18 14" fill="none">
                <Rect
                  x={2}
                  y={8}
                  width={3}
                  height={5}
                  rx={1}
                  fill={chartType === 'bar' ? '#111827' : '#9CA3AF'}
                />
                <Rect
                  x={7.5}
                  y={4}
                  width={3}
                  height={9}
                  rx={1}
                  fill={chartType === 'bar' ? '#111827' : '#9CA3AF'}
                />
                <Rect
                  x={13}
                  y={1}
                  width={3}
                  height={12}
                  rx={1}
                  fill={chartType === 'bar' ? '#111827' : '#9CA3AF'}
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  // ── Segmented Tab Pill ───────────────────────────
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#EBECEF',
    borderRadius: 24,
    padding: 3,
    marginBottom: 12,
  },
  pillItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pillItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  pillTextActive: {
    fontWeight: '700',
    color: '#111827',
  },

  // ── Main Minimal Card ────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0EAF5',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    shadowColor: '#570490',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // ── Tooltip ──────────────────────────────────────
  tooltipContainer: {
    alignItems: 'center',
    height: 28,
    marginBottom: 6,
  },
  tooltipPlaceholder: {
    height: 10,
  },
  tooltipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F5FC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDF0',
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#570490',
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  tooltipDetail: {
    fontSize: 12,
    color: '#6B7280',
  },

  // ── Scrollable Chart ─────────────────────────────
  scrollableChartContent: {
    flexGrow: 1,
  },
  chartCanvasContainer: {
    height: 205,
    position: 'relative',
  },

  // ── X-Axis Labels ────────────────────────────────
  xAxisRow: {
    height: 24,
    position: 'relative',
    marginTop: 6,
  },
  xAxisLabelWrapper: {
    position: 'absolute',
    width: 36,
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  xAxisTextSelected: {
    color: '#111827',
    fontWeight: '800',
  },

  // ── Bottom Toggle Pill ───────────────────────────
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  toggleIconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  toggleIconBtnActive: {
    backgroundColor: '#E5E7EB',
  },
});
