import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CompetitionWeeklyReport } from '../types/competition';

/**
 * Removes Vietnamese diacritical tones and normalizes characters.
 * Example: "Tuần 1" -> "Tuan 1", "Tất cả khối" -> "Tat ca khoi"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sanitizes a string fragment for clean, safe filenames.
 */
export function sanitizeFileNamePart(str: string): string {
  if (!str) return '';
  const noTones = removeVietnameseTones(str);
  return noTones
    .replace(/[\/\s\:\,\;\t\n\r]+/g, '-') // replace spaces, slashes, punctuation with '-'
    .replace(/[^a-zA-Z0-9\-_]/g, '')     // remove invalid characters
    .replace(/[\-_]{2,}/g, '-')          // collapse multiple dashes/underscores
    .replace(/^[\-_]+|[\-_]+$/g, '');    // trim leading/trailing dashes/underscores
}

/**
 * Formats date string to DD-MM-YYYY format for filenames.
 */
function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}-${m}-${y}`;
  }
  try {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // fallback
  }
  return sanitizeFileNamePart(dateStr);
}

/**
 * Builds a standardized, clean, Vietnamese-friendly filename for competition reports.
 * 
 * Examples:
 * - Weekly: Bien-ban-thi-dua_Tuan-1_Tat-ca-khoi_03-08-2026_09-08-2026.pdf
 * - Monthly: Bien-ban-thi-dua_Thang-08-2026_Khoi-6.pdf
 * - Semester: Bien-ban-thi-dua_Hoc-ky-I_2025-2026_Tat-ca-khoi.pdf
 * - Year: Bien-ban-thi-dua_Nam-hoc-2025-2026_Tat-ca-khoi.pdf
 */
export function buildReportPdfFileName(report: CompetitionWeeklyReport, isSnapshot = false): string {
  const gradePart = sanitizeFileNamePart(report.grade_name || 'Tat-ca-khoi');
  const periodType = (report.period_type || 'WEEK').toUpperCase();
  let periodPart = '';

  if (periodType === 'WEEK') {
    const weekName = sanitizeFileNamePart(report.week_name || report.period_label || 'Tuan');
    const startDate = formatDateDDMMYYYY(report.period_start);
    const endDate = formatDateDDMMYYYY(report.period_end);
    if (startDate && endDate) {
      periodPart = `${weekName}_${gradePart}_${startDate}_${endDate}`;
    } else {
      periodPart = `${weekName}_${gradePart}`;
    }
  } else if (periodType === 'MONTH') {
    const monthLabel = sanitizeFileNamePart(report.period_label || 'Thang');
    periodPart = `${monthLabel}_${gradePart}`;
  } else if (periodType === 'SEMESTER') {
    const semLabel = sanitizeFileNamePart(report.period_label || 'Hoc-ky-I');
    const yearLabel = sanitizeFileNamePart(report.academic_year_name || '2025-2026');
    periodPart = `${semLabel}_${yearLabel}_${gradePart}`;
  } else if (periodType === 'YEAR') {
    const yearLabel = sanitizeFileNamePart(report.academic_year_name || report.period_label || '2025-2026');
    periodPart = `Nam-hoc-${yearLabel}_${gradePart}`;
  } else {
    const customLabel = sanitizeFileNamePart(report.period_label || report.week_name || 'Bao-cao');
    periodPart = `${customLabel}_${gradePart}`;
  }

  const prefix = isSnapshot ? 'Bien-ban-thi-dua_Luu-tru' : 'Bien-ban-thi-dua';
  return `${prefix}_${periodPart}.pdf`.replace(/_{2,}/g, '_');
}

/**
 * Unified PDF export function:
 * 1. Captures the exact DOM node of ReportDocument using html2canvas.
 * 2. Formats to standard A4 portrait (210mm x 297mm) with ~10mm margins.
 * 3. Scales content so it occupies almost full printable width (190mm).
 * 4. Automatically splits multi-page reports cleanly at table row boundaries without squishing or clipping.
 */
export async function exportReportToPdf(
  targetElement: HTMLElement | null,
  report: CompetitionWeeklyReport,
  isSnapshot = false
): Promise<void> {
  if (!targetElement) {
    throw new Error('Không tìm thấy phần tử giao diện báo cáo để xuất PDF.');
  }

  const fileName = buildReportPdfFileName(report, isSnapshot);

  // 1. Capture DOM element with html2canvas
  const canvas = await html2canvas(targetElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: targetElement.scrollWidth || 800,
    windowHeight: targetElement.scrollHeight,
    onclone: (clonedDoc, element) => {
      // Force clean document container styling for accurate A4 aspect rendering
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#0f172a';
      element.style.width = '794px'; // Standard 96 DPI A4 width
      element.style.maxWidth = 'none';
      element.style.margin = '0 auto';
      element.style.padding = '24px';
      element.style.boxSizing = 'border-box';

      // Strip dark mode class on cloned element
      element.classList.remove('dark');

      // Convert textareas to pre-wrap divs so supervisor notes render cleanly
      const textareas = element.querySelectorAll('textarea');
      textareas.forEach((ta) => {
        const div = clonedDoc.createElement('div');
        div.className = ta.className;
        div.style.whiteSpace = 'pre-wrap';
        div.style.minHeight = '60px';
        div.innerText = (ta as HTMLTextAreaElement).value || (ta as HTMLTextAreaElement).placeholder || 'Không có nhận xét bổ sung.';
        if (ta.parentNode) {
          ta.parentNode.replaceChild(div, ta);
        }
      });

      // Expand horizontal overflow table containers
      const scrollWrappers = element.querySelectorAll('.overflow-x-auto');
      scrollWrappers.forEach((wrapper) => {
        (wrapper as HTMLElement).style.overflow = 'visible';
      });
    }
  });

  // 2. Setup jsPDF for standard A4 Portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 10; // 10mm margins all around
  const printableWidth = pageWidth - margin * 2; // 190mm
  const printableHeight = pageHeight - margin * 2; // 277mm

  // Conversion factor: mm per canvas pixel
  const mmPerCanvasPx = printableWidth / canvas.width;
  const maxSlicePx = printableHeight / mmPerCanvasPx;

  // Measure element break points (table rows <tr>) to prevent cutting text in half
  const targetElementWidth = targetElement.offsetWidth || 794;
  const scaleRatio = canvas.width / targetElementWidth;

  const rowElements = Array.from(targetElement.querySelectorAll('tr, .space-y-2'));
  const breakPointsPx: number[] = [];
  rowElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const bottomPx = (htmlEl.offsetTop + htmlEl.offsetHeight) * scaleRatio;
    if (bottomPx > 0 && bottomPx < canvas.height) {
      breakPointsPx.push(bottomPx);
    }
  });
  breakPointsPx.sort((a, b) => a - b);

  let currentY = 0;
  let pageIndex = 0;

  while (currentY < canvas.height) {
    let slicePx = Math.min(maxSlicePx, canvas.height - currentY);

    // If remaining content exceeds 1 page height, try to find clean row break point
    if (currentY + maxSlicePx < canvas.height) {
      const targetBreakY = currentY + maxSlicePx;
      const minAcceptableY = currentY + maxSlicePx * 0.75;
      let bestBreak = -1;

      for (let i = breakPointsPx.length - 1; i >= 0; i--) {
        const bp = breakPointsPx[i];
        if (bp <= targetBreakY && bp >= minAcceptableY) {
          bestBreak = bp;
          break;
        }
      }

      if (bestBreak > currentY) {
        slicePx = bestBreak - currentY;
      }
    }

    // Slice canvas
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = slicePx;

    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, currentY, canvas.width, slicePx,
        0, 0, canvas.width, slicePx
      );
    }

    const pageImgData = pageCanvas.toDataURL('image/png');
    const pdfImageHeight = slicePx * mmPerCanvasPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(pageImgData, 'PNG', margin, margin, printableWidth, pdfImageHeight);

    currentY += slicePx;
    pageIndex++;
  }

  pdf.save(fileName);
}
