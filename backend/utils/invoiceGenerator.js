const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');

// Convert a Cloudinary URL to a PDFKit-compatible format (PNG)
const normalizeLogoUrl = (url) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (!/\/image\/upload\/[^/]*f_/.test(url)) {
      return url.replace('/image/upload/', '/image/upload/f_png,w_200/');
    }
  }
  return url;
};

// Download an image from URL and return a Buffer
const fetchImageBuffer = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    if (url.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', url.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        return resolve(fs.readFileSync(localPath));
      }
      return resolve(null);
    }

    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchImageBuffer(res.headers.location).then(resolve);
        }
        if (res.statusCode !== 200) return resolve(null);
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', () => resolve(null));
  });
};

const drawDivider = (doc) => {
  doc.moveDown(0.4);
  const y = doc.y;
  doc
    .strokeColor('#999999')
    .lineWidth(0.5)
    .dash(2, { space: 2 })
    .moveTo(15, y)
    .lineTo(287, y)
    .stroke()
    .undash();
  doc.moveDown(0.4);
};

const drawSolidDivider = (doc) => {
  doc.moveDown(0.3);
  const y = doc.y;
  doc
    .strokeColor('#333333')
    .lineWidth(0.7)
    .moveTo(15, y)
    .lineTo(287, y)
    .stroke();
  doc.moveDown(0.3);
};

const formatAmount = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toFixed(2)}`;
};

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// ============================================================
// Single source of truth for the receipt layout.
// Renders into `doc` and returns the final `doc.y` position.
// Called twice: once to measure, once to actually produce the PDF.
// ============================================================
const renderReceiptContent = (doc, bill, settings, logoBuffer) => {
  const contentLeft = 15;
  const contentRight = 287;
  const contentWidth = contentRight - contentLeft;

  let headerY = 18;

  // ---------- HEADER: Logo + Store Name (centered as a group) ----------
  const logoBoxSize = 32;
  const logoGap = 8;
  const storeName = settings.storeName || 'Porichoy Store';
  const storeNameFontSize = 15;

  if (logoBuffer) {
    try {
      const img = doc.openImage(logoBuffer);
      const aspect = img.width / img.height;

      let logoW = logoBoxSize;
      let logoH = logoBoxSize;
      if (aspect > 1) {
        logoH = logoBoxSize / aspect;
      } else {
        logoW = logoBoxSize * aspect;
      }

      doc.fontSize(storeNameFontSize).font('Helvetica-Bold');
      const storeNameWidth = doc.widthOfString(storeName);

      const groupWidth = logoW + logoGap + storeNameWidth;
      const groupStartX = contentLeft + (contentWidth - groupWidth) / 2;

      const logoY = headerY;

      doc.image(logoBuffer, groupStartX, logoY, {
        width: logoW,
        height: logoH
      });

      const storeNameY = logoY + (logoH - storeNameFontSize) / 2;

      doc
        .fontSize(storeNameFontSize)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(storeName, groupStartX + logoW + logoGap, storeNameY, {
          width: storeNameWidth + 2,
          align: 'left'
        });

      headerY = logoY + Math.max(logoH, storeNameFontSize) + 8;
    } catch {
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(storeName, contentLeft, headerY, {
          width: contentWidth,
          align: 'center'
        });
      headerY = doc.y + 3;
    }
  } else {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(storeName, contentLeft, headerY, {
        width: contentWidth,
        align: 'center'
      });
    headerY = doc.y + 3;
  }

  // Address — single line
  if (settings.address) {
    const oneLineAddress = settings.address
      .split(/[,\n]/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(', ');

    doc.fontSize(8).font('Helvetica').fillColor('#333333');
    doc.text(oneLineAddress, contentLeft, headerY, {
      width: contentWidth,
      align: 'center'
    });
    headerY = doc.y;
  }

  // Phone + Email on one line
  const contactParts = [];
  if (settings.phone) contactParts.push(`Ph: ${settings.phone}`);
  if (settings.email) contactParts.push(settings.email);
  if (contactParts.length > 0) {
    doc.fontSize(8).font('Helvetica').fillColor('#333333');
    doc.text(contactParts.join(' | '), contentLeft, headerY, {
      width: contentWidth,
      align: 'center'
    });
    headerY = doc.y;
  }

  doc.y = headerY;

  // ---------- BILL INFO ----------
  drawDivider(doc);

  const infoY = doc.y;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
  doc.text(`Bill: #${bill.billNumber}`, contentLeft, infoY, {
    width: contentWidth / 2
  });
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  doc.text(formatDate(bill.createdAt), contentLeft + contentWidth / 2, infoY + 1, {
    width: contentWidth / 2,
    align: 'right'
  });

  doc.y = infoY + 14;

  let customerName = 'Walk-in Customer';
  let customerPhone = '';

  if (bill.customer) {
    customerName = bill.customer.name || 'Walk-in Customer';
    customerPhone = bill.customer.phone || '';
  } else if (bill.customerInfo) {
    customerName = bill.customerInfo.name || 'Walk-in Customer';
    customerPhone = bill.customerInfo.phone || '';
  }

  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  doc.text(`Cashier: ${bill.createdBy?.username || 'N/A'}`, contentLeft, doc.y, {
    width: contentWidth
  });
  doc.text(
    `Customer: ${customerName}${customerPhone ? ` (${customerPhone})` : ''}`,
    contentLeft,
    doc.y,
    { width: contentWidth }
  );

  // ---------- ITEMS TABLE ----------
  drawDivider(doc);

  const colItemLeft = contentLeft;
  const colItemWidth = 130;
  const colQtyRight = contentLeft + 175;
  const colRateRight = contentLeft + 220;
  const colAmountRight = contentRight;

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
  const headerRowY = doc.y;
  doc.text('ITEM', colItemLeft, headerRowY, { width: colItemWidth });
  doc.text('QTY', colQtyRight - 25, headerRowY, { width: 25, align: 'right' });
  doc.text('RATE', colRateRight - 40, headerRowY, { width: 40, align: 'right' });
  doc.text('AMOUNT', colAmountRight - 55, headerRowY, { width: 55, align: 'right' });

  doc.y = headerRowY + 12;

  doc
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .moveTo(contentLeft, doc.y)
    .lineTo(contentRight, doc.y)
    .stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(8).fillColor('#000000');
  for (const item of bill.items) {
    const price = Number(item.price) || 0;
    const subtotal = Number(item.subtotal) || 0;
    const itemName = item.name || 'Item';

    const rowStartY = doc.y;

    doc.text(itemName, colItemLeft, rowStartY, {
      width: colItemWidth,
      align: 'left'
    });

    const nameBottomY = doc.y;

    doc.text(String(item.quantity), colQtyRight - 25, rowStartY, {
      width: 25,
      align: 'right'
    });
    doc.text(price.toFixed(2), colRateRight - 40, rowStartY, {
      width: 40,
      align: 'right'
    });
    doc.text(subtotal.toFixed(2), colAmountRight - 55, rowStartY, {
      width: 55,
      align: 'right'
    });

    doc.y = Math.max(nameBottomY, rowStartY + 10) + 2;
  }

  // ---------- TOTALS ----------
  drawDivider(doc);

  const labelX = contentLeft + 140;
  const labelWidth = 60;
  const valueRight = contentRight;
  const valueWidth = 75;

  const drawTotalRow = (label, value, bold = false, fontSize = 8) => {
    const y = doc.y;
    doc
      .fontSize(fontSize)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(bold ? '#000000' : '#333333');
    doc.text(label, labelX, y, { width: labelWidth, align: 'right' });
    doc.text(value, valueRight - valueWidth, y, {
      width: valueWidth,
      align: 'right'
    });
    doc.y = y + fontSize + 3;
  };

  drawTotalRow('Subtotal', formatAmount(bill.subtotal));

  if (Number(bill.taxTotal) > 0) {
    drawTotalRow('Tax', formatAmount(bill.taxTotal));
  }

  if (Number(bill.discount) > 0) {
    drawTotalRow('Discount', `- ${formatAmount(bill.discount)}`);
  }

  drawSolidDivider(doc);

  const totalY = doc.y;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('TOTAL', labelX - 10, totalY, {
    width: labelWidth + 10,
    align: 'right'
  });
  doc.text(formatAmount(bill.total), valueRight - valueWidth, totalY, {
    width: valueWidth,
    align: 'right'
  });
  doc.y = totalY + 16;

  // ---------- PAYMENT METHOD ----------
  const paymentMethod = bill.payments?.[0]?.method || 'cash';
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  doc.text(
    `Paid via: ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`,
    contentLeft,
    doc.y,
    { width: contentWidth, align: 'center' }
  );

  // ---------- FOOTER ----------
  doc.moveDown(1.2);

  const footer = settings.receiptFooter || 'Thank you for shopping with us!';
  footer.split('\n').forEach((line, i) => {
    doc
      .fontSize(i === 0 ? 9 : 8)
      .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor('#333333')
      .text(line.trim(), contentLeft, doc.y, {
        width: contentWidth,
        align: 'center'
      });
  });

  doc.moveDown(0.5);
  doc
    .fontSize(7)
    .font('Helvetica')
    .fillColor('#999999')
    .text('Powered by Porichoy POS', contentLeft, doc.y, {
      width: contentWidth,
      align: 'center'
    });

  // Return the current Y cursor — this is the actual content bottom.
  return doc.y;
};

const generateInvoicePDF = async (bill) => {
  const settings = await Setting.getSingleton();

  const normalizedLogoUrl = normalizeLogoUrl(settings.logo);
  const logoBuffer = normalizedLogoUrl
    ? await fetchImageBuffer(normalizedLogoUrl)
    : null;

  // ============================================================
  // PASS 1 — Measure the content height on a very tall page
  // ============================================================
  const measureDoc = new PDFDocument({
    size: [302, 5000],
    margin: 12,
    autoFirstPage: true
  });
  // Discard output — we only need the Y cursor
  measureDoc.on('data', () => {});

  const contentBottomY = renderReceiptContent(measureDoc, bill, settings, logoBuffer);
  measureDoc.end();

  // ============================================================
  // PASS 2 — Render into a page whose height matches the content
  // ============================================================
  const bottomPadding = 14;
  const exactHeight = Math.max(Math.ceil(contentBottomY + bottomPadding), 150);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [302, exactHeight],
        margin: 12
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      renderReceiptContent(doc, bill, settings, logoBuffer);
      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF
};