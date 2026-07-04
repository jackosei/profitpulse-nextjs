# Dashboard Components

This directory contains reusable components for the dashboard page. These components have been extracted to improve code maintainability, reusability, and performance.

## Components

### TimeRangeSelector

A dropdown component that allows users to select different time ranges for data filtering.

```tsx
import TimeRangeSelector, {
	TimeRange,
} from "@/components/dashboard/TimeRangeSelector"
;<TimeRangeSelector
	selectedTimeRange={selectedTimeRange}
	onTimeRangeChange={handleTimeRangeChange}
/>
```

### StatCard

A card component for displaying main statistics with change indicators.

```tsx
import StatCard from "@/components/dashboard/StatCard"
;<StatCard
	title="Profit/Loss"
	value="1234.56"
	change={100}
	changePercentage={10}
	timeRange="30D"
	precision={2}
	prefix="$"
/>
```

### SmallStatCard

A smaller card component for displaying simple statistics.

```tsx
import SmallStatCard from "@/components/dashboard/SmallStatCard"
;<SmallStatCard value={100} label="Total trades" suffix="%" />
```

### PulsesTable

A table component for displaying trading pulses.

```tsx
import PulsesTable from "@/components/dashboard/PulsesTable"
;<PulsesTable pulses={pulses} onCreatePulse={() => setShowCreateModal(true)} />
```

## Utility Functions

The dashboard components rely on utility functions in `src/utils/periodCalculations.ts`:

- `getDateRangeFromTimeRange`: Converts a time range string to actual date ranges
- `calculatePeriodChanges`: Calculates changes between current and previous periods
- `calculateAggregateStats`: Aggregates statistics across multiple pulses

## Performance Optimizations

These components are optimized for performance:

1. **Memoization**: All components use `React.memo()` to prevent unnecessary re-renders when props haven't changed
2. **Callback Optimization**: Event handlers are wrapped in `useCallback` to maintain referential equality
3. **Component Composition**: Complex components like `PulsesTable` are broken down into smaller, memoized sub-components
4. **Separation of concerns**: Each component handles a specific part of the UI
5. **Optimized calculations**: Heavy calculations are extracted to utility functions
6. **Reusability**: Components can be reused across different parts of the application

## Implementation Details

### Memoization Strategy

- **StatCard and SmallStatCard**: Simple memoization with `React.memo()`
- **TimeRangeSelector**: Uses `useCallback` for event handlers to maintain referential equality
- **PulsesTable**:
  - Extracts row rendering to a separate `PulseTableRow` component
  - Memoizes both the table and row components
  - Uses `useCallback` for row event handlers

### Performance Benefits

- Reduced re-renders when parent components update
- Improved performance when filtering or sorting large datasets
- Better user experience with smoother UI updates
- Reduced JavaScript execution time

## Future Improvements

Potential future improvements:

1. Implement virtualization for the PulsesTable for better performance with large datasets
2. Add skeleton loaders for better loading states
3. Create more specialized components for specific dashboard sections
4. Add data prefetching for common user interactions
