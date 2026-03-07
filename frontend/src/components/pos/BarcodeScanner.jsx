import React, { useState } from 'react';
import QrScanner from 'react-qr-barcode-scanner';
import { FiCamera, FiX } from 'react-icons/fi';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);

  const handleScan = (err, result) => {
    if (result) {
      onScan(result.text);
    }
    if (err) {
      setError('Failed to access camera. Please check permissions.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center">
            <FiCamera className="mr-2" />
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <QrScanner
                  onUpdate={handleScan}
                  width={400}
                  height={300}
                  facingMode="environment"
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="absolute inset-0 border-2 border-primary-500 m-8 rounded-lg"></div>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Position barcode within the frame to scan automatically
              </p>
              <div className="flex justify-center mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;