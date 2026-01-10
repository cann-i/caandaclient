import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoCard } from '../../components/ui/BentoGrid';
import {
  Users,
  Folder,
  CreditCard,
  ClipboardList,
  ChevronRight,
  BarChart2
} from 'lucide-react';

function Reports({ showToast }) {
  const navigate = useNavigate();

  const reports = [
    {
      title: 'Client Report',
      description: 'Comprehensive client information and statistics',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      path: '/reports/client'
    },
    {
      title: 'Document Report',
      description: 'Document management and filing reports',
      icon: Folder,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      path: '/reports/document'
    },
    {
      title: 'Payment Report',
      description: 'Payment tracking and financial reports',
      icon: CreditCard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      path: '/reports/payment'
    },
    {
      title: 'Request Report',
      description: 'Client requests and service reports',
      icon: ClipboardList,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      path: '/reports/request'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
           <BarChart2 size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-primary tracking-tight">Reports Center</h2>
          <p className="text-secondary text-sm">Generate and analyze business metrics.</p>
        </div>
      </div>

      <BentoGrid className="grid-cols-1 md:grid-cols-2">
        {reports.map((report, index) => (
          <BentoCard
            key={report.title}
            delay={index * 0.1}
            className="cursor-pointer hover:border-accent transition-all duration-300 group"
          >
            <div onClick={() => navigate(report.path)} className="flex items-center gap-4 h-full">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${report.bgColor} ${report.borderColor} border`}>
                <report.icon size={28} className={report.color} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors">{report.title}</h3>
                <p className="text-sm text-secondary mt-1 line-clamp-2">{report.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-secondary group-hover:bg-accent group-hover:text-white transition-all">
                <ChevronRight size={16} />
              </div>
            </div>
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  );
}

export default Reports;
