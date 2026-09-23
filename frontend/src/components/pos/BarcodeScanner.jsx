import React, { useState, useEffect } from 'react';
import QrScanner from 'react-qr-barcode-scanner';
import { FiCamera, FiX, FiEdit3 } from 'react-icons/fi';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleScan = (err, result) => {
    if (result) {
      onScan(result.text);
    }
    if (err) {
      setError('Unable to access the camera. You can type the barcode manually instead.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-backdrop" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl animate-modal mt-auto sm:mt-0 sm:my-auto pb-safe">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-gray-100">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <FiCamera className="text-primary-600" />
            Scan Barcode
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Close scanner">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Camera view */}
          {!error && !showManual && (
            <>
              <div className="relative bg-black rounded-xl overflow-hidden">
                <QrScanner
                  onUpdate={handleScan}
                  width={400}
                  height={280}
                  facingMode="environment"
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-4/5 h-24 border-2 border-primary-500 rounded-lg" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 text-center">
                Point the camera at a barcode — it will be added automatically
              </p>
            </>
          )}

          {/* Camera error */}
          {error && !showManual && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Manual entry (fallback / toggle) */}
          {(showManual || error) && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type barcode number..."
                className="input-field flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary" disabled={!manualCode.trim()}>
                Add
              </button>
            </form>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-2">
            {!showManual && !error && (
              <button onClick={() => setShowManual(true)} className="btn-ghost btn-sm">
                <FiEdit3 className="w-4 h-4" />
                Enter manually
              </button>
            )}
            {showManual && !error && (
              <button onClick={() => setShowManual(false)} className="btn-ghost btn-sm">
                <FiCamera className="w-4 h-4" />
                Back to camera
              </button>
            )}
            <button onClick={onClose} className="btn-secondary btn-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
