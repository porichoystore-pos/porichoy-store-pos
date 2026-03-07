import { useState, useRef } from 'react';
import QrScanner from 'react-qr-barcode-scanner';

export const useBarcodeScanner = (onDetected) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  const startScanning = () => {
    setIsScanning(true);
    setError(null);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleScan = (data) => {
    if (data) {
      onDetected(data.text);
      stopScanning();
    }
  };

  const handleError = (err) => {
    console.error('Scanner error:', err);
    setError('Failed to access camera');
    stopScanning();
  };

  const BarcodeScanner = () => {
    if (!isScanning) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-4 rounded-xl max-w-lg w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Scan Barcode</h3>
            <button
              onClick={stopScanning}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="relative">
            <QrScanner
              onUpdate={(err, result) => {
                if (result) handleScan(result);
                if (err) handleError(err);
              }}
              width={400}
              height={300}
              facingMode="environment"
            />
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Position barcode within the frame to scan
          </p>
        </div>
      </div>
    );
  };

  return {
    isScanning,
    error,
    startScanning,
    stopScanning,
    BarcodeScanner
  };
};

// Alternative simpler scanner component
export const SimpleBarcodeScanner = ({ onScan, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <QrScanner
          onUpdate={(err, result) => {
            if (result) {
              onScan(result.text);
              onClose();
            }
          }}
          width={400}
          height={300}
          facingMode="environment"
        />
      </div>
    </div>
  );
};