import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AuthenticatedRequest } from '../types/index.js';
import { query } from '../config/db.js';
import { Report } from '../models/Report.js';
import { ProductReturn } from '../models/ProductReturn.js';
import { DailyExpense } from '../models/DailyExpense.js';
import { PackingRecord } from '../models/PackingRecord.js';
import { MediaActivity } from '../models/MediaActivity.js';

type ExportRow = {
  employeeName: string;
  employeeId: string;
  department: string;
  date: string;
  totalSalesAmount: number;
  whatsappEnquiries: number;
  totalOrders: number;
  codOrders: number;
  prepaidOrders: number;
  activityType?: string;
  orderSource?: string;
  category?: string;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const range = (params: Record<string, any>) => {
  const now = new Date();
  const period = String(params.period || 'daily');
  if (period === 'daily') {
    const date = String(params.date || formatDate(now));
    return { start: date, end: date, label: `Daily_${date}`, periodName: `Daily (${date})` };
  }
  const year = Number(params.year) || now.getFullYear();
  if (period === 'monthly') {
    const month = (Number(params.month) || now.getMonth() + 1) - 1;
    const monthStr = String(month + 1).padStart(2, '0');
    return {
      start: formatDate(new Date(year, month, 1)),
      end: formatDate(new Date(year, month + 1, 0)),
      label: `Monthly_${year}-${monthStr}`,
      periodName: `Monthly (${year}-${monthStr})`,
    };
  }
  if (period === 'yearly') {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: `Yearly_${year}`,
      periodName: `Yearly (${year})`,
    };
  }
  throw new Error('Invalid period. Use daily, monthly, or yearly.');
};

type ExportColumn = { header: string; key: keyof ExportRow; width: number; align?: 'left' | 'center' | 'right' };

const totalsRowFor = (rows: ExportRow[]): ExportRow => ({
  employeeName: `TOTALS (${rows.length} records)`,
  employeeId: '',
  department: '',
  date: '',
  totalSalesAmount: rows.reduce((sum, row) => sum + row.totalSalesAmount, 0),
  whatsappEnquiries: rows.reduce((sum, row) => sum + row.whatsappEnquiries, 0),
  totalOrders: rows.reduce((sum, row) => sum + row.totalOrders, 0),
  codOrders: rows.reduce((sum, row) => sum + row.codOrders, 0),
  prepaidOrders: rows.reduce((sum, row) => sum + row.prepaidOrders, 0),
});

const salesColumns: ExportColumn[] = [
  { header: 'Employee Name', key: 'employeeName', width: 110, align: 'left' },
  { header: 'Emp ID', key: 'employeeId', width: 55, align: 'center' },
  { header: 'Department', key: 'department', width: 70, align: 'left' },
  { header: 'Date', key: 'date', width: 60, align: 'center' },
  { header: 'Total Sales (Rs)', key: 'totalSalesAmount', width: 85, align: 'right' },
  { header: 'Enquiries', key: 'whatsappEnquiries', width: 55, align: 'right' },
  { header: 'Total Orders', key: 'totalOrders', width: 65, align: 'right' },
  { header: 'COD', key: 'codOrders', width: 45, align: 'right' },
  { header: 'Prepaid', key: 'prepaidOrders', width: 50, align: 'right' },
];

const columnsFor = (department: string): ExportColumn[] => {
  if (department === 'manager') {
    return [
      { header: 'Employee Name', key: 'employeeName', width: 110 }, { header: 'Emp ID', key: 'employeeId', width: 55 },
      { header: 'Department', key: 'department', width: 70 }, { header: 'Date', key: 'date', width: 60 },
      { header: 'Record Type', key: 'category', width: 75 }, { header: 'Amount (Rs)', key: 'totalSalesAmount', width: 75, align: 'right' },
      { header: 'Quantity', key: 'totalOrders', width: 60, align: 'right' },
    ];
  }
  if (department === 'packaging') {
    return [
      { header: 'Employee Name', key: 'employeeName', width: 110 }, { header: 'Emp ID', key: 'employeeId', width: 55 },
      { header: 'Department', key: 'department', width: 70 }, { header: 'Date', key: 'date', width: 60 },
      { header: 'Order Source', key: 'orderSource', width: 80 }, { header: 'Orders Packed', key: 'totalOrders', width: 75, align: 'right' },
    ];
  }
  if (department === 'media') {
    return [
      { header: 'Employee Name', key: 'employeeName', width: 110 }, { header: 'Emp ID', key: 'employeeId', width: 55 },
      { header: 'Department', key: 'department', width: 70 }, { header: 'Date', key: 'date', width: 60 },
      { header: 'Activity', key: 'activityType', width: 80 }, { header: 'Videos', key: 'totalOrders', width: 65, align: 'right' },
    ];
  }
  return salesColumns;
};

const rowsFor = async (start: string, end: string, department?: string): Promise<ExportRow[]> => {
  const reports = await Report.findInDateRange(start, end);
  if (!reports.length) return [];
  const ids = [...new Set(reports.map((report) => report.userId))];
  const placeholders = ids.map(() => '?').join(',');
  const users = await query<any[]>(
    `SELECT id, fullName, username, employeeId, department FROM users WHERE id IN (${placeholders})`,
    ids
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  return reports.map((report) => {
    const user = usersById.get(report.userId);
    if (department && department !== 'all' && user?.department?.toLowerCase() !== department) {
      return null;
    }
    return {
      employeeName: user?.fullName || user?.username || 'Unknown',
      employeeId: user?.employeeId || '--',
      department: user?.department || '--',
      date: report.date,
      totalSalesAmount: Number(report.totalSalesAmount) || 0,
      whatsappEnquiries: Number(report.whatsappEnquiries) || 0,
      totalOrders: Number(report.totalOrders) || 0,
      codOrders: Number(report.codOrders) || 0,
      prepaidOrders: Number(report.prepaidOrders) || 0,
    };
  }).filter((row): row is ExportRow => row !== null);
};

const activityRowsFor = async (start: string, end: string, department: string): Promise<ExportRow[]> => {
  if (department === 'manager') {
    const [returns, expenses] = await Promise.all([
      ProductReturn.findFiltered({ startDate: start, endDate: end }),
      DailyExpense.findFiltered({ startDate: start, endDate: end }),
    ]);
    return [
      ...returns.map((record) => ({
        employeeName: record.employeeName || '--', employeeId: record.employeeId || '--', department: 'manager', date: record.date,
        totalSalesAmount: 0, whatsappEnquiries: 0, totalOrders: record.returnQuantity, codOrders: 0, prepaidOrders: 0, category: 'Product Return',
      })),
      ...expenses.map((record) => ({
        employeeName: record.employeeName || '--', employeeId: record.employeeId || '--', department: 'manager', date: record.date,
        totalSalesAmount: record.amount, whatsappEnquiries: 0, totalOrders: 0, codOrders: 0, prepaidOrders: 0, category: record.category,
      })),
    ];
  }

  if (department === 'packaging') {
    const records = await PackingRecord.findFiltered({ startDate: start, endDate: end });
    return records.map((record) => ({
      employeeName: record.employeeName || '--', employeeId: record.employeeId || '--', department: 'packaging', date: record.date,
      totalSalesAmount: 0, whatsappEnquiries: 0, totalOrders: record.ordersPacked, codOrders: record.orderSource === 'kltrends' ? record.ordersPacked : 0,
      prepaidOrders: record.orderSource === 'klindia' ? record.ordersPacked : 0, orderSource: record.orderSource,
    }));
  }

  const [shoots, out] = await Promise.all([
    MediaActivity.findFiltered({ activityType: 'video-shoot', startDate: start, endDate: end }),
    MediaActivity.findFiltered({ activityType: 'video-out', startDate: start, endDate: end }),
  ]);
  return [...shoots, ...out].map((record) => ({
    employeeName: record.employeeName || '--', employeeId: record.employeeId || '--', department: 'media', date: record.date,
    totalSalesAmount: 0, whatsappEnquiries: 0, totalOrders: record.totalVideos, codOrders: record.activityType === 'video-shoot' ? record.totalVideos : 0,
    prepaidOrders: record.activityType === 'video-out' ? record.totalVideos : 0, activityType: record.activityType,
  }));
};

const formatCurrency = (val: number): string => `Rs. ${Number(val || 0).toLocaleString('en-IN')}`;

const generatePdfBuffer = (
  rows: ExportRow[],
  periodName: string,
  start: string,
  end: string,
  columns: ExportColumn[]
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 25, bottom: 25, left: 30, right: 30 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = 30;
      const marginRight = 30;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Summary calculations
      const totalSales = rows.reduce((s, r) => s + r.totalSalesAmount, 0);
      const totalEnquiries = rows.reduce((s, r) => s + r.whatsappEnquiries, 0);
      const totalOrders = rows.reduce((s, r) => s + r.totalOrders, 0);
      const totalCod = rows.reduce((s, r) => s + r.codOrders, 0);
      const totalPrepaid = rows.reduce((s, r) => s + r.prepaidOrders, 0);

      const drawHeaderBanner = (isFirstPage: boolean) => {
        // Brand Header Box
        doc.rect(marginLeft, 20, contentWidth, isFirstPage ? 52 : 36).fill('#570490');

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(isFirstPage ? 16 : 13);
        doc.text('KL TRENDS', marginLeft + 14, isFirstPage ? 28 : 26);

        doc.font('Helvetica').fontSize(isFirstPage ? 9.5 : 8.5).fillColor('#E9D5FF');
        doc.text('Employee Sales & Activity Report', marginLeft + 14, isFirstPage ? 48 : 42);

        // Right side metadata
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
        doc.text(`Period: ${periodName}`, marginLeft, isFirstPage ? 28 : 26, {
          width: contentWidth - 14,
          align: 'right',
        });

        doc.font('Helvetica').fontSize(7.5).fillColor('#E9D5FF');
        doc.text(
          `Date Range: ${start} to ${end}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`,
          marginLeft,
          isFirstPage ? 48 : 42,
          { width: contentWidth - 14, align: 'right' }
        );
      };

      const drawSummaryCards = (startY: number): number => {
        const cardCount = 4;
        const gap = 10;
        const cardWidth = (contentWidth - gap * (cardCount - 1)) / cardCount;
        const cardHeight = 44;

        const cards = [
          { label: 'TOTAL SALES REVENUE', val: formatCurrency(totalSales), color: '#059669', bg: '#ECFDF5' },
          { label: 'TOTAL ORDERS', val: totalOrders.toLocaleString('en-IN'), color: '#2563EB', bg: '#EFF6FF' },
          { label: 'WHATSAPP ENQUIRIES', val: totalEnquiries.toLocaleString('en-IN'), color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'PAYMENT SPLIT', val: `COD: ${totalCod} | Prep: ${totalPrepaid}`, color: '#D97706', bg: '#FFFBEB' },
        ];

        cards.forEach((card, idx) => {
          const x = marginLeft + idx * (cardWidth + gap);
          doc.rect(x, startY, cardWidth, cardHeight).fill(card.bg);
          doc.rect(x, startY, cardWidth, cardHeight).strokeColor('#E5E7EB').lineWidth(1).stroke();

          doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(6.5);
          doc.text(card.label, x + 8, startY + 8, { width: cardWidth - 16 });

          doc.fillColor(card.color).font('Helvetica-Bold').fontSize(10);
          doc.text(card.val, x + 8, startY + 22, { width: cardWidth - 16 });
        });

        return startY + cardHeight + 12;
      };

      const tableTotalWidth = columns.reduce((s, c) => s + c.width, 0);
      const startTableX = marginLeft + (contentWidth - tableTotalWidth) / 2;

      const drawTableHeader = (y: number): number => {
        const headerHeight = 22;
        doc.rect(startTableX, y, tableTotalWidth, headerHeight).fill('#4A0E4E');

        let currentX = startTableX;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');

        columns.forEach((col) => {
          doc.text(col.header, currentX + 3, y + 6, {
            width: col.width - 6,
            align: col.align || 'left',
          });
          currentX += col.width;
        });

        return y + headerHeight;
      };

      // Draw first page
      drawHeaderBanner(true);
      let currentY = drawSummaryCards(80);
      currentY = drawTableHeader(currentY);

      const rowHeight = 18;
      const maxY = pageHeight - 45;

      rows.forEach((row, rowIndex) => {
        if (currentY + rowHeight > maxY) {
          doc.addPage();
          drawHeaderBanner(false);
          currentY = drawTableHeader(65);
        }

        const isEven = rowIndex % 2 === 0;
        const rowBg = isEven ? '#FFFFFF' : '#FAF8FD';

        doc.rect(startTableX, currentY, tableTotalWidth, rowHeight).fill(rowBg);
        doc.rect(startTableX, currentY, tableTotalWidth, rowHeight).strokeColor('#F0EDF5').lineWidth(0.5).stroke();

        let currentX = startTableX;
        doc.font('Helvetica').fontSize(7.5).fillColor('#1F2937');

        columns.forEach((col) => {
          let val = String(row[col.key]);
          if (col.key === 'totalSalesAmount') {
            val = Number(row[col.key]).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          } else if (typeof row[col.key] === 'number') {
            val = Number(row[col.key]).toLocaleString('en-IN');
          }

          doc.text(val, currentX + 3, currentY + 5, {
            width: col.width - 6,
            align: col.align || 'left',
          });
          currentX += col.width;
        });

        currentY += rowHeight;
      });

      // Totals Row
      if (currentY + rowHeight > maxY) {
        doc.addPage();
        drawHeaderBanner(false);
        currentY = drawTableHeader(65);
      }

      doc.rect(startTableX, currentY, tableTotalWidth, rowHeight + 2).fill('#EDE9FE');
      doc.rect(startTableX, currentY, tableTotalWidth, rowHeight + 2).strokeColor('#C4B5FD').lineWidth(1).stroke();

      const totalsData: Record<string, string> = {
        employeeName: `Total (${rows.length} records)`,
        employeeId: '',
        department: '',
        date: '',
        totalSalesAmount: totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        whatsappEnquiries: totalEnquiries.toLocaleString('en-IN'),
        totalOrders: totalOrders.toLocaleString('en-IN'),
        codOrders: totalCod.toLocaleString('en-IN'),
        prepaidOrders: totalPrepaid.toLocaleString('en-IN'),
      };

      let currentX = startTableX;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#570490');
      columns.forEach((col) => {
        const val = totalsData[col.key] || '';
        doc.text(val, currentX + 3, currentY + 6, {
          width: col.width - 6,
          align: col.align || 'left',
        });
        currentX += col.width;
      });

      // Page numbers on all pages
      const rangeDoc = doc.bufferedPageRange();
      for (let i = 0; i < rangeDoc.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF');
        doc.text(
          'CONFIDENTIAL  |  KL Trends Employee Management System',
          marginLeft,
          pageHeight - 20,
          { width: contentWidth / 2, align: 'left' }
        );
        doc.text(
          `Page ${i + 1} of ${rangeDoc.count}`,
          marginLeft + contentWidth / 2,
          pageHeight - 20,
          { width: contentWidth / 2, align: 'right' }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const generateAllDepartmentsPdfBuffer = (
  rows: ExportRow[],
  periodName: string,
  start: string,
  end: string
): Promise<Buffer> => new Promise((resolve, reject) => {
  try {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 25, bottom: 25, left: 30, right: 30 } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (['sales', 'manager', 'packaging', 'media'] as const).forEach((department, departmentIndex) => {
      if (departmentIndex > 0) doc.addPage();
      const departmentRows = rows.filter((row) => row.department.toLowerCase() === department);
      const departmentColumns = columnsFor(department);
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 60;
      const totalWidth = departmentColumns.reduce((sum, column) => sum + column.width, 0);
      const scale = Math.min(1, contentWidth / totalWidth);
      const startX = 30;
      let y = 25;

      doc.rect(startX, y, contentWidth, 48).fill('#570490');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(15).text('KL TRENDS', startX + 12, y + 10);
      doc.font('Helvetica').fontSize(9).fillColor('#E9D5FF').text(`${department.toUpperCase()} DEPARTMENT REPORT`, startX + 12, y + 30);
      doc.font('Helvetica').fontSize(8).text(`${periodName}  |  ${start} to ${end}`, startX + 12, y + 40, { width: contentWidth - 20, align: 'right' });
      y += 62;

      let x = startX;
      doc.rect(startX, y, totalWidth * scale, 24).fill('#4A0E4E');
      departmentColumns.forEach((column) => {
        const width = column.width * scale;
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF').text(column.header, x + 3, y + 8, { width: width - 6, align: column.align || 'left' });
        x += width;
      });
      y += 24;

      departmentRows.forEach((row, rowIndex) => {
        if (y > doc.page.height - 45) {
          doc.addPage();
          y = 35;
        }
        x = startX;
        doc.rect(startX, y, totalWidth * scale, 20).fill(rowIndex % 2 === 0 ? '#FFFFFF' : '#FAF8FD');
        departmentColumns.forEach((column) => {
          const rawValue = row[column.key];
          const value = typeof rawValue === 'number' ? rawValue.toLocaleString('en-IN') : String(rawValue || '--');
          const width = column.width * scale;
          doc.font('Helvetica').fontSize(7).fillColor('#1F2937').text(value, x + 3, y + 6, { width: width - 6, align: column.align || 'left' });
          x += width;
        });
        y += 20;
      });

      if (!departmentRows.length) {
        doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('No records for this department in the selected period.', startX, y + 14);
      } else {
        const totals = totalsRowFor(departmentRows);
        if (y > doc.page.height - 45) {
          doc.addPage();
          y = 35;
        }
        x = startX;
        doc.rect(startX, y, totalWidth * scale, 22).fill('#EDE9FE');
        doc.rect(startX, y, totalWidth * scale, 22).strokeColor('#C4B5FD').lineWidth(1).stroke();
        departmentColumns.forEach((column) => {
          const rawValue = totals[column.key];
          const value = column.key === 'totalSalesAmount'
            ? formatCurrency(Number(rawValue) || 0)
            : typeof rawValue === 'number'
            ? rawValue.toLocaleString('en-IN')
            : String(rawValue || '');
          const width = column.width * scale;
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#570490').text(value, x + 3, y + 7, { width: width - 6, align: column.align || 'left' });
          x += width;
        });
      }
    });
    doc.end();
  } catch (error) {
    reject(error);
  }
});

export const exportEmployeeReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { start, end, label, periodName } = range(req.query as Record<string, any>);
    const requestedDepartment = String(req.query.department || 'all').toLowerCase();
    const department = ['all', 'sales', 'manager', 'packaging', 'media'].includes(requestedDepartment)
      ? requestedDepartment
      : 'all';
    const rows = department === 'sales' ? await rowsFor(start, end, department) : department === 'all'
      ? [...await rowsFor(start, end, 'all'), ...await activityRowsFor(start, end, 'manager'), ...await activityRowsFor(start, end, 'packaging'), ...await activityRowsFor(start, end, 'media')]
      : await activityRowsFor(start, end, department);
    if (!rows.length) {
      res.status(404).json({ success: false, error: 'No reports found for the selected period.' });
      return;
    }
    const format = String(req.query.format || 'pdf').toLowerCase();

    if (format === 'pdf') {
      const pdfBuffer = department === 'all'
        ? await generateAllDepartmentsPdfBuffer(rows, periodName, start, end)
        : await generatePdfBuffer(rows, periodName, start, end, columnsFor(department));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="KLTrends_Reports_${department}_${label}.pdf"`);
      res.send(pdfBuffer);
      return;
    }

    if (format === 'excel' || format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Reports');
      const exportDepartments = department === 'all' ? ['sales', 'manager', 'packaging', 'media'] : [department];
      exportDepartments.forEach((exportDepartment, sheetIndex) => {
        const exportColumns = columnsFor(exportDepartment);
        const targetSheet = sheetIndex === 0 ? sheet : workbook.addWorksheet(exportDepartment.charAt(0).toUpperCase() + exportDepartment.slice(1));
        targetSheet.name = exportDepartment.charAt(0).toUpperCase() + exportDepartment.slice(1);
        targetSheet.columns = exportColumns.map((column) => ({ header: column.header, key: column.key, width: Math.max(14, Math.round(column.width / 4)) }));
        const departmentRows = rows.filter((row) => row.department.toLowerCase() === exportDepartment);
        departmentRows.forEach((row) => targetSheet.addRow(row));
        if (departmentRows.length > 0) {
          const totalRow = targetSheet.addRow(totalsRowFor(departmentRows));
          totalRow.font = { bold: true, color: { argb: 'FF570490' } };
          totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
          totalRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFC4B5FD' } },
              bottom: { style: 'thin', color: { argb: 'FFC4B5FD' } },
            };
          });
        }
        targetSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        targetSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF570490' } };
        exportColumns.forEach((column, index) => {
          if (column.key === 'totalSalesAmount') targetSheet.getColumn(index + 1).numFmt = '₹#,##0.00';
          if (['totalOrders', 'whatsappEnquiries', 'codOrders', 'prepaidOrders'].includes(column.key)) targetSheet.getColumn(index + 1).numFmt = '#,##0';
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="KLTrends_Reports_${department}_${label}.xlsx"`);
      res.send(Buffer.from(buffer));
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid format. Use pdf or excel.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to export reports' });
  }
};
