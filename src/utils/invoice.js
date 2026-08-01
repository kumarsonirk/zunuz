import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dark (color-inverted) ZUNUZ wordmark, embedded inline so it renders on this
// invoice's light/cream background — the site's own logo_white.png is only
// legible on dark backgrounds. Generated once via sharp's negate().
const LOGO_DARK_PNG = 'data:image/png;base64,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';

// jsPDF's built-in fonts don't include the ₹ glyph (it renders as a blank
// box without embedding a custom Unicode font) — "Rs." is the reliable
// fallback used throughout this invoice instead.
function rs(amount) {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

const CREAM = '#FEF5E7';
const INK = '#1F2024';
const MUTED = '#71717A';
const RULE = '#D8CBB0';

// Builds the jsPDF document for one order. Works from either the customer's
// own order list (no `order.customer`, name/phone come from `order.address`)
// or the admin order list (`order.customer` present). Split out from
// downloadInvoice() so a plain Node script can render + inspect the PDF
// without a browser (jsPDF itself runs fine in Node; only doc.save() below
// needs one).
export function buildInvoiceDoc(order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const rightEdge = pageWidth - margin;

  // Cream page background, matching the storefront's own product-photo backdrop.
  doc.setFillColor(CREAM);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logo (top-left) + "INVOICE" heading (top-right), on the same baseline.
  const logoWidth = 48;
  const logoHeight = logoWidth * (81 / 410); // matches the source PNG's aspect ratio
  doc.addImage(LOGO_DARK_PNG, 'PNG', margin, 16, logoWidth, logoHeight);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(INK);
  // jsPDF's `align: 'right'` miscalculates width when combined with
  // `charSpace`, landing short of the true right margin — using literal
  // spaces between letters instead gets the tracked-out look without that
  // alignment bug, so it lines up flush with "Invoice No." below it.
  doc.text('I N V O I C E', rightEdge, 26, { align: 'right' });

  // Billed-to (left) + invoice meta (right)
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const addr = order.address || {};

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('BILLED TO:', margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  const billToLines = [
    addr.name || order.customer?.name || 'Customer',
    [addr.houseNo, addr.street].filter(Boolean).join(', '),
    addr.landmark ? `Near ${addr.landmark}` : '',
    [addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);
  doc.text(billToLines, margin, 52);

  doc.setTextColor(INK);
  doc.text(`Invoice No. INV-${order.id}`, rightEdge, 46, { align: 'right' });
  doc.setTextColor(MUTED);
  doc.text(orderDate, rightEdge, 51.5, { align: 'right' });

  // Minimal, line-based item table (no grid boxes) — header row with a
  // bottom rule, thin separators between rows, nothing else.
  const rows = (order.items || []).map(item => [
    item.product?.name || 'Product',
    String(item.quantity),
    rs(item.price),
    rs(item.quantity * item.price),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['Item', 'Quantity', 'Unit Price', 'Total']],
    body: rows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, textColor: INK, cellPadding: { top: 4, bottom: 4, left: 0, right: 4 } },
    headStyles: { fontStyle: 'bold', textColor: INK, lineWidth: { bottom: 0.4 }, lineColor: INK },
    bodyStyles: { lineWidth: { bottom: 0.2 }, lineColor: RULE },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
  });

  // Right-aligned summary — subtotal / delivery / grand total.
  const itemsSubtotal = (order.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = order.total - itemsSubtotal;
  const labelX = rightEdge - 50;

  let y = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('Subtotal', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  doc.text(rs(itemsSubtotal), rightEdge, y, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(INK);
  doc.text('Delivery Fee', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  doc.text(deliveryFee > 0 ? rs(deliveryFee) : 'Free', rightEdge, y, { align: 'right' });

  y += 6;
  doc.setDrawColor(INK);
  doc.setLineWidth(0.4);
  doc.line(labelX, y, rightEdge, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text('Total', labelX, y);
  doc.text(rs(order.total), rightEdge, y, { align: 'right' });

  // Thank-you note
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(INK);
  doc.text('Thank you!', margin, y);

  // Payment details (bottom-left) + brand sign-off (bottom-right)
  const footerY = pageHeight - 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('PAYMENT DETAILS', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  const paymentLines = [
    order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment (Razorpay)',
  ];
  if (order.razorpayPaymentId) paymentLines.push(`Payment ID: ${order.razorpayPaymentId}`);
  doc.text(paymentLines, margin, footerY + 5.5);

  doc.setFont('times', 'italic');
  doc.setFontSize(15);
  doc.setTextColor(INK);
  doc.text('ZUNUZ', rightEdge, footerY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text('support@zunuz.in', rightEdge, footerY + 5.5, { align: 'right' });

  return doc;
}

export function downloadInvoice(order) {
  buildInvoiceDoc(order).save(`Zunuz-Invoice-${order.id}.pdf`);
}
