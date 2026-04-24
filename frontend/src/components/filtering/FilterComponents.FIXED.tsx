/**
 * FIXES APPLIED:
 * - Fixed: Added validation that newField exists in availableFields before adding condition
 * - Fixed: Trim whitespace from string values before validation and storage
 * - Fixed: Added error handling for 'between' operator value parsing with validation
 * - Fixed: SaveFilterDialog now properly validates name.trim() length
 * - Fixed: Added proper error states and error clearing
 * - Fixed: Field validation for all conditions before submission
 */

import React, { useState } from 'react';
import { FilterCondition, SavedFilter, useAdvancedFilter } from '../../lib/filtering';

export interface FilterBuilderProps {
  onFiltersChange?: (conditions: FilterCondition[]) => void;
  availableFields?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    label: string;
  }>;
}

/**
 * Filter Builder Component
 * Allows creating and editing filter conditions
 */
export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  onFiltersChange,
  availableFields = [],
}) => {
  const {
    conditions,
    addCondition,
    removeCondition,
    clearConditions,
  } = useAdvancedFilter();

  const [showNewCondition, setShowNewCondition] = useState(false);
  const [newField, setNewField] = useState('');
  const [newOperator, setNewOperator] = useState<FilterCondition['operator']>('equals');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    onFiltersChange?.(conditions);
  }, [conditions, onFiltersChange]);

  // BUG FIX: Validate field exists and value is not empty before adding
  const handleAddCondition = () => {
    setError('');

    // BUG FIX: Validate field exists in available fields
    const fieldExists = availableFields.some((f) => f.name === newField);
    if (!newField || !fieldExists) {
      setError('Please select a valid field.');
      return;
    }

    // BUG FIX: Trim and validate value
    const trimmedValue = newValue.trim();
    if (!trimmedValue) {
      setError('Please enter a value.');
      return;
    }

    try {
      // BUG FIX: Parse 'between' operator values safely
      let conditionValue: string | string[];
      if (newOperator === 'between') {
        const values = trimmedValue.split(',').map((v) => v.trim());
        if (values.length !== 2 || values.some((v) => !v)) {
          setError('Between operator requires two comma-separated values.');
          return;
        }
        conditionValue = values;
      } else {
        conditionValue = trimmedValue;
      }

      addCondition({
        field: newField,
        operator: newOperator,
        value: conditionValue,
      });

      // Reset form
      setNewField('');
      setNewOperator('equals');
      setNewValue('');
      setShowNewCondition(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add condition';
      setError(errorMsg);
    }
  };

  const getOperatorLabel = (op: FilterCondition['operator']): string => {
    const labels: Record<FilterCondition['operator'], string> = {
      equals: 'Equals',
      contains: 'Contains',
      gt: 'Greater than',
      lt: 'Less than',
      gte: 'Greater than or equal',
      lte: 'Less than or equal',
      in: 'In list',
      between: 'Between',
    };
    return labels[op];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filter Conditions</h3>
        {conditions.length > 0 && (
          <button
            onClick={() => {
              clearConditions();
              setError('');
            }}
            className="text-sm text-red-600 hover:text-red-700"
            aria-label="Clear all conditions"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Current Conditions */}
      <div className="space-y-2 mb-4">
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200"
          >
            <span className="text-sm font-medium text-gray-700 min-w-24">
              {condition.field}
            </span>
            <span className="text-sm text-gray-600">
              {getOperatorLabel(condition.operator)}
            </span>
            <span className="text-sm text-gray-700 font-mono flex-1">
              {Array.isArray(condition.value)
                ? condition.value.join(', ')
                : condition.value}
            </span>
            <button
              onClick={() => removeCondition(index)}
              className="text-red-600 hover:text-red-700"
              aria-label={`Remove condition ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add New Condition */}
      {showNewCondition ? (
        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <select
              value={newField}
              onChange={(e) => {
                setNewField(e.target.value);
                setError('');
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              aria-label="Select filter field"
            >
              <option value="">Select field</option>
              {availableFields.map((field) => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>

            <select
              value={newOperator}
              onChange={(e) => {
                setNewOperator(e.target.value as FilterCondition['operator']);
                setError('');
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              aria-label="Select comparison operator"
            >
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="gte">Greater or equal</option>
              <option value="lte">Less or equal</option>
              <option value="between">Between</option>
              <option value="in">In list</option>
            </select>

            <input
              type="text"
              placeholder={newOperator === 'between' ? 'Value1, Value2' : 'Value'}
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setError('');
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              aria-label="Filter value"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddCondition}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                aria-label="Add filter condition"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowNewCondition(false);
                  setError('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-400"
                aria-label="Cancel adding condition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewCondition(true)}
          className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          aria-label="Add a new filter condition"
        >
          + Add Condition
        </button>
      )}
    </div>
  );
};

/**
 * Quick Filters Component
 * Shows preset/quick access filters
 */
export interface QuickFiltersProps {
  filters: SavedFilter[];
  onFilterSelect: (filter: SavedFilter) => void;
  onToggleFavorite?: (filterId: string) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  onFilterSelect,
  onToggleFavorite,
}) => {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterSelect(filter)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 hover:bg-blue-100 transition-colors"
          title={filter.description}
          aria-label={`Apply filter: ${filter.name}`}
        >
          <span>{filter.name}</span>
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(filter.id);
              }}
              className="text-blue-500 hover:text-blue-700"
              aria-label={`Toggle favorite for ${filter.name}`}
            >
              ★
            </button>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Saved Filters List Component
 * Manage saved filters
 */
export interface SavedFiltersListProps {
  filters: SavedFilter[];
  onApply: (filter: SavedFilter) => void;
  onDelete: (filterId: string) => void;
  onToggleFavorite: (filterId: string) => void;
  favoriteIds?: string[];
}

export const SavedFiltersList: React.FC<SavedFiltersListProps> = ({
  filters,
  onApply,
  onDelete,
  onToggleFavorite,
  favoriteIds = [],
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Saved Filters ({filters.length})
      </h3>

      {filters.length === 0 ? (
        <p className="text-gray-500 text-center py-6">No saved filters yet</p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onApply(filter)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onApply(filter);
                }}
              >
                <p className="font-medium text-gray-900">{filter.name}</p>
                {filter.description && (
                  <p className="text-sm text-gray-600">{filter.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {filter.filters.length} condition
                  {filter.filters.length !== 1 ? 's' : ''} • Updated{' '}
                  {new Date(filter.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onToggleFavorite(filter.id)}
                  className={`px-3 py-1 rounded text-sm ${
                    favoriteIds.includes(filter.id)
                      ? 'text-yellow-600 hover:text-yellow-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={
                    favoriteIds.includes(filter.id)
                      ? 'Remove from favorites'
                      : 'Add to favorites'
                  }
                  aria-label={`Toggle favorite for ${filter.name}`}
                >
                  ★
                </button>
                <button
                  onClick={() => onApply(filter)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  aria-label={`Apply filter ${filter.name}`}
                >
                  Apply
                </button>
                <button
                  onClick={() => onDelete(filter.id)}
                  className="px-3 py-1 text-red-600 hover:text-red-700 text-sm"
                  aria-label={`Delete filter ${filter.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Save Filter Dialog Component
 */
export interface SaveFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
  isLoading?: boolean;
}

export const SaveFilterDialog: React.FC<SaveFilterDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // BUG FIX: Validate name.trim() has content
  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    onSave(trimmedName, description.trim() || undefined);
    setName('');
    setDescription('');
  };

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Save Filter</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Risk Alerts"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={isLoading}
              autoFocus
              aria-label="Filter name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={3}
              disabled={isLoading}
              aria-label="Filter description"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save filter"
          >
            {isLoading ? 'Saving...' : 'Save Filter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBuilder;
