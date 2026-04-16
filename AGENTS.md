# Milk Testing Device - Project Documentation

## Project Overview

This is a clickable wireframe prototype for a tablet-based hardware device that measures antibiotics and other substances in milk. The device runs on an Android tablet platform and is designed for laboratory or field testing environments.

## Purpose

The prototype serves to:
- Test and validate UX workflows
- Demonstrate device functionality to stakeholders
- Iterate on interface design before hardware implementation
- Train users on device operation

## Device Specifications

### Physical Dimensions
- **Overall Device Size**: 265.5mm × 225.7mm × 158.4mm (W × H × D)
- **Display**: 7-inch integrated screen
- **Aspect Ratio**: Wide format (landscape orientation)
- **Form Factor**: Tablet-style hardware device
- **Test Channels**: 5 slots for cassettes

### Display Specifications
- **Screen Size**: 7 inches (diagonal)
- **Estimated Resolution**: 1280 × 800 pixels (WXGA, 16:10 ratio)
- **Orientation**: Landscape (wide)
- **Touch Interface**: Yes (touchscreen)

### Testing Capabilities
- **Cassette Types**: 2BC, 3BTC, 4BTCS (multiple substance testing)
- **Test Modes**: Regular Test, Positive Control
- **Confirmation Flow**: Up to 3 tests per group for positive results
- **Results Display**: Individual substance-level positive/negative indicators
- **QR Code Scanning**: Auto-detection of cassette test type

> **Note**: Exact pixel resolution can be adjusted in `css/tablet.css` by modifying the `--tablet-width` and `--tablet-height` CSS variables.

## Technology Stack

### Frontend (Prototype)
- **HTML5**: Semantic markup and structure
- **CSS3**: Styling, layout, animations
- **Vanilla JavaScript**: Interactivity and state management
- **No frameworks**: Keeping it simple for rapid iteration

### Deployment
- Static hosting (GitHub Pages, Netlify, Vercel)
- No backend required for prototype
- No build process needed

## Project Structure

```
5port_reader_prototype/
├── claude.md              # This file - project documentation
├── README.md              # Quick start guide
├── index.html             # Main application entry point
├── start.sh               # Development server script
│
├── css/
│   ├── tablet.css         # Device dimensions and layout
│   ├── components.css     # Reusable UI components
│   └── navigation.css     # Screen transitions
│
├── js/
│   ├── navigation.js      # Screen routing logic
│   └── workflows.js       # Test workflows and state
│
├── screens/               # Additional screen templates
│   └── (to be added)
│
└── assets/
    └── images/            # Device imagery and icons
```

## Design Principles

### 1. Tablet-Optimized Interface
- Large touch targets (minimum 44×44 pixels)
- Clear visual hierarchy
- High contrast for laboratory environments
- Minimal text input (prefer selection/buttons)

### 2. Laboratory Environment Considerations
- Clean, professional aesthetic
- Status indicators for test progress
- Error states clearly marked
- Easy-to-read typography

### 3. User Experience
- Simple, linear workflows
- Minimal clicks to complete tasks
- Clear feedback on actions
- Intuitive navigation

## Key Features (To Be Implemented)

### Core Functionality
1. **Test Workflows**
   - Sample insertion/detection
   - Test execution with progress indicators
   - Result display and interpretation

2. **Test Management**
   - View test history
   - Export/print results
   - Test data validation

3. **Device Settings**
   - Calibration
   - User preferences
   - System information

### User Interface Components
- Home dashboard
- Test workflow screens (multi-step)
- Results display
- History/log viewer
- Settings panel
- Alert/notification system

## Development Workflow

### Running the Prototype
```bash
# Start local development server
./start.sh

# Or manually:
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

### Making Changes
1. Edit HTML/CSS/JS files directly
2. Refresh browser to see changes (no build step)
3. Test on actual tablet device when possible
4. Iterate based on user feedback

### Testing
- Test on Chrome/Safari (WebKit - similar to Android WebView)
- Test at actual device resolution
- Test touch interactions (or simulate with Chrome DevTools)
- Validate workflows with actual users

## Customization

### Adjusting Display Dimensions

Edit `css/tablet.css`:
```css
:root {
    --tablet-width: 1280px;   /* Adjust based on actual resolution */
    --tablet-height: 800px;   /* Adjust based on actual resolution */
}
```

### Color Scheme

Edit CSS variables in `css/tablet.css`:
```css
:root {
    --primary-color: #2563eb;      /* Main action color */
    --secondary-color: #64748b;    /* Secondary elements */
    --background-color: #f8fafc;   /* Background */
    --text-color: #1e293b;         /* Text */
    --border-color: #e2e8f0;       /* Borders */
}
```

## Next Steps

1. ✅ Project structure created
2. ✅ Basic navigation system implemented
3. ✅ Design specifications reviewed
4. ✅ UX design philosophy documented (see `docs/UX_DESIGN_PHILOSOPHY.md`)
5. ⏳ Implement 5-channel home screen layout
6. ⏳ Create test configuration modal
7. ⏳ Implement confirmation flow logic
8. ⏳ Create detail view modals
9. ⏳ Add sample data and test states
10. ⏳ User testing and iteration
11. ⏳ Deploy for stakeholder review

## Notes

- This is a **wireframe prototype** for UX testing only
- No actual hardware integration in this version
- No data persistence (can be added if needed)
- Focus on user experience and workflow validation

## Design Documentation

For detailed UX design decisions and philosophy, see:
- **[UX Design Philosophy](docs/UX_DESIGN_PHILOSOPHY.md)** - Complete design rationale and decisions

---

**Last Updated**: 2026-02-05
**Project Status**: Design Phase Complete - Ready for Implementation
