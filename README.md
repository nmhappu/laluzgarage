# LaluZ Garage
A workshop management application built for service technicians. This app streamlines vehicle service tracking, and inventory control.

[Made purely with Google AI Studio (Gemini Flash 3.5 as of 24/07/26), except design and logic.]

- **Frontend**: React 18
- **Runtime/Build**: Vite & TypeScript
- **Styling**: Tailwind CSS 4.0
- **DB**: Firebase
- **Typography**: Google Sans, Lexend
- **Icons**: Lucide React
- **Mobile**: Capacitor
  
## Project

```text
src/
├── components/
│   └── ui/
├── contexts/
├── lib/
├── services/
├── types.ts
└── main.tsx
```

## Android Development

This project is fully compatible with native Android Studio via **Capacitor**.

1. Run `npx cap sync` after local builds.
2. Use `npx cap open android` to launch the platform.
3. Build: `npm run build` and sync.

## Environment Variables

Check ".env.example", Firebase DB Variables.

## License
MIT License. Copyright (c) 2026 Prince Santhosh. See `LICENSE` for details.
