#!/bin/bash
set -e

# Script to test J2ME support for cloud-game
echo "Testing J2ME support for cloud-game..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is required but not installed. Please install Java first."
    echo "For Ubuntu/Debian: sudo apt-get install default-jre"
    echo "For macOS: brew install openjdk"
    exit 1
fi

# Check if the FreeJ2ME libretro core exists
if [ ! -f "assets/cores/freej2me_libretro.so" ] && [ ! -f "assets/cores/freej2me_libretro.dll" ]; then
    echo "FreeJ2ME libretro core not found. Please run ./scripts/setup_j2me.sh first."
    exit 1
fi

# Check if the FreeJ2ME JAR file exists
if [ ! -f "assets/cores/system/freej2me-lr.jar" ]; then
    echo "FreeJ2ME JAR file not found. Please run ./scripts/setup_j2me.sh first."
    exit 1
fi

# Check if there are any JAR games in the j2me directory
if [ ! "$(ls -A assets/games/j2me/*.jar 2>/dev/null)" ]; then
    echo "No JAR games found in assets/games/j2me/. Please add some games."
    exit 1
fi

echo "All J2ME components are present."
echo "J2ME support should be working correctly."
echo "You can now run the cloud-game service and play J2ME games." 