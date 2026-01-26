# EPIC 9: Remove Dummy Data - Migration Guide

This guide explains how to migrate frontend pages from hardcoded mock data to real API calls.

## Overview

The goal is to:

1. Use the centralized API client (`lib/api-client.ts`)
2. Use React hooks for data fetching (`hooks/use-api.ts`)
3. Display proper loading, error, and empty states
4. **Never show fake/random data** - show 0 or empty state if no data

---

## Step-by-Step Migration

### 1. Import the API Hooks

```tsx
// Before: No API imports
import { useState } from "react";

// After: Import hooks and state components
import { useState } from "react";
import { useStrategicOverview, usePerformers } from "@/hooks/use-api";
import {
  LoadingCard,
  ErrorState,
  EmptyState,
} from "@/components/ui/api-states";
```

### 2. Replace Hardcoded Data with Hooks

```tsx
// Before: Hardcoded mock data
const groupData = {
  totalPBT: 596500,
  budget: 650000,
  // ...
};

// After: Use API hook
const {
  data: overview,
  loading,
  error,
  isEmpty,
  refetch,
} = useStrategicOverview(overviewMode, selectedYear, selectedMonth);
```

### 3. Add Loading State

```tsx
// Before: Always show data immediately
<div className="kpi-tile">
  <span>{groupData.totalPBT}</span>
</div>;

// After: Show skeleton while loading
{
  loading ? (
    <LoadingCard message="Loading metrics..." />
  ) : (
    <div className="kpi-tile">
      <span>{overview?.pbt.actual ?? 0}</span>
    </div>
  );
}
```

### 4. Add Error State

```tsx
// Before: No error handling
<Dashboard data={groupData} />;

// After: Handle API errors
{
  error ? (
    <ErrorState message={error} onRetry={refetch} />
  ) : (
    <Dashboard data={overview} />
  );
}
```

### 5. Add Empty State

```tsx
// Before: Show random fallback data
const value = data.pbt || Math.random() * 1000000;

// After: Show 0 or empty state
{
  isEmpty || !overview ? (
    <EmptyState
      title="No data for this period"
      description="Submit reports to see data here."
    />
  ) : (
    <ValueDisplay value={overview.pbt.actual} format="currency" />
  );
}
```

### 6. Remove Math.random() Completely

Search for and remove all instances:

```tsx
// ❌ NEVER do this
value: Math.random() * 1000000;

// ✅ Instead, show null/0
value: data?.value ?? 0;
value: data?.value ?? null;
```

---

## Files to Migrate

### High Priority (Dashboard Pages)

| File                                                  | Status             | Notes                                       |
| ----------------------------------------------------- | ------------------ | ------------------------------------------- |
| `app/md/(dashboard)/dashboard/page.tsx`               | 🔄 In Progress     | Use `useStrategicOverview`, `usePerformers` |
| `app/md/(dashboard)/performance/page.tsx`             | ❌ Needs Migration | Uses `Math.random()`                        |
| `app/finance-director/(dashboard)/dashboard/page.tsx` | ❌ Needs Migration | Uses `mockData`                             |
| `app/finance-director/(dashboard)/analytics/page.tsx` | ❌ Needs Migration | Uses `mockData`                             |
| `app/finance-officer/(dashboard)/dashboard/page.tsx`  | ❌ Needs Migration | Check for mock data                         |
| `app/system-admin/(dashboard)/clusters/page.tsx`      | ❌ Needs Migration | Uses `Math.random()`                        |

### API Hooks Available

```typescript
// MD Dashboard
useStrategicOverview(mode, year, month);
usePerformers(mode, year, month, topN);
useClusterContribution(mode, year, month);
useRiskRadar(mode, year, month);
useClusterDrilldown(clusterId, mode, year, month);
usePBTTrend(params);
usePerformanceHierarchy(year, month);

// FD Dashboard
usePendingReports();
useFDDashboard();

// FO Dashboard
useMyCompanies();
useMyReports(status, year);

// Admin
useClusters();
useCompanies(clusterId);
```

---

## UI State Components

### LoadingSpinner

```tsx
<LoadingSpinner size="md" message="Loading..." />
```

### LoadingCard

```tsx
<LoadingCard message="Fetching data..." height="h-48" />
```

### SkeletonCard

```tsx
<SkeletonCard height="h-32" />
```

### ErrorState

```tsx
<ErrorState
  title="Error"
  message="Failed to load data"
  onRetry={() => refetch()}
/>
```

### EmptyState

```tsx
<EmptyState
  title="No reports found"
  description="Submit a report to see it here."
  action={<Button>Create Report</Button>}
/>
```

### ValueDisplay

```tsx
// Shows formatted value or placeholder
<ValueDisplay value={data?.amount} format="currency" inMillions />
<ValueDisplay value={data?.percentage} format="percentage" />
<ValueDisplay value={null} placeholder="—" />  // Shows "—"
```

### ApiStateWrapper

```tsx
// Handles all states automatically
<ApiStateWrapper
  loading={loading}
  error={error}
  isEmpty={isEmpty}
  data={data}
  loadingMessage="Loading dashboard..."
  emptyTitle="No data available"
  onRetry={refetch}
>
  {(data) => <Dashboard data={data} />}
</ApiStateWrapper>
```

---

## Checklist

Before considering a page complete:

- [ ] No `Math.random()` calls
- [ ] No hardcoded data arrays (search for `const ... = [`)
- [ ] No `mockData`, `dummyData`, `fakeData` variables
- [ ] Uses API hooks from `hooks/use-api.ts`
- [ ] Shows `LoadingCard` or skeleton while loading
- [ ] Shows `ErrorState` with retry button on API error
- [ ] Shows `EmptyState` when no data (not fake data)
- [ ] Uses `ValueDisplay` for numbers (handles null gracefully)

---

## Search Commands

Find remaining mock data in the codebase:

```bash
# Find Math.random
grep -r "Math.random" apps/frontend/app --include="*.tsx"

# Find mock/dummy data
grep -r "mockData\|dummyData\|fakeData" apps/frontend --include="*.tsx"

# Find hardcoded arrays
grep -r "const.*= \[" apps/frontend/app --include="*.tsx" | head -50

# Find static number arrays
grep -r "\d{4,}" apps/frontend/app --include="*.tsx"
```

---

## Example: Full Page Migration

See `app/md/(dashboard)/dashboard/page-api.tsx` for a complete example of:

- API hooks usage
- Loading states
- Error handling
- Empty states
- No mock data

To use the migrated version, rename:

- `page.tsx` → `page-old.tsx` (backup)
- `page-api.tsx` → `page.tsx` (use new version)
