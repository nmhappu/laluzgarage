# GearBox Workshop Manager - Mobile Instructions

This project is now configured for native Android development using **Capacitor**.

## Requirements
1. [Android Studio](https://developer.android.com/studio) installed on your local machine.
2. Java 17+ installed.

## How to open in Android Studio
1. **Export the Project**: Use the **Settings > Export to ZIP** option in AI Studio to download the entire project to your computer.
2. **Extract**: Unzip the folder on your local machine.
3. **Open Android Studio**:
   - Choose **"Open"** from the Welcome screen.
   - Select the `android` folder within your project directory.
4. **Sync Gradle**: Android Studio will automatically start syncing Gradle. Wait for this to finish.

## Workflow for Local Development
If you make changes to the React code locally:
1. Run `npm install` to install dependencies.
2. Run `npm run mobile:build` to build the web app and copy it to the Android project.
3. In Android Studio, click **"Run"** to launch on your device or emulator.

## Note on Firebase
The Firebase configuration is already included in `src/lib/firebase.ts`. Ensure your Firebase project allows traffic from your Android application's package name (`com.gearbox.workshop`).
