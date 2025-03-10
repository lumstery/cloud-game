# J2ME Support for Cloud-Game

This document provides instructions on how to set up and use J2ME support in the Cloud-Game platform, allowing you to play Java mobile (.jar) games through your browser.

## Prerequisites

- Java Runtime Environment (JRE)
- Apache Ant (for building FreeJ2ME)
- Git

## Setup Instructions

1. Run the setup script to install the necessary components:

```bash
./scripts/setup_j2me.sh
```

This script will:
- Check if Java is installed
- Clone and build the FreeJ2ME emulator
- Build the libretro core for FreeJ2ME
- Copy the necessary files to the appropriate locations

2. Place your .jar games in the `assets/games/j2me` directory.

3. Restart the Cloud-Game service:

```bash
# If running locally
make dev.run

# If running with Docker
make dev.run-docker
```

## Usage

1. Open the Cloud-Game web interface in your browser (default: http://localhost:8000).
2. Browse to the J2ME section.
3. Select a .jar game to play.
4. Use the following controls:
   - Arrow keys: Navigation
   - Z/X: Soft keys (left/right)
   - Enter: Select/OK
   - Backspace: Back
   - 0-9: Numeric keypad

## Troubleshooting

### Java Not Found

If you encounter errors related to Java not being found, ensure that Java is installed and in your PATH:

```bash
# Ubuntu/Debian
sudo apt-get install default-jre

# macOS
brew install openjdk
```

### FreeJ2ME Build Fails

If the build process for FreeJ2ME fails, ensure that Apache Ant is installed:

```bash
# Ubuntu/Debian
sudo apt-get install ant

# macOS
brew install ant
```

### Games Not Loading

If games are not loading, check the following:
- Ensure the .jar files are placed in the correct directory (`assets/games/j2me`)
- Verify that the FreeJ2ME libretro core is properly built and installed
- Check the logs for any specific error messages

## Advanced Configuration

You can customize the J2ME emulator settings by modifying the `pkg/config/config.yaml` file:

```yaml
j2me:
  lib: freej2me_libretro
  folder: j2me
  roms: [ "jar" ]
  options:
    "freej2me_resolution": "240x320"  # Change resolution if needed
    "freej2me_rotate": "0"            # Rotation: 0, 90, 180, 270
    "freej2me_phone": "Nokia_6230i"   # Phone model emulation
```

Available phone models include:
- Nokia_6230i (default)
- Nokia_N70
- Sony-Ericsson_K750
- Motorola_RAZR_V3

## Credits

- [FreeJ2ME](https://github.com/hex007/freej2me) - A free J2ME emulator with libretro support
- [Libretro](https://www.libretro.com) - The API used for emulator integration 