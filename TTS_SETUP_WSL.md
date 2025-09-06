# TTS Setup for WSL

## Overview
This bot supports Text-to-Speech (TTS) in voice channels. When running in WSL, you need to install TTS engines to enable audio generation.

## Installation Options

### Option 1: espeak (Recommended - Lightweight)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install espeak espeak-data

# Test installation
espeak "Hello, this is a test"
```

### Option 2: Festival (More Natural Voice)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install festival festvox-kallpc16k

# Test installation
echo "Hello, this is a test" | festival --tts
```

### Option 3: No TTS (Text-Only Mode)
If you don't install any TTS engines, the bot will work in text-only mode:
- Voice channels will still be created
- Bot will join voice channels
- TTS messages will be logged as text instead of spoken
- All other functionality remains intact

## How It Works

1. **Bot in WSL**: Generates TTS audio files using available engines
2. **Discord Voice**: Bot joins voice channels and plays audio
3. **Users on PC**: Hear the TTS through Discord voice channels

## Testing TTS

After installation, test with:
```bash
# Test espeak
espeak "Testing espeak TTS engine"

# Test festival
echo "Testing festival TTS engine" | festival --tts
```

## Troubleshooting

### FFmpeg Error
If you see "FFmpeg/avconv not found!":
```bash
sudo apt install ffmpeg
```

### No Audio Output
- Ensure Discord voice settings are configured correctly
- Check that the bot has proper voice channel permissions
- Verify TTS engines are installed and working

## Fallback Behavior

The bot gracefully handles missing TTS engines:
- Logs TTS messages as text instead of crashing
- Continues all other functionality normally
- Voice channels are still created and managed properly
