#!/usr/bin/env bash
# Test double for yt-dlp; FAKE_YTDLP_MODE picks success, error or hang.
set -euo pipefail

SILENT_WAV_BASE64="UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
HANG_SECONDS=60
mode="${FAKE_YTDLP_MODE:-success}"
arguments=("$@")
argument_count="${#arguments[@]}"

if [[ " $* " != *" --no-playlist "* ]]; then
  echo "ERROR: fake yt-dlp called without --no-playlist" >&2
  exit 2
fi

if [[ " $* " != *" --ignore-config "* ]]; then
  echo "ERROR: fake yt-dlp called without --ignore-config" >&2
  exit 2
fi

if [[ "$argument_count" -lt 2|| "${arguments[$((argument_count - 2))]}" != "--" ]]; then
  echo "ERROR: fake yt-dlp expects the URL right after --" >&2
  exit 2
fi

if [[ "$mode" == "error" ]]; then
  echo "WARNING: something minor" >&2
  echo "ERROR: [youtube] abc123: Video unavailable" >&2
  exit 1
fi

if [[ " $* " == *" --dump-json "* ]]; then
  if [[ "$mode" == "hang" ]]; then
    exec sleep "$HANG_SECONDS"
  fi

  echo '{"id":"abc123","title":"Epic Battle Music!","duration":125,"is_live":false}'
  exit 0
fi

output_template=""
previous=""

for argument in "$@"; do
  if [[ "$previous" == "-o" ]]; then
    output_template="$argument"
  fi

  previous="$argument"
done

echo "[youtube] abc123: Downloading webpage"
echo "rpgassets-progress:250/1000"

if [[ "$mode" == "hang" ]]; then
  exec sleep "$HANG_SECONDS"
fi

echo "rpgassets-progress:1000/1000"
echo "$SILENT_WAV_BASE64" | base64 -d > "${output_template%.%(ext)s}.wav"
