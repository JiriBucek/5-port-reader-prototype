# Wireframe UI Guidelines

This prototype is a wireframe for a real `800 x 480` device UI. It is not a visual design exercise. Its job is to communicate:

- screen structure
- interaction order
- control sizes
- layout priority
- repeated UI patterns

The production UI should follow these rules unless there is a strong device-specific reason not to.

## Screen Rules

- Fixed screen size: `800 x 480`
- Design for touch first, not mouse first
- Prefer one clear action area per screen
- Avoid adding explanatory text unless it changes the user decision
- Keep each screen scannable in under 2 seconds

## Type Scale

Use one shared scale across the whole prototype:

- Caption: `11px`
- Secondary / chip / helper: `12px`
- Body / control text: `14px`
- Section emphasis: `16px`
- Title: `18px`
- Screen title: `22px`

Exceptions:

- Tiny labels inside cassette drawings can go below this scale because they represent the physical test object, not tappable UI

## Touch Targets

Use these minimum sizes:

- Compact touch target: `44px`
- Standard touch target: `48px`
- Large footer action: `52px`
- Non-primary chips: `32px`

Rules:

- Use `44px` only when the screen is dense and the control is still easy to isolate
- Use `48px` for normal form controls and modal actions
- Use `52px` for large footer actions when space allows

## Layout Patterns

### Channel Cards

- Channel header stays fixed and simple
- Show only the channel number and one test type line
- Do not stack multiple status badges in the header
- Status area explains current state in one primary line
- Use one secondary line only when it tells the user the next action

### Config Modal

- Modal width stays stable
- Header contains channel number, title, and scenario selector
- Body shows only the fields needed for the current test type
- Keep to a 2-column form grid
- Hide conditional sections when they are not relevant

### Picker Screens

- Use a dedicated picker instead of large inline dropdowns
- Top order:
  1. Search
  2. Brand / mode filter
  3. Recent items
  4. Result list
- Rows show one primary name and compact metadata badges

### Quantitative Flow

- Keep curve selection on one screen
- Show both options immediately:
  - saved curves
  - load new curve
- Do not bury loading behind another modal if it can fit in the same view

## Shared Component Rules

### Buttons

- Primary and secondary buttons use the same height class within a screen
- Avoid mixing large and tiny actions in the same action group
- Action wording should be short and direct

### Toggles and Segmented Controls

- Use the same segmented control pattern everywhere
- Same selected state, same border treatment, same target height
- Avoid introducing a second toggle style for the same interaction

### Inputs

- Inputs and selects share the same height and text size
- Labels stay above the field
- Recent-value chips are optional helpers, not primary actions

### Status Messages

- Prefer direct system language:
  - `QR detected`
  - `Insert a new cassette, then tap Start`
  - `Temp 40 C device, 50 C required`
- Do not explain obvious system behavior if the state already shows it

## Copy Rules

- Use verbs the operator can act on immediately
- Prefer short phrases over sentences
- Avoid filler such as:
  - "please note"
  - "you should be able to"
  - "this means that"
- Use helper text only for:
  - blocking errors
  - required next steps
  - hardware dependency states

## Prototype Consistency Checklist

Before adding or changing a screen, verify:

- Is this using the shared type scale?
- Is every touch target at least `44px` if it is interactive?
- Is the same interaction using the same control style as elsewhere?
- Is non-essential text hidden?
- Does the screen still work at `800 x 480` without overflow?
- Is the next user action obvious without reading a paragraph?
