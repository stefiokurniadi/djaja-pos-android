# DjajaPOS Kasir (Android)

A React Native (Expo) cashier app for DjajaPOS. It covers two features from the
web app: the **Cashier POS** (take orders and check out) and a branch-scoped
**Transaction List** with receipt reprinting. Receipts print to an EP58M 58 mm
thermal printer over Bluetooth Classic (SPP).

The app is cashier-only: only accounts with the `CASHIER` role can sign in, and
all data is automatically scoped to that cashier's branch.

## Architecture

The app talks to the existing Next.js API in the `pos-saas` project using a
stateless JWT (issued by `POST /api/auth/mobile/login`) sent as a
`Authorization: Bearer <token>` header. This is separate from the web app's
cookie-based NextAuth session.

```
LoginScreen ─▶ POST /api/auth/mobile/login  ─▶ { token, user }
PosScreen   ─▶ GET  /api/categories
            ─▶ GET  /api/products        (branch auto-scoped)
            ─▶ POST /api/transactions    (checkout)
TxScreen    ─▶ GET  /api/transactions    (own branch only)
Printing    ─▶ Bluetooth Classic (SPP) ─▶ EP58M
```

## Requirements

- Node.js 18+ and npm
- Android Studio with an emulator, or a physical Android device with USB debugging
- A running `pos-saas` backend (local or deployed)
- A cashier account (role `CASHIER`) that has a branch assigned

## Configure the API URL

The app reads the backend base URL from, in order of precedence:

1. `EXPO_PUBLIC_API_URL` environment variable
2. `expo.extra.apiUrl` in `app.json`
3. Default: `http://10.0.2.2:3000` (Android emulator → host machine's localhost)

Set it for your environment:

```bash
# Deployed backend
export EXPO_PUBLIC_API_URL="https://djaja-pos.vercel.app"

# Physical device on the same Wi-Fi as your dev machine (use your LAN IP)
export EXPO_PUBLIC_API_URL="http://192.168.1.20:3000"
```

`10.0.2.2` only works from the Android emulator. A physical device must use the
machine's LAN IP (or a public URL). CORS does not apply because React Native's
network stack is not a browser.

## Install and run

This project uses native modules (Bluetooth), so it cannot run in Expo Go. Use a
development build.

```bash
npm install

# Generate the native Android project
npx expo prebuild --platform android

# Build and run on a connected device / running emulator
npx expo run:android
```

After the first `run:android`, start the dev server for subsequent runs with:

```bash
npm start
```

## Pair the EP58M printer

1. Turn on the EP58M and load 58 mm paper.
2. On the Android device, open Settings → Bluetooth and pair with the printer
   (default PIN is usually `0000` or `1234`).
3. In the app, tap **Cetak Struk** after a sale or from a transaction's detail.
   - If exactly one printer is paired, it is used automatically and remembered.
   - If several are paired, a picker appears; your choice is remembered for next time.
4. On Android 12+ the app requests the Bluetooth permission the first time you print.

If printing fails, the app shows the reason (Bluetooth off, permission denied, no
paired printer, connection failed, or write failed).

## Test account

Use any cashier account from your backend. For a local `pos-saas` you can set a
password on an existing cashier:

```bash
# in the pos-saas project
npx tsx -e "import 'dotenv/config'; import { prisma } from './lib/db'; import bcrypt from 'bcryptjs'; (async()=>{ const h=await bcrypt.hash('cashier123',12); await prisma.user.update({ where:{ email:'kasir@toko.com' }, data:{ passwordHash:h } }); process.exit(0); })()"
```

## Production APK

Using EAS Build (recommended):

```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

Or a local Gradle release build after prebuild:

```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Project structure

```
src/
  api/            axios client (Bearer interceptor) + endpoint wrappers
  auth/           AuthContext (token + user in AsyncStorage)
  components/     shared UI (Button)
  lib/            config, money formatting, colors
  navigation/     bottom tabs (Kasir / Transaksi) + transactions stack
  printer/        ESC/POS bytes, receipt layout, Bluetooth SPP, print flow
  screens/        Login, POS, Transactions, TransactionDetail
```

The receipt layout (`printer/receipt.ts`) and ESC/POS encoder
(`printer/escpos.ts`) are ports of the same logic in the `pos-saas` web app, so
receipts match across web and mobile.
