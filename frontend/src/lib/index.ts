/**
 * Filtering Module Exports
 * Central export point for all filtering components and utilities
 */

// Core utilities
export {
  FilterManager,
  getFilterManager,
  useAdvancedFilter,
} from './filtering';

export type {
  FilterCondition,
  SavedFilter,
  FilterState,
} from './filtering';

// UI Components
export {
  FilterBuilder,
  QuickFilters,
  SavedFiltersList,
  SaveFilterDialog,
} from '../components/filtering/FilterComponents';

export type {
  FilterBuilderProps,
  QuickFiltersProps,
  SavedFiltersListProps,
  SaveFilterDialogProps,
} from '../components/filtering/FilterComponents';

// Data Table
export {
  FilterableDataTable,
} from '../components/filtering/FilterableDataTable';

export type {
  FilterableDataTableProps,
} from '../components/filtering/FilterableDataTable';
