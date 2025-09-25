# Quickstart Guide for Non-Developers

This guide helps non-technical users get started with the Web Testing IDE.

## Prerequisites

- Node.js 18 or higher installed on your computer
- Basic familiarity with using a terminal/command prompt

## Installation

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

- **Left Panel**: Shows the recorded steps in a tree view
- **Right Panel**: Contains two tabs:
  - **Steps**: Visual editor for recorded steps (coming in Phase 2)
  - **Code**: Generated test code that you can view and edit

### Basic Workflow

1. Click **Record** to start capturing your interactions
2. Navigate to the website you want to test
3. Perform the actions you want to test (clicks, typing, etc.)
4. Click **Stop** when finished recording
5. Click **Generate** to create test code from your recording
6. Review the generated code in the **Code** tab
7. Click **Run** to execute your test
8. Use **Export** to save your test for later use

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
- Review the DECISIONS.md file to understand the architecture
- For issues, create a GitHub issue in the project repository

## Data Privacy

This IDE is designed to be completely local and offline:
- No data is sent to external servers
- All recordings and tests are stored locally on your computer
- No telemetry or tracking is performed
