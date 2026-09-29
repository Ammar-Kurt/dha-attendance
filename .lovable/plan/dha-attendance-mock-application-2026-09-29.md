# DHA Attendance mock application

## Scope
Build a responsive, frontend-only employee attendance management application using realistic DHA Company mock data and temporary in-memory state. The uploaded backend, real login, database, and external-service requirements will be represented as interface flows only, following the user's explicit restrictions.

## Pages and navigation
- Add a mock sign-in screen with role selection for Employee, Manager, HR Admin, and System Admin.
- Create a shared desktop sidebar, tablet layout, and mobile bottom navigation with role-appropriate menus and no dead links.
- Provide dashboard variants and views for attendance, leave, approvals, team attendance, employees, organization setup, reports, notifications, users and roles, audit log, and profile.
- Use a single routed application shell with shareable URLs and unique page metadata for each page.

## Interactions and states
- Support temporary check-in/check-out state, employee status updates, filters, search, tabs, dialogs, form validation, approvals/rejections, correction requests, notifications, and CSV report download.
- Include loading, empty, validation, confirmation, and recoverable error examples where they naturally belong.
- Keep all state in memory; refreshing restores the original mock data.

## Visual direction
- Use a professional DHA blue-and-white system with crisp typography, restrained surfaces, compact data views, and clear green/amber/red status styling.
- Use Lucide icons, semantic design tokens, reusable controls, and accessible focus/contrast states.
- Ensure layouts remain usable on mobile, tablet, and desktop without overlapping or clipped content.

## Technical details
- Keep TanStack Start routing and create every referenced route.
- Build reusable shell, navigation, card, table, badge, form, dialog, and empty-state components.
- Do not connect Lovable Cloud, authentication, databases, external APIs, payments, email, or localStorage.
- Validate forms client-side with Zod and use only static mock data plus React state.
- Verify the current build and key desktop/mobile flows in the running preview.
