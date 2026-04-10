#!/bin/bash

# Build script for Backlog Utils Chrome Extension
# Creates a zip file ready for Chrome Web Store upload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Extract version from manifest.json
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from manifest.json"
    exit 1
fi

EXTENSION_NAME="backlog-utils"
BUILD_DIR="build"
OUTPUT_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "=========================================="
echo "Building ${EXTENSION_NAME} v${VERSION}"
echo "=========================================="

# Clean and create build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Create temporary staging directory
STAGING_DIR=$(mktemp -d)
trap "rm -rf $STAGING_DIR" EXIT

# Copy necessary files to staging
echo "Copying files..."
cp manifest.json "$STAGING_DIR/"
cp README.md "$STAGING_DIR/"
cp -r src "$STAGING_DIR/"
cp -r icons "$STAGING_DIR/"

# Create zip file
echo "Creating zip: ${OUTPUT_NAME}"
cd "$STAGING_DIR"
zip -r "$SCRIPT_DIR/$BUILD_DIR/$OUTPUT_NAME" . -x "*.DS_Store" -x "__MACOSX/*"

echo ""
echo "=========================================="
echo "Build complete!"
echo "Output: $BUILD_DIR/$OUTPUT_NAME"
echo "=========================================="

# List contents
ls -lh "$SCRIPT_DIR/$BUILD_DIR/"
