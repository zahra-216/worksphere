import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// columns = [['Label', (row) => value], ...]
export function downloadPdf(filename, title, subtitle, columns, rows) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('TT Metro Campus - WorkSphere', 14, 16)
  doc.setFontSize(12)
  doc.text(title, 14, 24)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(subtitle, 14, 30)
  autoTable(doc, {
    startY: 36,
    head: [columns.map(([label]) => label)],
    body: rows.map((r) => columns.map(([, fn]) => String(fn(r) ?? ''))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [1, 33, 71] },
  })
  doc.save(filename)
}