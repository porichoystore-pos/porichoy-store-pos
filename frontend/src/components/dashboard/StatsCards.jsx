import React from 'react';
import {
  FiPackage,
  FiShoppingCart,
  FiUsers
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import { formatCurrency } from '../../utils/formatters';

const StatsCards = ({ stats }) => {
  const cards = [
    {
      title: 'Today\'s Sales',
      value: formatCurrency(stats.todaySales),
      icon: BiRupee,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      title: 'Today\'s Bills',
      value: stats.todayBills,
      icon: FiShoppingCart,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: FiPackage,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: FiUsers,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">{card.title}</p>
              <p className="text-sm font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`${card.bgColor} p-2 rounded-lg`}>
              <card.icon className={`w-4 h-4 ${card.textColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;