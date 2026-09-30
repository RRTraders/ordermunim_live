#!/bin/bash
# Start Xvfb virtual display in background
Xvfb :99 -screen 0 1280x800x24 -ac &
export DISPLAY=:99

# Run node server with direct stdout output
exec node server.js
