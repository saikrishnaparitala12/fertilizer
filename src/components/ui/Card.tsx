interface CardProps { children: React.ReactNode; className?: string; padding?: boolean }

export function Card({ children, className = '', padding = true }: CardProps) {
  return <div className={`card ${padding ? 'p-6' : ''} ${className}`}>{children}</div>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold leading-tight text-gray-900 tabular-nums [overflow-wrap:anywhere]">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
