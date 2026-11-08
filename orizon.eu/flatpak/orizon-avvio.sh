#!/bin/sh
# Avvio di Orizon dentro Flatpak: zypak fa funzionare la sandbox di Chromium, su Wayland usa Wayland.
export TMPDIR="$XDG_RUNTIME_DIR/app/${FLATPAK_ID:-eu._4orizon.Orizon}"
if [ -n "$WAYLAND_DISPLAY" ]; then
  exec zypak-wrapper /app/orizon/orizon-desktop --ozone-platform-hint=auto --enable-wayland-ime "$@"
fi
exec zypak-wrapper /app/orizon/orizon-desktop "$@"
