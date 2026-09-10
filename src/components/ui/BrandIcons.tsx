import React from 'react';

export function WhatsAppIcon({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25.7-.99 1.29-1.74 1.45-.51.11-1.18.2-3.43-.73-2.87-1.19-4.73-4.11-4.87-4.3-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09 1-2.37.24-.25.56-.36.75-.36.19 0 .37.01.53.02.17.01.4-.07.63.48.24.58.82 2 .89 2.15.07.15.12.33.02.53-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.15-.29.31-.13.58.17.27.75 1.24 1.61 2.01 1.11.99 2.05 1.29 2.34 1.44.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.66-.14.27.1 1.72.81 2.02.96.29.14.49.22.56.34.08.13.08.76-.17 1.46" />
    </svg>
  );
}

export function OlaWatermark({ className = "h-full w-full object-contain" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <text
        x="10"
        y="45"
        fontSize="46"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        letterSpacing="2"
      >
        OLA
      </text>
    </svg>
  );
}
