# Changelog

## [1.2.0] - 2025-03-12  
### 🚀 Features  
#### One-Time Pulse Update Functionality  
- Added update tracking (`hasBeenUpdated`, `lastUpdate`) to the Pulse interface.  
- Implemented `UpdatePulseModal` with form validation and error handling.  
- Enhanced `PulseHeader` with risk rules display and status indicators.  
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

### 🛠️ Enhancements  
#### Enhanced Modals for Mobile Responsiveness & Scrollability  
- Updated all modal components to ensure proper scrolling and mobile responsiveness.  
- Added `overflow-y-auto` to handle content overflow.  
- Applied `max-h-[90vh]` to prevent modals from exceeding the viewport height.  
- Ensured modals are centered using flexbox, with consistent padding and width constraints.  
- Improved `z-index` handling (`z-50`) to ensure modals appear above other content.  

### 🔧 Fixes  
#### Removed Unused Variable  
- Eliminated `lossPercentage` variable from the `createTrade` function to improve code cleanliness.  

### 🔨 Refactor  
#### Reorganized Project Directory Structure  
- Refactored the project structure for better maintainability and scalability.  

### 🔑 Security & Admin Updates  
#### Implemented Firebase Admin SDK for Admin User Setup  
- Integrated Firebase Admin SDK to bypass Firestore security rules where necessary.  
- Updated admin setup API route to use Admin SDK credentials.  
- Refined Firestore security rules for proper user management.  
- Fixed permission issues preventing admin user creation.  
