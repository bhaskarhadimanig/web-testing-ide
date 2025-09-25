# Quickstart Guide for Non-Developers

This guide helps non-technical users get started with the Web Testing IDE.

## Prerequisites

- Node.js 18 or higher installed on your computer
- Basic familiarity with using a terminal/command prompt

## Installation

### Option 1: Download Pre-built Installer (Recommended)

1. **Download the installer for your platform**:
   - **Windows**: Download `Web-Testing-IDE-Setup-x.x.x.exe` from [GitHub Releases](https://github.com/bhaskarhadimanig/web-testing-ide/releases)
   - **macOS**: Download `Web-Testing-IDE-x.x.x.dmg` from [GitHub Releases](https://github.com/bhaskarhadimanig/web-testing-ide/releases)
   - **Linux**: Download `Web-Testing-IDE-x.x.x.AppImage` from [GitHub Releases](https://github.com/bhaskarhadimanig/web-testing-ide/releases)

2. **Install the application**:
   - **Windows**: Run the `.exe` installer and follow the setup wizard
   - **macOS**: Open the `.dmg` file and drag the app to Applications folder
   - **Linux**: Make the `.AppImage` executable and run it: `chmod +x Web-Testing-IDE-*.AppImage && ./Web-Testing-IDE-*.AppImage`

3. **Launch the application**:
   - Find "Web Testing IDE" in your applications menu or desktop

### Option 2: Build from Source (Developers)

1. **Download the project**
   ```bash
   git clone https://github.com/bhaskarhadimanig/web-testing-ide.git
   cd web-testing-ide
   ```

2. **Install dependencies**
   ```bash
   npm install -g pnpm
   pnpm install
   ```

3. **Launch the application**
   ```bash
   pnpm dev
   ```

## Using the IDE

### Main Interface

The Web Testing IDE has a simple interface with:

- **Top Toolbar**: Contains action buttons for recording and managing tests
  - **Record**: Start recording your interactions with a website
  - **Stop**: Stop the current recording session
  - **Generate**: Convert recorded steps into test code
  - **Run**: Execute the generated test
  - **Export**: Save your test in different formats

- **Left Panel**: Shows the recorded steps with thumbnails and editing options
- **Right Panel**: Contains two tabs:
  - **Steps**: Visual editor for recorded steps with assertion builder
  - **Code**: Generated test code with Monaco Editor for syntax highlighting

### Basic Workflow

1. Click **Record** to start capturing your interactions
2. Navigate to the website you want to test
3. Perform the actions you want to test (clicks, typing, etc.)
4. Add assertions using the **Add Assertion** button to verify expected behavior
5. Click **Stop** when finished recording
6. Review recorded steps in the **Steps** tab and edit if needed
7. Click **Generate** to create test code from your recording
8. Review the generated code in the **Code** tab with full syntax highlighting
9. Click **Run** to execute your test and view results
10. Use **Export** to save your test in different formats (Playwright, Cypress, Selenium)

## Troubleshooting

### Common Issues

**Application won't start**
- Ensure Node.js 18+ is installed
- Try deleting `node_modules` and running `pnpm install` again

**Recording doesn't work**
- Make sure you clicked the Record button before interacting with websites
- Check that the website allows automation (some sites block it)

**Tests fail to run**
- Verify the website is accessible
- Check that your recorded steps are still valid (websites change over time)

## Getting Help

- Check the main README.md for technical details
- Review the [Architecture Overview](architecture.md) to understand the system design
- Read the [Security Policy](SECURITY.md) for security best practices
- Review the [Privacy Policy](PRIVACY.md) for data handling information
- Check the [Packaging Guide](packaging.md) for distribution instructions
- For issues, create a GitHub issue in the project repository
- View the [Screenshots Walkthrough](screenshots/) for visual guides

## Data Privacy

This IDE is designed to be completely local and offline:
- No data is sent to external servers
- All recordings and tests are stored locally on your computer
- No telemetry or tracking is performed
