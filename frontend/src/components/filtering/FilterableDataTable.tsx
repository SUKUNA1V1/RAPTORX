/**
 * Filterable Data Table with Advanced Filtering
 * Demonstrates using the filtering system with real data
 */

import React, { useState, useMemo } from 'react';
import { useAdvancedFilter, FilterManager } from '../../lib/filtering';
import {
  FilterBuilder,
  QuickFilters,
  SavedFiltersList,
  SaveFilterDialog,
} from './FilterComponents';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface FilterableDataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render?: (value: any, row: T) => React.ReactNode;
  }>;
  title: string;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FilterableDataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  description,
}: FilterableDataTableProps<T>) {
  const filterManager = new FilterManager();
  const {
    conditions,
    clearConditions,
    saveCurrentFilter,
    deleteSavedFilter,
    applySavedFilter,
    toggleQuickAccess,
    savedFilters,
    quickAccessFilters,
  } = useAdvancedFilter();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Apply filters
  const filteredData = useMemo(() => {
    let result = filterManager.applyFilter(data, conditions);

    // Apply sorting
    if (sortBy) {
      result = result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, conditions, sortBy, sortOrder]);

  const handleSaveFilter = (name: string, description?: string) => {
    saveCurrentFilter(name, description);
    setShowSaveDialog(false);
  };

  const handleSortClick = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (columnKey: string): string => {
    if (sortBy !== columnKey) return ' ⇅';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {/* Quick Filters */}
      {quickAccessFilters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Filters</h3>
          <QuickFilters
            filters={quickAccessFilters}
            onFilterSelect={(filter) => applySavedFilter(filter.id)}
            onToggleFavorite={(id) => toggleQuickAccess(id)}
          />
        </div>
      )}

      {/* Filter Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FilterBuilder
            availableFields={columns.map((col) => ({
              name: col.key,
              type: col.type,
              label: col.label,
            }))}
          />
        </div>

        {/* Saved Filters Panel */}
        <div>
          <SavedFiltersList
            filters={savedFilters}
            onApply={(filter) => applySavedFilter(filter.id)}
            onDelete={(id) => deleteSavedFilter(id)}
            onToggleFavorite={(id) => toggleQuickAccess(id)}
            favoriteIds={quickAccessFilters.map((f) => f.id)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => clearConditions()}
          disabled={conditions.length === 0}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Clear Filters
        </button>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={conditions.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Save Filter
        </button>
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{filteredData.length}</span> of{' '}
          <span className="font-semibold">{data.length}</span> results
          {conditions.length > 0 && (
            <>
              {' '}with <span className="font-semibold">{conditions.length}</span> filter
              {conditions.length !== 1 ? 's' : ''}
            </>
          )}
        </p>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No data matching your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSortClick(column.key)}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    title="Click to sort"
                  >
                    {column.label}
                    <span className="text-gray-400">
                      {getSortIndicator(column.key)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className="px-6 py-4 text-sm text-gray-900"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Save Filter Dialog */}
      <SaveFilterDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveFilter}
      />
    </div>
  );
}

export default FilterableDataTable;
