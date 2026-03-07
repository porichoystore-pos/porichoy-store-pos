const PDFDocument = require('pdfkit');

const generateInvoicePDF = async (bill) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document with dynamic height
      const doc = new PDFDocument({ 
        size: [ 302, 1000 ], // 80mm width, extra height (will be trimmed)
        margin: 12,
        bufferPages: true
      });
      
      const buffers = [];
      let contentHeight = 0;
      const startY = doc.y;
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Store Information
      doc.fontSize(16).font('Helvetica-Bold').text('PORICHOY STORE', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica').text('Mirhat, Indian Market, Baidyaipur', { align: 'center' });
      doc.fontSize(8).text('Purba Bardhaman, 713122', { align: 'center' });
      doc.fontSize(8).text('Phone: 6296352881', { align: 'center' });
      
      // Divider
      doc.moveDown(0.3);
      doc.fontSize(8).text('----------------------------------------', { align: 'center' });
      
      // Bill Info
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica-Bold').text(`Bill No: #${bill.billNumber}`);
      
      // Format date properly
      const billDate = new Date(bill.createdAt);
      const formattedDate = billDate.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      doc.fontSize(8).font('Helvetica').text(`Date: ${formattedDate}`);
      doc.fontSize(8).text(`Cashier: ${bill.createdBy?.username || 'N/A'}`);
      
      // Customer Info
      doc.moveDown(0.2);
      let customerName = 'Walk-in Customer';
      let customerPhone = '';
      
      if (bill.customer) {
        customerName = bill.customer.name || 'Walk-in Customer';
        customerPhone = bill.customer.phone || '';
      } else if (bill.customerInfo) {
        customerName = bill.customerInfo.name || 'Walk-in Customer';
        customerPhone = bill.customerInfo.phone || '';
      }
      
      doc.fontSize(8).text(`Customer: ${customerName}`);
      if (customerPhone) {
        doc.fontSize(8).text(`Phone: ${customerPhone}`);
      }

      // Divider
      doc.moveDown(0.2);
      doc.fontSize(8).text('----------------------------------------', { align: 'center' });

      // Table Header
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica-Bold');
      
      // Column positions - adjusted for better space utilization
      const startTableY = doc.y;
      const colItem = 15;
      const colQty = 145;
      const colRate = 185;
      const colAmount = 235;
      
      doc.text('Item', colItem, startTableY);
      doc.text('Qty', colQty, startTableY, { width: 25, align: 'right' });
      doc.text('Rate', colRate, startTableY, { width: 35, align: 'right' });
      doc.text('Amount', colAmount, startTableY, { width: 45, align: 'right' });
      
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica');

      // Items - Show FULL product names with proper wrapping
      let currentY = doc.y;
      for (const item of bill.items) {
        // Ensure prices are numbers
        const price = Number(item.price);
        const subtotal = Number(item.subtotal);
        
        // Product name - FULL NAME with wrapping
        const itemName = item.name;
        
        // Calculate height needed for item name
        const nameWidth = 120; // Width available for item name
        const nameLines = Math.ceil(doc.widthOfString(itemName) / nameWidth);
        const lineHeight = 12; // Height per line
        
        // Write item name with wrapping (full name)
        doc.text(itemName, colItem, currentY, { 
          width: nameWidth,
          align: 'left',
          lineBreak: true
        });
        
        // Get the Y position after writing the name
        const nameEndY = doc.y;
        
        // Write quantity, rate, and amount aligned with the first line
        doc.text(item.quantity.toString(), colQty, currentY, { width: 25, align: 'right' });
        doc.text(`Rs. ${price}`, colRate, currentY, { width: 35, align: 'right' });
        doc.text(`Rs. ${subtotal}`, colAmount, currentY, { width: 45, align: 'right' });
        
        // Move to next item position
        currentY = nameEndY + 3;
        doc.y = currentY;
      }

      doc.y = currentY;

      // Divider
      doc.moveDown(0.3);
      doc.fontSize(8).text('----------------------------------------', { align: 'center' });

      // Totals - Compact layout
      doc.moveDown(0.2);
      const rightCol = 180;
      
      doc.fontSize(8).font('Helvetica');
      
      // Subtotal
      doc.text('Subtotal:', rightCol, doc.y, { continued: true });
      doc.text(` Rs. ${Number(bill.subtotal)}`, { align: 'right' });
      
      // Tax (only if > 0)
      if (Number(bill.taxTotal) > 0) {
        doc.moveDown(0.2);
        doc.text('Tax:', rightCol, doc.y, { continued: true });
        doc.text(` Rs. ${Number(bill.taxTotal)}`, { align: 'right' });
      }
      
      // Discount (only if > 0)
      if (Number(bill.discount) > 0) {
        doc.moveDown(0.2);
        doc.text('Discount:', rightCol, doc.y, { continued: true });
        doc.text(` Rs. ${Number(bill.discount)}`, { align: 'right' });
      }
      
      // Divider before total
      doc.moveDown(0.2);
      doc.fontSize(8).text('----------------------------------------', { align: 'center' });
      
      // Grand Total
      doc.moveDown(0.2);
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('TOTAL:', rightCol, doc.y, { continued: true });
      doc.text(` Rs. ${Number(bill.total)}`, { align: 'right' });

      // Footer - Centered with less spacing
      doc.moveDown(1);
      doc.fontSize(9).font('Helvetica').text('Thank you for shopping with us!', { align: 'center' });
      doc.fontSize(8).text('Visit again soon', { align: 'center' });

      // Calculate content height and trim PDF
      contentHeight = doc.y - startY;
      
      // End the document
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