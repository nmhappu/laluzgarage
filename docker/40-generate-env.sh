#!/bin/sh
set -e

# Default port and server name if not provided
export PORT="${PORT:-2266}"
export SERVER_NAME="${SERVER_NAME:-localhost}"

OUTPUT_FILE="/usr/share/nginx/html/env-config.js"

echo "Generating runtime environment configuration for LaluZ Garage on port ${PORT}..."

TMP_FILE=$(mktemp)
echo "window.__ENV__ = {" > "$TMP_FILE"

# Collect all VITE_* and FIREBASE_* variables
env | grep -E '^(VITE_|FIREBASE_)' | sort | while IFS='=' read -r key val; do
  # Escape backslashes and double quotes
  escaped_val=$(echo "$val" | sed 's/\\/\\\\/g; s/"/\\"/g')
  echo "  \"$key\": \"$escaped_val\"," >> "$TMP_FILE"
done

echo "};" >> "$TMP_FILE"

mv "$TMP_FILE" "$OUTPUT_FILE"
chmod 644 "$OUTPUT_FILE"

echo "Runtime configuration generated successfully at ${OUTPUT_FILE}."
