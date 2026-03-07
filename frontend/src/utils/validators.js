// Validate email
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Validate phone (Indian)
export const isValidPhone = (phone) => {
  const re = /^[6-9]\d{9}$/;
  return re.test(phone.replace(/\D/g, ''));
};

// Validate GST number
export const isValidGST = (gst) => {
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(gst);
};

// Validate price
export const isValidPrice = (price) => {
  return !isNaN(price) && price >= 0;
};

// Validate stock
export const isValidStock = (stock) => {
  return Number.isInteger(stock) && stock >= 0;
};

// Validate barcode (EAN-13)
export const isValidBarcode = (barcode) => {
  const re = /^\d{12,13}$/;
  return re.test(barcode);
};

// Check if object is empty
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// Validate required fields
export const validateRequired = (data, fields) => {
  const errors = {};
  fields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors[field] = `${field} is required`;
    }
  });
  return errors;
};