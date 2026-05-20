# LaluZ Garage
A workshop management application built for service technicians. This app streamlines vehicle service tracking, and inventory control.

- **Frontend**: React 18
- **Runtime/Build**: Vite & TypeScript
- **Styling**: Tailwind CSS 4.0
- **DB**: Firebase
- **Typography**: Google San, Lexend
- **Icons**: Lucide React
- **Mobile**: Capacitor
  
## Project

```text
src/
├── components/       # UI Components (Inventory, ServiceHistory, Navigation, etc.)
│   └── ui/           # Shared high-precision primitive components
├── contexts/         # React Contexts for Theme, Auth, and UI state
├── lib/              # Core utilities (Firebase initialization, Tailwind merging)
├── services/         # Business logic layer (Inventory service, Service handlers)
├── types.ts          # Centralized TypeScript interfaces and enums
└── main.tsx          # Application entry point
```

## Android Development

This project is fully compatible with native Android Studio via **Capacitor**.

1. Run `npx cap sync` after local builds.
2. Use `npx cap open android` to launch the platform.
3. Build: `npm run build` and sync.

## Environment Variables

Check ".env.example"

## License
MIT License. Copyright (©) 2026 Prince Santhosh. See `LICENSE` for details.
