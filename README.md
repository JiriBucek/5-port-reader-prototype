# Milk Testing Device - Wireframe Prototype

A clickable wireframe prototype for a tablet-based milk testing device that measures antibiotics and other substances in milk.

## Overview

This is a browser-based prototype designed to test UX workflows for a hardware device running on an Android tablet with a wide display.

## Technology Stack

- Plain HTML5
- CSS3 for styling and tablet layout
- Vanilla JavaScript for interactions and navigation

## Project Structure

```
/
├── index.html              # Main entry point with 5-channel layout
├── css/
│   ├── tablet.css         # Tablet dimensions and layout
│   ├── components.css     # UI components (buttons, badges, etc.)
│   ├── channel-card.css   # Channel card styles
│   ├── modals.css         # Modal and overlay styles
│   └── navigation.css     # Screen transitions
├── js/
│   ├── navigation.js      # Screen and modal navigation
│   ├── workflows.js       # Test state management
│   └── channels.js        # Channel rendering and interactions
├── docs/
│   ├── UX_DESIGN_PHILOSOPHY.md  # Complete design rationale
│   └── (design inspiration images)
├── assets/
│   └── images/            # Images and icons
└── README.md
```

## Getting Started

### Running Locally

Use a local server (required for proper JavaScript module loading):

```bash
# Option 1: Quick start script
./start.sh

# Option 2: Python server
python3 -m http.server 8000
# Then navigate to: http://localhost:8000

# Option 3: Node.js http-server
npx http-server -p 8000
```

### Development

No build process required. Make changes to HTML/CSS/JS files and refresh the browser to see updates.

## Features Implemented

### Home Screen
- **5-channel grid layout** - View all channels simultaneously
- **Real-time status display** - Time, temperature, WiFi connectivity
- **Channel cards** showing:
  - Test sequence progress (●●○ dots indicator)
  - Cassette visual representation
  - Current test results
  - Previous test results (for confirmation flow)
  - Group status (Negative 🟢 / Positive 🔴 / Pending 🟠)
- **Verification alert** - Warning when >250 tests since verification
- **Bottom navigation** - Quick access to History, Settings, Verification

### Test Configuration Modal
- **Large, future-proof modal** with extensive form fields:
  - Channel selection (1-5)
  - Test type (3BTC, 4BTCS, 2BC - QR code simulation)
  - Test scenario (Regular Test / Positive Control)
  - Route and Operator ID with recent value chips
  - Processing options (Read + Incubate / Read Only)
  - Optional Sample ID and Notes
  - Reserved space for future fields
- **Form validation** and autocomplete
- **Keyboard-friendly** text inputs

### Confirmation Flow
- **Automatic tracking** of 1-3 test sequences per channel
- **Visual progress** with sequence dots (●●○)
- **Previous results** visible on main grid cards
- **Detail modal** showing complete test history
- **Smart group logic**:
  - Test 1 negative → Group negative (done)
  - Test 1 positive → Needs Tests 2 & 3
  - Any of Tests 2 or 3 positive → Group positive
  - Both Tests 2 & 3 negative → Group negative

### Control Testing
- **Blocking modal** for control labeling (must complete)
- **Two options**: Positive Control / Animal Control
- **Immediate action** required after positive control test

### Interactive Demo
- **Channel 1**: Completed test, negative result
- **Channel 2**: Active confirmation flow (test 2 of 3) with live countdown timer
- **Channel 3**: Empty slot
- **Channel 4**: Completed 3-test confirmation sequence (final result: negative)
- **Channel 5**: Positive control awaiting labeling (click to see blocking modal)

### Interactions
- **Click any channel card** → Opens detail modal with full test history
- **Click Channel 5** → Opens control labeling modal (must label to proceed)
- **Live timer countdown** on Channel 2 (simulated incubation)
- **Status bar updates** - Real-time clock
- **Modal keyboard shortcuts** - ESC to close (except blocking modals)
- **Form helpers** - Click recent value chips to autofill

## Deployment

This prototype can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Simply upload all files to the hosting service.

## Device Specifications

- **Display**: 7-inch (1280×800px)
- **Channels**: 5 cassette slots
- **Test Types**: 2BC, 3BTC, 4BTCS (multiple substance detection)
- **Test Modes**: Regular Test, Positive Control
- **Confirmation Flow**: Up to 3 tests per group for positive results

For complete design philosophy and rationale, see [docs/UX_DESIGN_PHILOSOPHY.md](docs/UX_DESIGN_PHILOSOPHY.md)

## Notes

This is a prototype for UX testing only. No backend or data persistence is implemented.
