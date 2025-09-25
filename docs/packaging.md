# Packaging and Distribution Guide

This guide covers how to package the Web Testing IDE for distribution across Windows, macOS, and Linux platforms.

## Prerequisites

### Development Environment
- Node.js 18+ installed
- pnpm 8+ installed
- Git for version control

### Platform-Specific Requirements

#### Windows
- Windows 10/11 or Windows Server 2019+
- Code signing certificate (optional but recommended)
- Windows SDK (for advanced features)

#### macOS
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools: `xcode-select --install`
- Apple Developer Account (for code signing and notarization)
- Valid Developer ID Application certificate

#### Linux
- Ubuntu 18.04+ / CentOS 7+ / Fedora 30+
- Build tools: `sudo apt-get install build-essential`

## Basic Packaging

### Quick Package (All Platforms)
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Package for current platform
pnpm package

# Package for all platforms (requires platform-specific tools)
pnpm package:all
```

### Platform-Specific Packaging
```bash
# Windows only
pnpm package:win

# macOS only  
pnpm package:mac

# Linux only
pnpm package:linux
```

## Code Signing Setup

### Windows Code Signing

#### Option 1: Certificate File
1. Obtain a code signing certificate (.p12 or .pfx file)
2. Set environment variables:
```bash
export WIN_CSC_LINK="path/to/certificate.p12"
export WIN_CSC_KEY_PASSWORD="certificate_password"
```

#### Option 2: Windows Certificate Store
1. Install certificate in Windows Certificate Store
2. Set environment variable:
```bash
export WIN_CSC_LINK="certificate_thumbprint"
```

#### Packaging with Code Signing
```bash
# Set environment variables
export WIN_CSC_LINK="path/to/cert.p12"
export WIN_CSC_KEY_PASSWORD="your_password"

# Package with signing
pnpm package:win
```

### macOS Code Signing and Notarization

#### Prerequisites
1. Apple Developer Account
2. Developer ID Application certificate installed in Keychain
3. App-specific password for notarization

#### Setup Environment Variables
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

#### Packaging with Notarization
```bash
# Set environment variables
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Package with signing and notarization
pnpm package:mac
```

#### Manual Notarization (if needed)
```bash
# Submit for notarization
xcrun notarytool submit "dist/Web Testing IDE-1.0.0.dmg" \
  --apple-id "your-apple-id@example.com" \
  --password "app-specific-password" \
  --team-id "XXXXXXXXXX" \
  --wait

# Staple the notarization
xcrun stapler staple "dist/Web Testing IDE-1.0.0.dmg"
```

### Linux Packaging

Linux packages don't require code signing but can be signed for additional security:

```bash
# Package for Linux
pnpm package:linux

# This creates:
# - AppImage (portable)
# - .deb (Debian/Ubuntu)
# - .rpm (Red Hat/Fedora)
```

## Advanced Configuration

### Custom Build Configuration

Create `electron-builder.env.json` for environment-specific settings:

```json
{
  "development": {
    "directories": {
      "output": "dist-dev"
    },
    "publish": null
  },
  "production": {
    "directories": {
      "output": "dist"
    },
    "publish": {
      "provider": "github"
    }
  }
}
```

### Auto-Updater Setup

The app is configured for GitHub releases auto-updates:

1. Create GitHub release with packaged files
2. App will automatically check for updates
3. Users can download and install updates

## CI/CD Integration

### GitHub Actions

The project includes automated packaging in GitHub Actions:

- **CI Workflow**: Builds and tests on all platforms
- **Release Workflow**: Creates signed packages for releases
- **E2E Workflow**: Runs end-to-end tests

### Manual Release Process

1. **Update Version**:
```bash
# Update version in package.json files
npm version patch  # or minor/major
```

2. **Create Git Tag**:
```bash
git tag v1.0.0
git push origin v1.0.0
```

3. **GitHub Actions** will automatically:
   - Build packages for all platforms
   - Sign packages (if certificates configured)
   - Create GitHub release
   - Upload artifacts

## Troubleshooting

### Common Issues

#### Windows
- **Error**: "Certificate not found"
  - **Solution**: Verify certificate path and password
  - **Check**: Certificate is valid and not expired

#### macOS
- **Error**: "Developer ID not found"
  - **Solution**: Install Developer ID certificate in Keychain
  - **Check**: Certificate is valid and matches Team ID

- **Error**: "Notarization failed"
  - **Solution**: Check app-specific password and Apple ID
  - **Check**: App meets notarization requirements

#### Linux
- **Error**: "Build tools missing"
  - **Solution**: Install build-essential package
  - **Check**: All dependencies are installed

### Debug Mode

Enable debug logging for electron-builder:

```bash
DEBUG=electron-builder pnpm package
```

### Verification

#### Windows
```bash
# Verify signature
signtool verify /pa "dist/Web Testing IDE Setup 1.0.0.exe"
```

#### macOS
```bash
# Verify signature
codesign -dv --verbose=4 "dist/Web Testing IDE-1.0.0.dmg"

# Verify notarization
spctl -a -t open --context context:primary-signature "dist/Web Testing IDE-1.0.0.dmg"
```

#### Linux
```bash
# Verify AppImage
file "dist/Web Testing IDE-1.0.0.AppImage"
```

## Distribution

### GitHub Releases
- Automated via GitHub Actions
- Includes all platform packages
- Provides download statistics
- Supports auto-updater

### Alternative Distribution
- **Windows**: Microsoft Store, Chocolatey
- **macOS**: Mac App Store, Homebrew
- **Linux**: Snap Store, Flatpak, AppImage Hub

## Security Considerations

- Always use code signing for production releases
- Keep signing certificates secure and backed up
- Use environment variables for sensitive data
- Regularly update signing certificates before expiration
- Test signed packages before distribution

## Package Verification

### Checksums
All releases include SHA256 checksums:
```bash
# Verify package integrity
sha256sum -c checksums.txt
```

### Digital Signatures
Verify package signatures before installation:
```bash
# Windows
signtool verify /pa package.exe

# macOS
codesign -dv package.dmg

# Linux
gpg --verify package.AppImage.sig package.AppImage
```

## Performance Optimization

### Build Optimization
- Use production builds for distribution
- Enable tree shaking and minification
- Optimize asset compression
- Remove development dependencies

### Package Size Reduction
- Exclude unnecessary files from packaging
- Use electron-builder file patterns
- Compress assets and resources
- Remove debug symbols in production

---

**Last Updated**: September 25, 2025
**Version**: 1.0
**Next Review**: December 25, 2025
