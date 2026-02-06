# Changelog

## [2.0.0] - 2026-02-06

### Major Breaking Changes

#### Trade Data Structure Overhaul

- **Nested Data Model**: Migrated trade data from flat structure to nested objects:
  - `execution`: Entry/exit details, prices, lot size
  - `performance`: Profit/loss metrics
  - `psychology`: Emotional state, discipline tracking
  - `context`: Market conditions, environment
  - `reflection`: Post-trade analysis
- **BREAKING CHANGE**: Existing trade data is not compatible with this version. Users must delete existing trades.
- **Full Stack Update**: Updated all layers (Types, API, Forms, UI, Services) to support the new structure.
- **Enhanced Validation**: Improved server-side validation for nested data structures.

## [1.3.0] - 2026-02-06

### Major Refactoring

#### Trade Modal Architecture Overhaul

- **Unified Trade Form Modal**: Refactored `AddTradeModal` and `UpdateTradeModal` into a single `TradeFormModal` component
  - Eliminated **800+ lines** of duplicated code (57% reduction)
  - Implemented mode-based pattern (`create` | `update`) for cleaner architecture
  - Extracted shared form components into reusable modules:
    - `TradeDataForm` - Core trade data entry
    - `PsychologyForm` - Emotional and mental state tracking
    - `ContextForm` - Market conditions and environment
    - `ReflectionForm` - Post-trade analysis
    - `TradingRulesSection` - Trading rules checklist
  - Added tab-based interface with completion indicators
  - Improved maintainability with shared TypeScript types

### Critical Bug Fixes

#### Firebase Data Persistence

- **Fixed Firebase undefined values error**: Added filtering to remove `undefined` fields before Firestore submission
- **Fixed update modal data loading**: Implemented `useEffect` to reinitialize form data when trade prop changes
- **Fixed emotional intensity defaulting to 5**: Changed from `||` to `??` (nullish coalescing) to properly handle `0` values
- **Fixed reflection data not persisting**: Corrected boolean field handling to preserve `false` values
- **Fixed UI not refreshing after updates**: Implemented refresh callback chain from page → TradeHistory/TradeCalendar → TradeDetailsModal → UpdateTradeModal

#### Data Flow Improvements

- Added `onRefresh` callback prop to `TradeHistory` and `TradeCalendar` components
- Connected refresh callbacks to `fetchPulse()` in pulse page for real-time UI updates
- Ensured automatic UI refresh after trade creation/update without page reload

### Features

#### Enhanced Trade Editing

- **Full field editing**: Users can now edit all trade fields including:
  - Psychology data (emotional state, intensity, mental state, plan adherence)
  - Context data (market conditions, time of day, trading environment)
  - Reflection data (would repeat, emotional impact, mistakes, improvements)
- **Data preservation**: All existing trade data correctly populates in update modal
- **Real-time updates**: Changes reflect immediately in UI without manual refresh

#### Improved Form Handling

- Better validation for entry/exit times
- Explicit undefined checks for optional boolean fields
- Proper type casting for numeric values
- Enhanced error messages for validation failures

### Refactoring

#### Component Structure

- Created `components/modals/trade-form/` directory for organized form components
- Moved shared types to `components/modals/trade-form/types.ts`
- Reduced `AddTradeModal.tsx` to 23-line wrapper
- Reduced `UpdateTradeModal.tsx` to 40-line wrapper

#### Code Quality

- Removed all debug `console.log` statements
- Improved TypeScript type safety across form components
- Consistent prop interfaces for form sections
- Better separation of concerns

### Documentation

- Created comprehensive refactoring walkthrough
- Documented all bug fixes with root cause analysis
- Added lessons learned section for future development
- Included testing checklist for QA

## [1.2.0] - 2025-03-12

### Features

#### One-Time Pulse Update Functionality

- Added update tracking (hasBeenUpdated, lastUpdate) to the Pulse interface.
- Implemented UpdatePulseModal with form validation and error handling.
- Enhanced PulseHeader with risk rules display and status indicators.
- Added rule violations display for locked pulses.
- Improved mobile responsiveness for risk rules display.

#### Profit Factor Calculation & Stats Card

- Implemented profit factor calculation.
- Added a dedicated stats card to display profit factor.

#### Improved Number Formatting & Layout

- Added `formatCurrency` and `formatRatio` utility functions.
- Implemented consistent number formatting across all components.
- Introduced visual section dividers in the Pulse page for better UI structure.
- Improved component organization with semantic sections.

#### Enhanced Home Page

- Added a digital clock component with date display.
- Implemented daily trading quotes with Firestore integration.
- Added a gratitude journal component with local storage support.
- Improved overall page styling and responsiveness.

### Enhancements

#### Enhanced Modals for Mobile Responsiveness & Scrollability

- Updated all modal components to ensure proper scrolling and mobile responsiveness.
- Added `overflow-y-auto` to handle content overflow.
- Applied `max-h-[90vh]` to prevent modals from exceeding the viewport height.
- Ensured modals are centered using flexbox, with consistent padding and width constraints.
- Improved `z-index` handling (`z-50`) to ensure modals appear above other content.

### Fixes

#### Removed Unused Variable

- Eliminated `lossPercentage` variable from the `createTrade` function to improve code cleanliness.

### Refactor

#### Reorganized Project Directory Structure

- Refactored the project structure for better maintainability and scalability.

### Security & Admin Updates

#### Implemented Firebase Admin SDK for Admin User Setup

- Integrated Firebase Admin SDK to bypass Firestore security rules where necessary.
- Updated admin setup API route to use Admin SDK credentials.
- Refined Firestore security rules for proper user management.
- Fixed permission issues preventing admin user creation.
