#!/bin/bash
set -e

# Script to set up J2ME support for cloud-game
echo "Setting up J2ME support for cloud-game..."

# Create necessary directories
mkdir -p assets/cores
mkdir -p assets/cores/system
mkdir -p assets/games/j2me

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is required but not installed. Please install Java first."
    echo "For Ubuntu/Debian: sudo apt-get install default-jre"
    echo "For macOS: brew install openjdk"
    exit 1
fi

# Clone FreeJ2ME repository
echo "Cloning FreeJ2ME repository..."
git clone https://github.com/hex007/freej2me.git /tmp/freej2me

# Build FreeJ2ME JAR files
echo "Building FreeJ2ME JAR files..."
cd /tmp/freej2me
if ! command -v ant &> /dev/null; then
    echo "Apache Ant is required but not installed. Please install Ant first."
    echo "For Ubuntu/Debian: sudo apt-get install ant"
    echo "For macOS: brew install ant"
    exit 1
fi
ant

# Build libretro core
echo "Building libretro core..."
cd /tmp/freej2me/src/libretro
make

# Copy files to appropriate locations
echo "Copying files to appropriate locations..."
cp /tmp/freej2me/build/freej2me-lr.jar assets/cores/system/
cp /tmp/freej2me/src/libretro/freej2me_libretro.so assets/cores/

# Clean up
echo "Cleaning up..."
rm -rf /tmp/freej2me

echo "J2ME support setup complete!"
echo "You can now place .jar games in the assets/games/j2me directory."
echo "Restart the cloud-game service to enable J2ME support." 