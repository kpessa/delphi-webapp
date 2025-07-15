# Delphi Technique Web Application

A modern web application for conducting Delphi technique studies, built with Svelte 5, SvelteKit, Firebase, and shadcn-svelte.

## Features

- 🔐 **Anonymous Expert Participation** - Maintain anonymity to reduce bias
- 🔄 **Multiple Rounds** - Iterative feedback process with automatic progression
- 📊 **Real-time Aggregation** - Statistical analysis and visualization of responses
- 📈 **Consensus Tracking** - Monitor convergence across rounds
- 🎯 **Flexible Question Types** - Support for ratings, rankings, and open-ended feedback
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌙 **Dark Mode** - Built-in theme switching

## Tech Stack

- **Frontend Framework**: Svelte 5 with Runes
- **Meta-framework**: SvelteKit
- **UI Components**: shadcn-svelte
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Vercel
- **Charts**: Chart.js

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm package manager
- Firebase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd delphi-webapp
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your Firebase configuration to `.env`:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building

Build for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── ui/          # shadcn-svelte components
│   ├── firebase/        # Firebase services
│   ├── stores/          # Svelte stores
│   └── utils/           # Utility functions
├── routes/
│   ├── admin/           # Admin dashboard
│   ├── auth/            # Authentication pages
│   └── study/           # Study participation pages
└── app.css              # Global styles
```

## Deployment

This project is configured for deployment to Vercel:

```bash
pnpm build
vercel
```

## License

MIT
