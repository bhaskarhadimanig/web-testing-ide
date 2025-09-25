# Visual Studio Code Setup Guide for Web Testing IDE

This guide explains how to use Visual Studio Code to develop and build the Web Testing IDE, including generating Windows installers.

## Prerequisites

- Visual Studio Code installed
- Node.js 18+ installed
- pnpm 8+ installed
- Git installed

## Opening the Project in VS Code

1. **Clone the repository** (if not already done):
```bash
git clone https://github.com/bhaskarhadimanig/web-testing-ide.git
cd web-testing-ide
```

2. **Open in VS Code**:
```bash
code .
```

Or use VS Code's "File > Open Folder" menu to open the `web-testing-ide` directory.

## Recommended VS Code Extensions

Install these extensions for the best development experience:

### Essential Extensions
- **TypeScript and JavaScript Language Features** (built-in)
- **ESLint** - For code linting
- **Prettier - Code formatter** - For code formatting
- **GitLens** - Enhanced Git capabilities

### Helpful Extensions
- **Thunder Client** - For API testing
- **Auto Rename Tag** - For HTML/JSX editing
- **Bracket Pair Colorizer** - For better code readability
- **Path Intellisense** - For file path autocompletion

## VS Code Workspace Configuration

Create a `.vscode/settings.json` file in the project root:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

## Development Workflow in VS Code

### 1. Install Dependencies

Open the integrated terminal in VS Code (`Ctrl+`` ` or `View > Terminal`) and run:

```bash
pnpm install
```

### 2. Development Mode

Start the IDE in development mode:

```bash
pnpm dev
```

This will:
- Compile TypeScript
- Start the Vite dev server
- Launch the Electron application

### 3. Running Tests

Run all tests:
```bash
pnpm test
```

Run tests for a specific package:
```bash
pnpm --filter ide-electron test
pnpm --filter recorder test
```

### 4. Code Quality Checks

Run linting:
```bash
pnpm lint
```

Format code:
```bash
pnpm format
```

### 5. Building for Production

Build all packages:
```bash
pnpm build
```

## Generating Windows Installers in VS Code

### Method 1: Using VS Code Terminal (Cross-platform limitations apply)

1. **Open integrated terminal** (`Ctrl+`` `)

2. **Build the project**:
```bash
pnpm build
```

3. **Generate Windows installer**:
```bash
pnpm package:win
```

**Note**: This may fail on Linux/macOS due to cross-platform packaging limitations. See solutions below.

### Method 2: Using GitHub Actions (Recommended)

1. **Create a new release tag**:
```bash
git tag v0.1.1
git push origin v0.1.1
```

2. **Monitor GitHub Actions**:
   - Go to the repository's Actions tab
   - Watch the release workflow build Windows installers
   - Download from the Releases page when complete

### Method 3: Windows Development Machine

If you're on a Windows machine, VS Code can build Windows installers directly:

1. **Open terminal in VS Code**
2. **Run the packaging command**:
```bash
pnpm package:win
```

This will create `Web Testing IDE Setup 0.1.0.exe` in the `dist/` directory.

## Debugging in VS Code

### Debugging the Electron Main Process

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/apps/ide-electron",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["dist/main/main.js"],
      "outputCapture": "std",
      "preLaunchTask": "build-main"
    }
  ]
}
```

### Debugging the React Renderer

1. Start development mode: `pnpm dev`
2. Open Chrome DevTools in the Electron window
3. Use React Developer Tools extension

## File Structure Navigation

VS Code's Explorer panel shows the monorepo structure:

```
web-testing-ide/
├── apps/
│   └── ide-electron/          # Main Electron app
├── packages/
│   ├── common/                # Shared utilities
│   ├── recorder/              # Recording engine
│   ├── selector-engine/       # Selector generation
│   ├── codegen/              # Code generation
│   └── runner/               # Test execution
├── tools/
│   └── extension/            # Browser extension
├── docs/                     # Documentation
└── examples/                 # Example recordings
```

## Common VS Code Tasks

### Task Configuration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build-main",
      "type": "shell",
      "command": "pnpm",
      "args": ["build:main"],
      "group": "build",
      "options": {
        "cwd": "${workspaceFolder}/apps/ide-electron"
      }
    },
    {
      "label": "dev",
      "type": "shell",
      "command": "pnpm",
      "args": ["dev"],
      "group": "build",
      "isBackground": true
    },
    {
      "label": "test",
      "type": "shell",
      "command": "pnpm",
      "args": ["test"],
      "group": "test"
    },
    {
      "label": "package-win",
      "type": "shell",
      "command": "pnpm",
      "args": ["package:win"],
      "group": "build"
    }
  ]
}
```

### Running Tasks

- Press `Ctrl+Shift+P` (Command Palette)
- Type "Tasks: Run Task"
- Select the task you want to run

## Troubleshooting in VS Code

### TypeScript Errors

1. **Restart TypeScript Server**:
   - `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

2. **Check TypeScript version**:
   - Bottom right of VS Code shows TS version
   - Should be 5.0+

### Build Errors

1. **Clean and rebuild**:
```bash
pnpm clean
pnpm install
pnpm build
```

2. **Check terminal output** for specific error messages

### Packaging Errors

1. **Windows installer on Linux/macOS**:
   - Use GitHub Actions workflow instead
   - Or use a Windows development machine

2. **Missing dependencies**:
```bash
pnpm install --frozen-lockfile
```

## Git Integration in VS Code

VS Code provides excellent Git integration:

1. **Source Control panel** (`Ctrl+Shift+G`)
2. **Stage changes** by clicking the `+` icon
3. **Commit changes** with a commit message
4. **Push to remote** using the sync button

### Recommended Git Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes in VS Code
3. Stage and commit changes
4. Push branch: `git push origin feature/my-feature`
5. Create PR on GitHub

## Performance Tips

1. **Exclude large directories** from VS Code indexing (already configured above)
2. **Use workspace-specific settings** for better performance
3. **Close unused tabs** to reduce memory usage
4. **Use integrated terminal** instead of external terminal for better integration

## Summary

VS Code is an excellent editor for developing the Web Testing IDE. The key points:

- **Development**: Use `pnpm dev` in the integrated terminal
- **Building**: Use `pnpm build` followed by `pnpm package:win`
- **Cross-platform limitations**: Windows installers are best built on Windows or via GitHub Actions
- **Debugging**: Use VS Code's built-in debugging for the main process
- **Git integration**: Use VS Code's source control panel for version control

The actual building and packaging happens through the command line tools (pnpm/electron-builder), regardless of which editor you use. VS Code just provides a great interface for managing the development workflow.
