# HIPAA Survey Platform - Mobile App

React Native mobile application with offline support for iOS and Android.

## Features

- **Offline Mode**: Complete surveys without internet connection
- **Auto-sync**: Automatically sync responses when online
- **Biometric Authentication**: Face ID / Touch ID for secure access
- **Encrypted Storage**: AES-256 encryption for offline data
- **PHI Protection**: Full HIPAA compliance on mobile
- **Multi-language Support**: Same i18n as web app
- **QR Code Scanner**: Scan QR codes to load surveys
- **Camera Integration**: Photo capture for file upload fields
- **E-Signature**: Touch signature fields

## Tech Stack

- **Framework**: React Native 0.72+
- **Navigation**: React Navigation 6
- **State Management**: Redux Toolkit + RTK Query
- **Offline Storage**: WatermelonDB (encrypted)
- **Authentication**: React Native Biometrics
- **HTTP Client**: Axios with retry logic
- **Camera**: react-native-vision-camera
- **QR Scanner**: react-native-vision-camera + MLKit
- **Signature**: react-native-signature-canvas
- **Encryption**: react-native-quick-crypto

## Setup

### Prerequisites

```bash
# Install dependencies
npm install

# iOS specific
cd ios && pod install && cd ..

# Android - Update local.properties with SDK path
echo "sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk" > android/local.properties
```

### Environment Variables

Create `.env` file:

```bash
API_URL=https://api.yourapp.com
WS_URL=wss://ws.yourapp.com
CLERK_PUBLISHABLE_KEY=your_clerk_key
ENCRYPTION_KEY=your_encryption_key_base64
```

### Run

```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── api/              # API clients
│   ├── components/       # Reusable components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation setup
│   ├── store/            # Redux store
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript types
├── ios/                  # iOS native code
├── android/              # Android native code
└── app.json              # App configuration
```

## Key Files

### App.tsx

Main application entry point with providers.

### src/store/index.ts

Redux store with offline persistence.

### src/services/sync.ts

Background sync service for offline responses.

### src/services/encryption.ts

Mobile encryption utilities using react-native-quick-crypto.

## Offline Mode

The app uses WatermelonDB for local storage with automatic sync:

1. User fills out survey offline
2. Response saved to local encrypted database
3. Marked as "pending sync"
4. When online, automatically syncs to server
5. Server confirms, local record marked as synced

## Security

- All PHI data encrypted at rest with AES-256
- Biometric authentication required for app access
- Session tokens stored in secure keychain
- Auto-lock after inactivity
- Wipe data after failed login attempts (optional)

## Build for Production

### iOS

```bash
# Archive and upload to App Store Connect
cd ios
fastlane ios release
```

### Android

```bash
# Build signed APK/AAB
cd android
./gradlew bundleRelease
```

## Testing

```bash
# Unit tests
npm test

# E2E tests (Detox)
npm run e2e:ios
npm run e2e:android
```

## HIPAA Compliance Checklist

- [ ] Enable device encryption (enforced by app)
- [ ] Implement biometric authentication
- [ ] Encrypt all PHI in local storage
- [ ] Implement auto-lock after inactivity
- [ ] Add remote wipe capability
- [ ] Audit all PHI access
- [ ] Implement secure key storage
- [ ] Add certificate pinning
- [ ] Test on both iOS and Android
- [ ] Complete security audit

## Links

- [React Native Documentation](https://reactnative.dev)
- [WatermelonDB](https://watermelondb.dev)
- [React Navigation](https://reactnavigation.org)
- [Redux Toolkit](https://redux-toolkit.js.org)
