# Grahmos AI Search

An advanced AI-powered offline search tool designed to provide intelligent, context-aware search experiences without requiring internet connectivity.

## Project Overview

This project creates a modern, responsive AI-powered search interface that leverages local AI processing and offline capabilities for enhanced user experience, inspired by GenSpark's approach but built for Grahmos AI.

## Key Features

- **Offline AI Search**: Intelligent search powered by local AI processing
- **Modern UI/UX**: Clean, responsive interface with dark mode support
- **File Management**: Grid/list view toggles with advanced filtering
- **Real-time Interactions**: Smooth animations and responsive feedback
- **Accessibility**: Full keyboard navigation and screen reader support

## Tech Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS with dark mode variants
- **State Management**: React Context/Hooks
- **Build Tool**: Vite
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── search/         # Search-specific components
│   ├── ui/            # Generic UI components
│   └── layout/        # Layout components
├── hooks/             # Custom React hooks
├── services/          # API and business logic
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── styles/           # Global styles and themes
```

## Development Guidelines

- Follow React best practices and hooks patterns
- Use TypeScript for type safety
- Implement responsive design with Tailwind CSS
- Maintain consistent component architecture
- Write comprehensive tests for critical functionality

## Contributing

1. Follow the established coding conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure accessibility compliance
5. Test in both light and dark modes

## License

This project is proprietary to Grahmos AI.
