#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
src="$repo/src"

# Quarto outputs and cache
rm -rf "$src/docs" "$src/.quarto"
