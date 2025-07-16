# Claude Development Preferences for Delphi Webapp

## Project Overview
This is a Delphi technique web application built with Svelte 5, SvelteKit, Firebase, and shadcn-svelte. The app is designed for corporate healthcare systems to gather expert feedback across multiple facilities (30+ acute hospitals and behavioral health facilities) for strategic decision-making. It supports anonymous voting across multiple rounds with feedback aggregation and visualization.

## Development Preferences

### Package Manager
- **Always use pnpm** - Do not use npm or yarn for any package installations

### UI Framework
- **Use shadcn-svelte components** - This is the preferred UI library for this project
- Install shadcn-svelte components manually if the CLI fails
- Maintain consistent styling with the shadcn-svelte design system

### Tech Stack Decisions
- **Frontend**: Svelte 5 with runes (`$state`, `$derived`, `$effect`)
- **Meta-framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Deployment**: Vercel

### Code Style Preferences
- Use TypeScript for all new files
- Use Svelte 5 runes instead of stores where possible
- Prefer `.svelte.ts` files for reactive state management
- Keep components small and focused
- Use proper TypeScript types for all Firebase data models

### Firebase Guidelines
- All Firebase operations should check for browser environment
- Use proper error handling for all Firebase operations
- Keep Firebase config in environment variables
- Implement proper security rules before production

### Testing & Quality
- Run `pnpm dev` to test during development
- Ensure no TypeScript errors before considering a feature complete
- Test responsive design on mobile and desktop

### Git & Commit Guidelines
- **Do not reference Claude Code in commit messages** - Keep commit messages professional and tool-agnostic
- Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Write clear, descriptive commit messages that explain the "what" and "why"
- Commit related changes together in logical units

### Project Structure
- UI components go in `src/lib/components/ui/`
- Firebase services go in `src/lib/firebase/`
- Stores and reactive state go in `src/lib/stores/`
- Keep routes organized by feature (auth, admin, item)

### Important Commands
```bash
# Development
pnpm dev

# Build
pnpm build

# Type checking
pnpm check

# Installing packages
pnpm add [package-name]
pnpm add -D [dev-package-name]
```

### Key Features to Implement
1. Item management (create, edit, delete items with types: initiative, assessment, consultation, evaluation, survey)
2. Expert invitation system for facility leaders and subject matter experts
3. Multi-round voting interface with anonymous participation
4. Real-time feedback aggregation across all facilities
5. Statistical analysis and visualization of consensus
6. Data export functionality (CSV, PDF reports)
7. Admin dashboard for healthcare system administrators
8. Participant dashboard for facility representatives

### Notes
- The Delphi technique requires anonymous participation to reduce bias
- Each round should show aggregated results from the previous round
- Consensus is measured through statistical convergence
- Support multiple question types: rating scales, rankings, open text
- Firebase Firestore is used for real-time updates

### Database Schema
- **Items** (formerly "studies") have:
  - `type`: initiative, assessment, consultation, evaluation, survey, or custom
  - `category`: clinical, operational, financial, strategic, quality, or technology
  - `scope`: system-wide, regional, facility, or department
  - `customMetadata`: flexible field for additional type-specific data
- This flexible schema allows the platform to handle various healthcare decision-making scenarios