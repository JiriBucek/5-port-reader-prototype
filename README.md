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
├── index.html              # Main entry point
├── css/
│   ├── tablet.css         # Tablet dimensions and layout
│   ├── components.css     # UI components (buttons, forms, etc.)
│   └── navigation.css     # Screen transitions
├── js/
│   ├── navigation.js      # Screen navigation logic
│   └── workflows.js       # Workflow interactions
├── screens/
│   └── (workflow screens will be added here)
├── assets/
│   └── images/            # Images and icons
└── README.md
```

## Getting Started

### Running Locally

Simply open `index.html` in a web browser:

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a local server (recommended)
python3 -m http.server 8000
# Then navigate to: http://localhost:8000

# Option 3: Use Node.js http-server
npx http-server -p 8000
```

### Development

No build process required. Make changes to HTML/CSS/JS files and refresh the browser to see updates.

## Deployment

This prototype can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

Simply upload all files to the hosting service.

## Device Specifications

(To be added)

## Workflows

(To be documented)

## Notes

This is a prototype for UX testing only. No backend or data persistence is implemented.
