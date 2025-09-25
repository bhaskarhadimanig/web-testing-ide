# Web Testing IDE

A production-ready, cross-platform desktop Web-Testing IDE that is fully local/offline — no external AI, no telemetry, no cloud services, and no outbound network calls except to the websites the user explicitly chooses to test.

## Features

- **Local-only by default**: No OpenAI/Ollama/remote inference, no telemetry, no cloud services
- **Cross-platform**: Windows, macOS, and Linux support via Electron
- **Recording Engine**: Capture user interactions with websites
- **Smart Selectors**: Local heuristic-based selector generation and scoring
- **Code Generation**: Export to Playwright, Cypress, and Selenium
- **Test Runner**: Execute tests locally with artifact collection
- **Privacy-focused**: All data stored locally, secrets in OS keychain

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Package for distribution
pnpm package
```

### For Non-Developers

See [docs/quickstart-non-dev.md](docs/quickstart-non-dev.md) for detailed installation and usage instructions.

## Architecture

This is a monorepo with the following structure:

```
/
├─ apps/
│  └─ ide-electron/            # Electron + React desktop app
├─ packages/
│  ├─ recorder/                # Recording engine & JSON schema
│  ├─ selector-engine/         # Selector heuristics & scoring
│  ├─ codegen/                 # JSON → Playwright/Cypress/Selenium
│  ├─ runner/                  # Test execution & artifact collection
│  ├─ common/                  # Shared types, utils, DB layer
├─ tools/
│  └─ extension/               # Optional local extension
├─ examples/
│  └─ recordings/              # Example recordings
├─ docs/                       # Documentation
└─ .github/workflows/          # CI/CD
```

## Development Status

- ✅ **Phase 1**: Monorepo scaffold, Electron shell, CI skeleton
- 🚧 **Phase 2**: Recording engine, selector engine
- 🚧 **Phase 3**: Code generation, test runner, IDE UI
- 🚧 **Phase 4**: Packaging, documentation, testing

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Development Decisions](docs/DECISIONS.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Non-Developer Quickstart](docs/quickstart-non-dev.md)

## License

MIT License - see LICENSE file for details.
