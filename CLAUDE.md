# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Google Forms clone built with Next.js 14 that uses OneEntry CMS as the backend for storing forms and form submissions. The application allows users to create forms, collect responses, and view analytics on those responses.

## Commands

### Development
```bash
npm run dev    # Start development server on http://localhost:3000
npm run build  # Build for production
npm start      # Start production server
npm run lint   # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 14.1.0 (App Router, React Server Components)
- **Language**: TypeScript
- **Authentication**: Clerk (@clerk/nextjs)
- **Backend/CMS**: OneEntry (headless CMS for forms and submissions)
- **State Management**: Zustand (for UI state)
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI Components**: Radix UI primitives via shadcn/ui
- **Charts**: Tremor React
- **Notifications**: Sonner

## Architecture

### Route Structure

The app uses Next.js 14 App Router with route groups:

- **(home)/** - Public landing page
- **(auth)/** - Clerk authentication pages (`/sign-in`, `/sign-up`)
- **dashboard/** - Protected area for managing forms
  - `dashboard/forms/[id]` - Edit form and view responses
  - `dashboard/forms/[id]/responses` - View response analytics
- **forms/[id]/** - Public form submission pages
  - `forms/[id]/success` - Success page after submission

### Authentication & Authorization

Authentication is handled by Clerk via `middleware.ts`:
- All routes are public EXCEPT `/dashboard/*`
- Dashboard routes require authentication
- Middleware config: `middleware.ts:6-13`

### Data Flow

1. **Data Fetching** (Server Components):
   - Functions in `lib/data.ts` fetch data from OneEntry CMS
   - `fetchAllForms()` - Get all forms
   - `fetchFormById(id)` - Get form by marker/ID
   - `fetchAllFormsData()` - Get all form submissions
   - `fetchMenuItems(marker)` - Get menu data

2. **Data Mutations** (Server Actions):
   - `lib/actions.ts` contains Server Actions
   - `addFormData()` - Submit form data to OneEntry
   - Uses Next.js `redirect()` for post-submission navigation

3. **OneEntry Integration**:
   - Configured in `oneentry.ts` using environment variables
   - Requires `NEXT_PUBLIC_API_URL` and `API_TOKEN`
   - All forms and submissions are stored in OneEntry CMS

### Type System

`lib/definitions.ts` contains critical type mappings:
- `attributeTypeToInputType` - Maps OneEntry attribute types to HTML input types
- This mapping determines how form fields are rendered based on CMS configuration
- Key types: `FormDataItem`, `IndividualResponse`, `AttributeCount`

### State Management

Zustand store in `store/store.ts`:
- Currently manages command dialog state (`useCommandDialogStore`)
- Minimal global state - most state is server-side via React Server Components

### Component Organization

- **components/** - Feature components (FormCard, MainForm, Header, etc.)
- **components/ui/** - shadcn/ui primitives (button, dialog, tabs, etc.)
- shadcn/ui configuration in `components.json`

## Environment Variables

Required environment variables (create `.env.local`):

```bash
# OneEntry CMS
NEXT_PUBLIC_API_URL=   # OneEntry API URL
API_TOKEN=             # OneEntry API token

# Clerk Authentication
# Follow Clerk setup guide for required variables
```

## Key Files

- `middleware.ts` - Clerk auth middleware, protects dashboard routes
- `oneentry.ts` - OneEntry API client initialization
- `lib/data.ts` - Server-side data fetching functions
- `lib/actions.ts` - Server Actions for mutations
- `lib/definitions.ts` - Type definitions and mappings
- `store/store.ts` - Zustand state management

## Development Notes

### Working with Forms

Forms are managed entirely through OneEntry CMS:
1. Forms are created/configured in OneEntry
2. The app fetches form schemas via `fetchFormById()`
3. Form attributes are mapped to input types via `attributeTypeToInputType`
4. Submissions are posted via `addFormData()` Server Action

### Adding New Components

When adding shadcn/ui components:
```bash
npx shadcn-ui@latest add [component-name]
```

Components will be added to `components/ui/` based on `components.json` config.

### Server Components vs Client Components

- Most components are Server Components by default
- Client Components are marked with `"use client"` directive
- Server Actions are marked with `"use server"` directive
- Prefer Server Components for data fetching and rendering
- Use Client Components only when needed for interactivity

### Styling

- Tailwind CSS with custom configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Uses CSS variables for theming (shadcn/ui default)
- Import path aliases: `@/components`, `@/lib`
