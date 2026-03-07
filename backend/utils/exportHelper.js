const fs = require('fs');
const path = require('path');
const excel = require('excel4node');

// Export to CSV
const exportToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]?.toString() || '';
      return `"${value.replace(/"/g, '""')}"`; // Escape quotes
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

// Export to Excel using excel4node
const exportToExcel = (data, sheetName = 'Sheet1') => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new instance of a Workbook class
      const workbook = new excel.Workbook();
      
      // Add Worksheets to the workbook
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length === 0) {
        // Return empty workbook buffer
        workbook.writeToBuffer().then(resolve).catch(reject);
        return;
      }

      // Add headers
      const headers = Object.keys(data[0]);
      headers.forEach((header, index) => {
        worksheet.cell(1, index + 1)
          .string(header)
          .style({
            font: {
              bold: true,
              color: '#FFFFFF'
            },
            fill: {
              type: 'pattern',
              patternType: 'solid',
              bgColor: '#3B82F6',
              fgColor: '#3B82F6'
            }
          });
      });

      // Add data rows
      data.forEach((item, rowIndex) => {
        headers.forEach((header, colIndex) => {
          const value = item[header] || '';
          const cell = worksheet.cell(rowIndex + 2, colIndex + 1);
          
          // Check if value is number
          if (typeof value === 'number') {
            cell.number(value);
          } else {
            cell.string(value.toString());
          }
        });
      });

      // Auto-size columns
      headers.forEach((_, index) => {
        worksheet.column(index + 1).setWidth(15);
      });

      // Generate buffer
      workbook.writeToBuffer()
        .then(resolve)
        .catch(reject);
        
    } catch (error) {
      reject(error);
    }
  });
};

// Export to PDF (placeholder - you'd use PDFKit)
const exportToPDF = async (data, title = 'Report') => {
  // This is a placeholder. In production, use PDFKit
  return Buffer.from('PDF content placeholder');
};

module.exports = {
  exportToCSV,
  exportToExcel,
  exportToPDF
};