import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface DarkModeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  showLabel = true,
  size = 'md'
}) => {
  const { isDark, toggle } = useDarkMode();

  const sizes = {
    sm: { container: 'w-10 h-6', circle: 'w-4 h-4', translate: 'translate-x-4' },
    md: { container: 'w-12 h-7', circle: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { container: 'w-14 h-8', circle: 'w-6 h-6', translate: 'translate-x-6' },
  };

  const currentSize = sizes[size];

  return (
    <div className="flex items-center justify-between">
      {showLabel && (
        <div className="flex items-center gap-2">
          {isDark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDark ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        </div>
      )}

      <button
        onClick={toggle}
        className={`relative inline-flex ${currentSize.container} items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isDark ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
      >
        <span
          className={`${currentSize.circle} inline-block transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
            isDark ? currentSize.translate : 'translate-x-1'
          }`}
        >
          <span className="flex items-center justify-center h-full">
            {isDark ? (
              <Moon size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} className="text-indigo-600" />
            ) : (
              <Sun size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} className="text-amber-500" />
            )}
          </span>
        </span>
      </button>
    </div>
  );
};

export const DarkModeToggleCompact: React.FC = () => {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun size={20} className="text-amber-400" />
      ) : (
        <Moon size={20} className="text-gray-600" />
      )}
    </button>
  );
};
