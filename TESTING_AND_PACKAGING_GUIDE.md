# Complete Testing and Packaging Guide for Web Testing IDE

This guide provides step-by-step instructions to test your Web Testing IDE and generate installers for distribution.

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- pnpm 8+ installed
- Git installed
- At least 4GB free disk space

## Step 1: Clone and Setup the Repository

```bash
# Clone the repository
git clone https://github.com/bhaskarhadimanig/web-testing-ide.git
cd web-testing-ide

# Install pnpm globally if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Step 2: Verify Installation

```bash
# Check that all packages are properly installed
pnpm list

# Verify TypeScript compilation
pnpm build

# Run all unit tests
pnpm test

# Run linting
pnpm lint
```

Expected output:
- `pnpm build`: Should complete without errors
- `pnpm test`: All tests should pass (20+ tests across packages)
- `pnpm lint`: Should complete with no critical errors

## Step 3: Test the IDE in Development Mode

```bash
# Start the IDE in development mode
pnpm dev
```

This will:
1. Compile the main process (Electron backend)
2. Start the Vite dev server for the renderer (React frontend)
3. Launch the Electron application

### Manual Testing Checklist

When the IDE opens, test these features:

#### Basic UI Testing
- [ ] Application window opens successfully
- [ ] Top toolbar is visible with buttons: Record, Stop, Generate, Run, Export
- [ ] Left panel shows "Steps" area
- [ ] Right panel shows tabs: "Steps" and "Code"
- [ ] Monaco Editor loads in the Code tab

#### Recording Functionality
- [ ] Click "Record" button
- [ ] Browser window opens (Chrome/Chromium)
- [ ] Navigate to https://demo.playwright.dev
- [ ] Perform some actions (click buttons, fill forms)
- [ ] Steps appear in real-time in the left panel
- [ ] Screenshots are captured for each step
- [ ] Click "Stop" to end recording

#### Code Generation
- [ ] Click "Generate" button after recording
- [ ] Generated Playwright code appears in Code tab
- [ ] Code is properly formatted with syntax highlighting
- [ ] Framework selector works (Playwright/Cypress/Selenium)
- [ ] Language selector works (TypeScript/JavaScript/Python)

#### Assertion Builder
- [ ] Select a recorded step
- [ ] Click "Add Assertion" button
- [ ] Assertion builder UI opens
- [ ] Add different assertion types (exists, visible, containsText)
- [ ] Assertions appear in generated code

#### Test Execution
- [ ] Click "Run" button
- [ ] Test executes and shows progress
- [ ] HTML report is generated
- [ ] "View Report" button opens the report
- [ ] Screenshots and artifacts are collected

#### Editor Features
- [ ] Undo/Redo works (Ctrl+Z/Ctrl+Y)
- [ ] Code editing works in Monaco Editor
- [ ] "Regenerate from Steps" button works
- [ ] Save and Export functionality works

## Step 4: Run Automated Tests

```bash
# Run unit tests for all packages
pnpm test

# Run E2E tests (if Playwright browsers are installed)
pnpm --filter ide-electron test:e2e
```

If E2E tests fail due to missing browsers:
```bash
# Install Playwright browsers
pnpm exec playwright install
```

## Step 5: Test CLI Tools

```bash
# Test the code generator CLI
pnpm --filter codegen build --input examples/recordings/demo-session.json --output test-output.ts --framework=playwright --lang=ts

# Test the runner CLI
pnpm --filter runner run --test examples/generated/demo.test.ts --headless --output runs/cli-test
```

## Step 6: Create Production Build

```bash
# Build all packages for production
pnpm build

# Verify build artifacts
ls -la apps/ide-electron/dist/
ls -la packages/*/dist/
```

## Step 7: Package the IDE for Distribution

### Package for Current Platform

```bash
# Package for your current platform
pnpm package
```

This creates installers in the `dist/` directory:
- **Linux**: `Web Testing IDE-0.1.0.AppImage` and `ide-electron_0.1.0_amd64.deb`
- **Windows**: `Web Testing IDE Setup 0.1.0.exe`
- **macOS**: `Web Testing IDE-0.1.0.dmg`

### Package for All Platforms

```bash
# Package for all platforms (requires platform-specific tools)
pnpm package:all
```

### Package for Specific Platforms

```bash
# Windows only
pnpm package:win

# macOS only
pnpm package:mac

# Linux only
pnpm package:linux
```

## Step 8: Test the Packaged Application

### Linux Testing
```bash
# Make AppImage executable and run
chmod +x dist/Web\ Testing\ IDE-0.1.0.AppImage
./dist/Web\ Testing\ IDE-0.1.0.AppImage

# Or install and test .deb package
sudo dpkg -i dist/ide-electron_0.1.0_amd64.deb
web-testing-ide
```

### Windows Testing
```bash
# Run the installer
./dist/Web\ Testing\ IDE\ Setup\ 0.1.0.exe
```

### macOS Testing
```bash
# Mount and install the DMG
open dist/Web\ Testing\ IDE-0.1.0.dmg
# Drag to Applications folder and run
```

## Step 9: Verify Packaged Application

Test the same functionality as in Step 3, but using the packaged application:

- [ ] Application starts successfully
- [ ] All UI components load correctly
- [ ] Recording functionality works
- [ ] Code generation works
- [ ] Test execution works
- [ ] Reports are generated correctly

## Step 10: Distribution Preparation

### Create Release Package
```bash
# Create a release directory
mkdir release
cp dist/* release/

# Create checksums for verification
cd release
sha256sum * > checksums.txt
```

### Documentation for End Users
Include these files with your distribution:
- `README.md` - Overview and quick start
- `docs/quickstart-non-dev.md` - Non-developer guide
- `docs/SECURITY.md` - Security information
- `docs/PRIVACY.md` - Privacy policy
- `LICENSE` - License information

## Troubleshooting Common Issues

### Build Issues
```bash
# Clean and rebuild if build fails
pnpm clean
pnpm install
pnpm build
```

### Packaging Issues
```bash
# Check electron-builder logs
DEBUG=electron-builder pnpm package
```

### Runtime Issues
```bash
# Check application logs
# On Linux: ~/.config/Web Testing IDE/logs/
# On Windows: %APPDATA%/Web Testing IDE/logs/
# On macOS: ~/Library/Logs/Web Testing IDE/
```

### Missing Dependencies
```bash
# Reinstall all dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## Code Signing (Optional)

For production distribution, you may want to code sign your applications:

### Windows Code Signing
```bash
export WIN_CSC_LINK="path/to/certificate.p12"
export WIN_CSC_KEY_PASSWORD="certificate_password"
pnpm package:win
```

### macOS Code Signing
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
pnpm package:mac
```

See `docs/packaging.md` for detailed code signing instructions.

## Performance Testing

### Memory Usage
Monitor memory usage during recording and test execution:
```bash
# Use system monitor or htop to check memory usage
htop
```

### Large Test Suites
Test with recordings containing 50+ steps to verify performance.

### Concurrent Testing
Test running multiple test sessions simultaneously.

## Final Verification Checklist

Before distributing your IDE:

- [ ] All unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed successfully
- [ ] Packaged application works on target platforms
- [ ] Documentation is complete and accurate
- [ ] Code signing completed (if required)
- [ ] Release notes prepared
- [ ] Distribution package created with checksums

## Distribution

Your Web Testing IDE is now ready for distribution! The installers in the `dist/` directory can be:

1. **Uploaded to GitHub Releases** for public distribution
2. **Shared directly** with users via file sharing
3. **Distributed via package managers** (Chocolatey, Homebrew, etc.)
4. **Published to app stores** (Microsoft Store, Mac App Store)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review documentation in the `docs/` directory
- Create issues on the GitHub repository
- Refer to the architecture documentation for technical details

---

**Congratulations!** You now have a fully functional, production-ready Web Testing IDE that can be distributed to end users.
