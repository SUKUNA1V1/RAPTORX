/**
 * Advanced Filtering & Saved Views System
 * Provides filter management, persistence, and reusable filter presets
 */

import { useState, useCallback } from 'react';

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: string | number | string[] | [number, number];
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: FilterCondition[];
  isQuickAccess?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  conditions: FilterCondition[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export class FilterManager {
  private storageKey = 'raptor_saved_filters';
  private filters: Map<string, SavedFilter> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load saved filters from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.filters = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Failed to load filters from storage:', error);
    }
  }

  /**
   * Save filters to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.filters);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save filters to storage:', error);
    }
  }

  /**
   * Create a new saved filter
   */
  saveFilter(
    name: string,
    conditions: FilterCondition[],
    description?: string,
    isQuickAccess?: boolean
  ): SavedFilter {
    const id = `filter_${Date.now()}`;
    const now = new Date().toISOString();

    const filter: SavedFilter = {
      id,
      name,
      description,
      filters: conditions,
      isQuickAccess: isQuickAccess ?? false,
      createdAt: now,
      updatedAt: now,
    };

    this.filters.set(id, filter);
    this.saveToStorage();

    return filter;
  }

  /**
   * Update an existing filter
   */
  updateFilter(
    id: string,
    updates: Partial<Omit<SavedFilter, 'id' | 'createdAt'>>
  ): SavedFilter | null {
    const filter = this.filters.get(id);
    if (!filter) return null;

    const updated: SavedFilter = {
      ...filter,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.filters.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete a saved filter
   */
  deleteFilter(id: string): boolean {
    const deleted = this.filters.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Get all saved filters
   */
  getAllFilters(): SavedFilter[] {
    return Array.from(this.filters.values());
  }

  /**
   * Get quick access filters (pinned filters)
   */
  getQuickAccessFilters(): SavedFilter[] {
    return Array.from(this.filters.values()).filter((f) => f.isQuickAccess);
  }

  /**
   * Get a filter by ID
   */
  getFilter(id: string): SavedFilter | null {
    return this.filters.get(id) ?? null;
  }

  /**
   * Toggle quick access for a filter
   */
  toggleQuickAccess(id: string): SavedFilter | null {
    const filter = this.filters.get(id);
    if (!filter) return null;

    return this.updateFilter(id, {
      isQuickAccess: !filter.isQuickAccess,
    });
  }

  /**
   * Apply a filter to data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyFilter<T extends Record<string, any>>(
    data: T[],
    conditions: FilterCondition[]
  ): T[] {
    return data.filter((item) => {
      return conditions.every((condition) => {
        const itemValue = item[condition.field];

        switch (condition.operator) {
          case 'equals':
            return itemValue === condition.value;

          case 'contains':
            return String(itemValue)
              .toLowerCase()
              .includes(String(condition.value).toLowerCase());

          case 'gt':
            return Number(itemValue) > Number(condition.value as string | number);

          case 'lt':
            return Number(itemValue) < Number(condition.value as string | number);

          case 'gte':
            return Number(itemValue) >= Number(condition.value as string | number);

          case 'lte':
            return Number(itemValue) <= Number(condition.value as string | number);

          case 'in':
            return Array.isArray(condition.value) &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (condition.value as any[]).includes(itemValue);

          case 'between':
            if (Array.isArray(condition.value) && condition.value.length === 2) {
              const [min, max] = condition.value as (string | number)[];
              return Number(itemValue) >= Number(min) && Number(itemValue) <= Number(max);
            }
            return false;

          default:
            return true;
        }
      });
    });
  }

  /**
   * Parse query string to filter conditions
   */
  static parseQueryString(query: string): FilterCondition[] {
    // Simple parser for query syntax like: status:active risk:>0.5
    const conditions: FilterCondition[] = [];

    const parts = query.split(/\s+/);
    for (const part of parts) {
      if (!part.includes(':')) continue;

      const [field, valueStr] = part.split(':');
      let operator: FilterCondition['operator'] = 'contains';
      let value: string | number | boolean = valueStr;

      if (valueStr.startsWith('>=')) {
        operator = 'gte';
        value = parseFloat(valueStr.substring(2));
      } else if (valueStr.startsWith('<=')) {
        operator = 'lte';
        value = parseFloat(valueStr.substring(2));
      } else if (valueStr.startsWith('>')) {
        operator = 'gt';
        value = parseFloat(valueStr.substring(1));
      } else if (valueStr.startsWith('<')) {
        operator = 'lt';
        value = parseFloat(valueStr.substring(1));
      } else if (valueStr === 'true' || valueStr === 'false') {
        value = valueStr === 'true' ? 'true' : 'false';
      }

      conditions.push({ field, operator, value });
    }

    return conditions;
  }

  /**
   * Generate query string from conditions
   */
  static generateQueryString(conditions: FilterCondition[]): string {
    return conditions
      .map((c) => {
        let op = '';
        if (c.operator === 'gt') op = '>';
        else if (c.operator === 'gte') op = '>=';
        else if (c.operator === 'lt') op = '<';
        else if (c.operator === 'lte') op = '<=';

        return `${c.field}:${op}${c.value}`;
      })
      .join(' ');
  }
}

// Singleton instance
let filterManager: FilterManager | null = null;

/**
 * Get or create filter manager instance
 */
export function getFilterManager(): FilterManager {
  if (!filterManager) {
    filterManager = new FilterManager();
  }
  return filterManager;
}

/**
 * React hook for filter management
 */
export function useAdvancedFilter(initialConditions: FilterCondition[] = []) {
  const manager = getFilterManager();
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialConditions
  );
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(
    manager.getAllFilters()
  );

  const addCondition = useCallback((condition: FilterCondition) => {
    setConditions((prev) => [...prev, condition]);
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCondition = useCallback(
    (index: number, updates: Partial<FilterCondition>) => {
      setConditions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      });
    },
    []
  );

  const clearConditions = useCallback(() => {
    setConditions([]);
  }, []);

  const saveCurrentFilter = useCallback(
    (name: string, description?: string) => {
      const saved = manager.saveFilter(name, conditions, description);
      setSavedFilters(manager.getAllFilters());
      return saved;
    },
    [conditions, manager]
  );

  const deleteSavedFilter = useCallback(
    (id: string) => {
      manager.deleteFilter(id);
      setSavedFilters(manager.getAllFilters());
    },
    [manager]
  );

  const applySavedFilter = useCallback((id: string) => {
    const filter = manager.getFilter(id);
    if (filter) {
      setConditions(filter.filters);
    }
  }, [manager]);

  const toggleQuickAccess = useCallback((id: string) => {
    manager.toggleQuickAccess(id);
    setSavedFilters(manager.getAllFilters());
  }, [manager]);

  return {
    conditions,
    addCondition,
    removeCondition,
    updateCondition,
    clearConditions,
    saveCurrentFilter,
    deleteSavedFilter,
    applySavedFilter,
    toggleQuickAccess,
    savedFilters,
    quickAccessFilters: manager.getQuickAccessFilters(),
  };
}

export default FilterManager;
