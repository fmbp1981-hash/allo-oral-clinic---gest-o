import { useState, useEffect } from 'react';

/**
 * Hook que debounça um valor, atrasando a atualização por um período especificado
 * Útil para otimizar buscas e prevenir requisições excessivas
 *
 * @param value - O valor a ser debouncado
 * @param delay - O delay em milissegundos (padrão: 500ms)
 * @returns O valor debouncado
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // Esta função só será chamada 500ms após o usuário parar de digitar
 *   if (debouncedSearch) {
 *     searchAPI(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout if value changes (also on component unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook que retorna uma versão debouncada de uma função callback
 *
 * @param callback - A função a ser debouncada
 * @param delay - O delay em milissegundos (padrão: 500ms)
 * @returns Uma versão debouncada da função
 *
 * @example
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   searchAPI(term);
 * }, 500);
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
