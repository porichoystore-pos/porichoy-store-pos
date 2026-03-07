import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle } from 'react-icons/fi';

const Toast = ({ type, message, onClose }) => {
  const icons = {
    success: <FiCheckCircle className="w-5 h-5 text-green-400" />,
    error: <FiXCircle className="w-5 h-5 text-red-400" />,
    warning: <FiAlertCircle className="w-5 h-5 text-yellow-400" />,
    info: <FiInfo className="w-5 h-5 text-blue-400" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800',
    warning: 'bg-yellow-50 text-yellow-800',
    info: 'bg-blue-50 text-blue-800'
  };

  return (
    <div className={`fixed top-20 right-4 z-50 rounded-lg p-4 shadow-lg ${colors[type]}`}>
      <div className="flex items-center">
        {icons[type]}
        <p className="ml-3 text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-4">
          <FiXCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;