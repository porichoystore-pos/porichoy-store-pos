import React, { useState } from 'react';
import { FiDownload, FiFileText, FiGrid, FiPrinter } from 'react-icons/fi';

const ExportButtons = ({ onExport }) => {
  const [showMenu, setShowMenu] = useState(false);

  const exportOptions = [
    { id: 'csv', name: 'CSV', icon: FiFileText, description: 'Export as CSV file' },
    { id: 'excel', name: 'Excel', icon: FiGrid, description: 'Export as Excel spreadsheet' },
    { id: 'pdf', name: 'PDF', icon: FiPrinter, description: 'Export as PDF document' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
      >
        <FiDownload className="mr-2" />
        Export
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-1 z-10">
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onExport(option.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3"
            >
              <option.icon className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{option.name}</p>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportButtons;