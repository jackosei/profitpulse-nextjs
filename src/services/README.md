# Services Directory

This directory contains services for interacting with external APIs and data sources.

## Structure

- `api/` - API-based services for communication with backend endpoints
  - `pulseApi.ts` - API functions for pulse operations
  - `userApi.ts` - API functions for user operations
  
- `firebase/` - Firebase integration services
  - `firestoreConfig.ts` - Firebase configuration and initialization
  - `authService.ts` - Authentication services using Firebase
  - `pulseService.ts` - Services for pulse data with Firestore
  - `userService.ts` - Services for user data with Firestore

- `types/` - Type definitions for API responses and service data

- `auth.ts` - Auth utilities that use Firebase services
- `admin.ts` - Admin utilities using Firebase Admin SDK
- `users.ts` - User-related services
- `quotes.ts` - Quote-related services

## Architecture

All components access data through the API layer or through hooks like `usePulse`. Direct Firestore calls are only made in service files, not in components.

Firebase configuration is centralized in `firebase/firestoreConfig.ts`. 