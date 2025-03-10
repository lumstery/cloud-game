#!/bin/bash

# Exit on error
set -e

echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y \
    pkg-config \
    libsdl2-dev \
    libx264-dev \
    libvpx-dev \
    libopus-dev \
    libgl1-mesa-dev \
    cmake \
    build-essential

echo "Building and installing libyuv..."
if [ ! -d "libyuv" ]; then
    git clone https://chromium.googlesource.com/libyuv/libyuv
fi
cd libyuv
mkdir -p build
cd build
cmake ..
make
sudo make install
cd ../..

echo "Updating pkg-config path..."
sudo ldconfig

echo "Setup complete! You can now build the project." 