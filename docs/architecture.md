# Architecture Overview

## System Architecture

The Web Testing IDE is built as a local-first, cross-platform desktop application using a modular monorepo architecture.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                     │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Renderer Process)                         │
│  ├─ Monaco Editor (Code Editing)                           │
│  ├─ Steps UI (Visual Step Management)                      │
│  ├─ Assertion Builder (Test Assertions)                    │
│  └─ Test Progress (Execution Monitoring)                   │
├─────────────────────────────────────────────────────────────┤
│  Node.js Backend (Main Process)                            │
│  ├─ IPC Handlers (Inter-Process Communication)             │
│  ├─ File System Operations                                 │
│  └─ Process Management                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Packages                           │
├─────────────────────────────────────────────────────────────┤
│  @web-testing-ide/recorder                                 │
│  ├─ Browser Automation (Playwright)                        │
│  ├─ Event Capture                                          │
│  └─ Session Management                                     │
├─────────────────────────────────────────────────────────────┤
│  @web-testing-ide/selector-engine                          │
│  ├─ Selector Generation                                    │
│  ├─ Reliability Scoring                                    │
│  └─ Fallback Strategies                                    │
├─────────────────────────────────────────────────────────────┤
│  @web-testing-ide/codegen                                  │
│  ├─ Playwright Code Generation                             │
│  ├─ Cypress Code Generation                                │
│  └─ Selenium Code Generation                               │
├─────────────────────────────────────────────────────────────┤
│  @web-testing-ide/runner                                   │
│  ├─ Test Execution                                         │
│  ├─ Artifact Collection                                    │
│  └─ HTML Reporting                                         │
├─────────────────────────────────────────────────────────────┤
│  @web-testing-ide/common                                   │
│  ├─ Shared Types                                           │
│  ├─ Database Layer (SQLite)                                │
│  └─ Utilities                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Local Storage                             │
├─────────────────────────────────────────────────────────────┤
│  SQLite Database (Sessions, Settings)                      │
│  File System (Screenshots, Recordings, Reports)            │
│  OS Keychain (Secure Credentials)                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Details

#### Frontend (React + TypeScript)
- **Monaco Editor**: Full-featured code editor with syntax highlighting for Playwright, Cypress, and Selenium
- **Steps UI**: Visual representation of recorded steps with editing capabilities
- **Assertion Builder**: Interactive UI for creating test assertions
- **Test Progress**: Real-time feedback during test execution

#### Backend (Electron Main Process)
- **IPC Handlers**: Secure communication between frontend and backend
- **File Operations**: Local file system management for recordings and reports
- **Process Management**: Spawning and managing test execution processes

#### Core Packages
- **Recorder**: Captures user interactions using Playwright browser automation
- **Selector Engine**: Generates and scores CSS selectors for reliability
- **Code Generator**: Converts recorded sessions to executable test code
- **Runner**: Executes tests and collects artifacts (screenshots, traces, logs)
- **Common**: Shared types, database layer, and utilities

### Data Flow

1. **Recording Phase**:
   - User clicks "Record" → Recorder spawns browser → Captures interactions → Stores in SQLite
   
2. **Code Generation Phase**:
   - User clicks "Generate" → CodeGen reads session → Applies selector scoring → Outputs test code
   
3. **Execution Phase**:
   - User clicks "Run" → Runner executes test → Collects artifacts → Generates HTML report

### Security & Privacy

- **Local-Only**: All processing happens locally, no external API calls
- **Offline-Capable**: Works without internet connection
- **Secure Storage**: Credentials stored in OS keychain via keytar
- **No Telemetry**: Zero data collection or tracking

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Monaco Editor
- **Backend**: Electron 28, Node.js 18+
- **Database**: SQLite (better-sqlite3)
- **Testing**: Playwright (automation), Jest (unit tests)
- **Build**: Vite (frontend), TypeScript (compilation), electron-builder (packaging)
- **Monorepo**: pnpm workspaces

### Extension Points

- **Plugin API**: Lightweight interface for custom exporters
- **Framework Support**: Extensible code generation for new frameworks
- **Selector Strategies**: Pluggable selector generation algorithms

## Package Architecture

### @web-testing-ide/recorder
Handles browser automation and interaction capture:
- Spawns Playwright browsers for recording
- Captures DOM events and user interactions
- Manages WebSocket communication with browser extension
- Stores recordings in structured JSON format

### @web-testing-ide/selector-engine
Generates and scores CSS selectors:
- Analyzes DOM elements for unique identifiers
- Implements scoring algorithm for selector reliability
- Provides fallback selector strategies
- Optimizes selectors for maintainability

### @web-testing-ide/codegen
Converts recordings to executable test code:
- Supports Playwright, Cypress, and Selenium frameworks
- Generates TypeScript, JavaScript, and Python code
- Handles assertions and wait conditions
- Provides configurable code generation options

### @web-testing-ide/runner
Executes tests and collects results:
- Spawns test processes with proper isolation
- Collects screenshots, traces, and logs
- Generates HTML reports with artifacts
- Provides CLI interface for automation

### @web-testing-ide/common
Shared utilities and types:
- TypeScript interfaces for all data structures
- SQLite database layer with migrations
- Logging utilities and error handling
- Common constants and configuration

## Electron Architecture

### Main Process
- Manages application lifecycle
- Handles file system operations
- Provides IPC handlers for renderer communication
- Manages child processes for test execution

### Renderer Process
- React application with Monaco Editor
- Communicates with main process via IPC
- Manages UI state and user interactions
- Renders test results and progress

### Security Model
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication patterns
- Minimal file system access

## Build and Packaging

### Development Build
- Vite for fast frontend development
- TypeScript compilation for all packages
- Hot module replacement for rapid iteration

### Production Build
- Optimized bundles with tree shaking
- electron-builder for cross-platform packaging
- Code signing and notarization support
- Auto-updater integration

### CI/CD Pipeline
- GitHub Actions for automated testing
- Cross-platform builds on every commit
- Automated releases with signed binaries
- E2E testing across platforms
