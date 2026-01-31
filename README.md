# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack

- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (installed via [Homebrew](https://brew.sh/) is recommended for macOS/Linux)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Start the Supabase services:

```bash
supabase start
```

4. Run the development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Testing

- Unit & integration: Vitest (test runner), jsdom, Testing Library
- E2E: Playwright (Chromium only, POM), visual snapshots

### Unit tests (Vitest)

```bash
npm run test
npm run test:watch
npm run coverage
```

Files: `src/**/*.{test,spec}.{ts,tsx}`

### E2E tests (Playwright)

```bash
npm run e2e              # Run all E2E tests
npm run e2e:headed       # Run with visible browser
npm run e2e:report       # Show HTML report
```

**Quick Start:**

- 📚 **New to E2E testing?** Start with [`e2e/QUICK_START.md`](./e2e/QUICK_START.md) (5 minutes)
- 📖 **Full documentation:** See [`e2e/README.md`](./e2e/README.md)
- 🎯 **All guides:** Check [`e2e/INDEX.md`](./e2e/INDEX.md) for complete documentation index

**Features:**

- ✅ Page Object Models for maintainable tests
- ✅ Comprehensive test coverage (auth, flashcards, UI)
- ✅ Helper functions and utilities
- ✅ Visual regression testing with screenshots
- ✅ Detailed documentation and examples

**Test Structure:**

```
e2e/
├── pages/           # Page Object Models
├── helpers/         # Test utilities
├── *.spec.ts        # Test files
└── *.md             # Documentation
```

#### Debugging

```bash
npx playwright test --debug           # Step-by-step debugging
npx playwright test --headed          # Watch tests run
npx playwright show-trace trace.zip   # View test trace
```

See [`e2e/CHEATSHEET.md`](./e2e/CHEATSHEET.md) for more commands and tips.

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
```

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT
