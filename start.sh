#!/bin/bash
# Simple script to start the prototype

echo "Starting Milk Testing Device Prototype..."
echo "Opening in browser at http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000
