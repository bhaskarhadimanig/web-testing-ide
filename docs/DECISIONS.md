# Architecture Decisions

## Phase 1 Decisions

### Technology Stack
- **Electron + React + TypeScript + Vite**: Modern, fast development experience with strong typing
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Monaco Editor**: VS Code's editor for code editing capabilities
- **pnpm workspaces**: Efficient monorepo management with better dependency resolution
- **better-sqlite3**: Local SQLite database for offline data persistence
- **Playwright**: Primary testing engine for web automation

### Project Structure
- **Monorepo Layout**: Organized into apps/, packages/, tools/, examples/, docs/ for clear separation of concerns
- **Local-First Architecture**: No external AI, telemetry, or cloud dependencies by design
- **Cross-Platform**: electron-builder for Windows/macOS/Linux packaging

### Development Workflow
- **Husky + commitlint**: Enforce conventional commit messages
- **ESLint + Prettier**: Code quality and formatting consistency
- **Jest + Playwright Test**: Unit and E2E testing coverage
- **GitHub Actions**: CI/CD pipeline for automated testing and building

### Security & Privacy
- **Offline-Only**: All processing happens locally, no data leaves the machine
- **OS Keychain**: Use keytar for secure credential storage when needed
- **Local Storage**: SQLite database for all persistent data

### UI/UX Decisions
- **Minimal Interface**: Clean toolbar with essential actions (Record, Stop, Generate, Run, Export)
- **Two-Panel Layout**: Steps tree view on left, code editor on right
- **Monaco Integration**: Full-featured code editing with syntax highlighting and IntelliSense

## Future Considerations
- Plugin architecture for extensibility
- Additional export formats (Cypress, Selenium)
- Advanced selector strategies
- Performance optimizations for large recordings
