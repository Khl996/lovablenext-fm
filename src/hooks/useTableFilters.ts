import { useState, useMemo } from 'react';

export interface UseTableFiltersOptions<T> {
  searchFields?: (keyof T)[];
  initialFilters?: Record<string, any>;
  initialSortBy?: keyof T;
  initialSortOrder?: 'asc' | 'desc';
}

export interface TableFiltersState {
  searchQuery: string;
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export interface TableFiltersActions {
  setSearchQuery: (query: string) => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
}

export interface UseTableFiltersReturn<T> {
  state: TableFiltersState;
  actions: TableFiltersActions;
  filterData: (data: T[]) => T[];
  hasActiveFilters: boolean;
}

/**
 * Custom hook for managing table filters, search, and sorting
 * 
 * @example
 * ```tsx
 * const { state, actions, filterData, hasActiveFilters } = useTableFilters<WorkOrder>({
 *   searchFields: ['code', 'description', 'issue_type'],
 *   initialFilters: { status: 'all', priority: 'all' },
 * });
 * 
 * const filteredData = filterData(workOrders);
 * ```
 */
export function useTableFilters<T extends Record<string, any>>(
  options: UseTableFiltersOptions<T> = {}
): UseTableFiltersReturn<T> {
  const {
    searchFields = [],
    initialFilters = {},
    initialSortBy,
    initialSortOrder = 'asc',
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<Record<string, any>>(initialFilters);
  const [sortBy, setSortBy] = useState<string | undefined>(initialSortBy as string);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  const setFilter = (key: string, value: any) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  };

  const setFilters = (newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFiltersState(initialFilters);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const setSorting = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const hasActiveFilters = useMemo(() => {
    const hasSearch = searchQuery.trim() !== '';
    const hasFilters = Object.entries(filters).some(([key, value]) => {
      const initialValue = initialFilters[key];
      return value !== initialValue && value !== 'all' && value !== '' && value !== null && value !== undefined;
    });
    return hasSearch || hasFilters;
  }, [searchQuery, filters, initialFilters]);

  const filterData = useMemo(() => {
    return (data: T[]): T[] => {
      let filteredData = [...data];

      // Apply search
      if (searchQuery.trim() !== '' && searchFields.length > 0) {
        const query = searchQuery.toLowerCase().trim();
        filteredData = filteredData.filter(item =>
          searchFields.some(field => {
            const value = item[field];
            if (value == null) return false;
            return String(value).toLowerCase().includes(query);
          })
        );
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          filteredData = filteredData.filter(item => {
            const itemValue = item[key];
            // Handle array values (for multi-select filters)
            if (Array.isArray(value)) {
              return value.includes(itemValue);
            }
            return itemValue === value;
          });
        }
      });

      // Apply sorting
      if (sortBy) {
        filteredData.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];

          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
          if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

          let comparison = 0;
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else {
            comparison = String(aValue).localeCompare(String(bValue));
          }

          return sortOrder === 'asc' ? comparison : -comparison;
        });
      }

      return filteredData;
    };
  }, [searchQuery, filters, searchFields, sortBy, sortOrder]);

  return {
    state: {
      searchQuery,
      filters,
      sortBy,
      sortOrder,
    },
    actions: {
      setSearchQuery,
      setFilter,
      setFilters,
      clearFilters,
      clearSearch,
      setSorting,
      toggleSortOrder,
    },
    filterData,
    hasActiveFilters,
  };
}
