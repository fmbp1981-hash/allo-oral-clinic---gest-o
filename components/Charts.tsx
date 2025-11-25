import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Simple Bar Chart Component
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {title && <h3 className="font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>}
      <div className="flex items-end justify-around gap-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color || 'bg-indigo-500';

          return (
            <div key={index} className="flex flex-col items-center flex-1 group">
              <div className="relative w-full flex items-end justify-center" style={{ height: '100%' }}>
                {/* Value label */}
                <div className="absolute -top-6 text-sm font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.value}
                </div>

                {/* Bar */}
                <div
                  className={`w-full ${color} rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer relative`}
                  style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '4px' : '0' }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.value} {item.label}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="text-xs text-gray-600 mt-2 text-center font-medium truncate w-full">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple Line Chart Component
interface LineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  height?: number;
  color?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 200,
  color = 'indigo',
  trend,
  trendValue
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  // Generate SVG path
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {data[data.length - 1]?.value || 0}
        </div>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.3" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.3" />

          {/* Area under line */}
          <path
            d={`${pathD} L 100,100 L 0,100 Z`}
            fill={`url(#gradient-${color})`}
            opacity="0.2"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color === 'indigo' ? '#4f46e5' : color === 'green' ? '#10b981' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {points.map((point, index) => {
            const [x, y] = point.split(',');
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill={color === 'indigo' ? '#4f46e5' : color === 'green' ? '#10b981' : '#ef4444'}
                className="hover:r-2 transition-all"
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color === 'indigo' ? '#4f46e5' : color === 'green' ? '#10b981' : '#ef4444'} />
              <stop offset="100%" stopColor="white" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
          {data.map((item, index) => {
            if (index === 0 || index === Math.floor(data.length / 2) || index === data.length - 1) {
              return <span key={index}>{item.label}</span>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

// Stats Card with Mini Chart
interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  data?: number[];
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  data = [],
  color = 'indigo'
}) => {
  const maxValue = Math.max(...data);
  const barHeights = data.map(d => (d / maxValue) * 100);

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendValue}
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      )}

      {/* Mini bar chart */}
      {data.length > 0 && (
        <div className="flex items-end gap-0.5 h-8 mt-3">
          {barHeights.map((height, index) => (
            <div
              key={index}
              className={`flex-1 ${color === 'indigo' ? 'bg-indigo-200' : color === 'green' ? 'bg-green-200' : 'bg-orange-200'} rounded-sm transition-all hover:opacity-70`}
              style={{ height: `${height}%`, minHeight: '2px' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Donut Chart Component
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  centerText?: string;
  centerSubtext?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  centerText,
  centerSubtext
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const slices = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const slice = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    };
    currentAngle += angle;
    return slice;
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      {title && <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>}

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="20"
            />

            {slices.map((slice, index) => {
              const startAngle = (slice.startAngle * Math.PI) / 180;
              const endAngle = (slice.endAngle * Math.PI) / 180;

              const x1 = 50 + 40 * Math.cos(startAngle);
              const y1 = 50 + 40 * Math.sin(startAngle);
              const x2 = 50 + 40 * Math.cos(endAngle);
              const y2 = 50 + 40 * Math.sin(endAngle);

              const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={slice.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}

            {/* Center circle */}
            <circle cx="50" cy="50" r="25" fill="white" />
          </svg>

          {/* Center text */}
          {centerText && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-gray-900">{centerText}</div>
              {centerSubtext && (
                <div className="text-xs text-gray-500">{centerSubtext}</div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                <span className="text-xs text-gray-500">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
