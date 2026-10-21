import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import headerImg from '../assets/header.png?inline'

const NAVY = [1, 33, 71]
const STRIPE = [239, 244, 251]
const BORDER = [210, 222, 238]
const HEADER_RATIO = 252 / 1241 // header.png height / width

const STATUS_COLORS = {
  late: [180, 83, 9],
  'on time': [22, 128, 61],
}

// columns = [['Label', (row) => value], ...]
// info    = optional [['Name', 'Zahra Hasan'], ...] shown in a box under the title
export function downloadPdf(filename, title, subtitle, columns, rows, info = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const headerH = pageW * HEADER_RATIO
  const margin = 14

  // Title
  let y = headerH + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text(title, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, margin, y + 6)
  y += 13

  // Info box
  if (info.length) {
    const perRow = 3
    const rowsN = Math.ceil(info.length / perRow)
    const boxH = 5 + rowsN * 12
    const colW = (pageW - margin * 2) / perRow
    doc.setFillColor(...STRIPE)
    doc.setDrawColor(...BORDER)
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 2, 2, 'FD')
    info.forEach(([label, value], i) => {
      const x = margin + 5 + (i % perRow) * colW
      const yy = y + 7 + Math.floor(i / perRow) * 12
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(110)
      doc.text(String(label).toUpperCase(), x, yy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...NAVY)
      doc.text(String(value ?? '-'), x, yy + 5.5)
    })
    y += boxH + 6
  }

  // Table
  autoTable(doc, {
    startY: y,
    margin: { top: headerH + 8, left: margin, right: margin, bottom: 18 },
    head: [columns.map(([label]) => label)],
    body: rows.map((r) => columns.map(([, fn]) => String(fn(r) ?? ''))),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.8, textColor: [40, 40, 40], lineColor: BORDER },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (d) => {
      if (d.section === 'body' && columns[d.column.index][0] === 'Status') {
        const c = STATUS_COLORS[String(d.cell.raw).toLowerCase()]
        if (c) {
          d.cell.styles.textColor = c
          d.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // Letterhead and footer on every page
  const total = doc.getNumberOfPages()
  const generated = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.addImage(headerImg, 'PNG', 0, 0, pageW, headerH)
    doc.setDrawColor(...BORDER)
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Generated on ${generated} | WorkSphere`, margin, pageH - 7)
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 7, { align: 'right' })
  }

  doc.save(filename)
}