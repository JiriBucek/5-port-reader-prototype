# UI Components & States

This document defines every UI component on the device screen, what sections each component has, and what each section shows in every possible state.

---

## Component Inventory

The screen has these top-level components:

| # | Component | Count | Purpose |
|---|-----------|:-----:|---------|
| 1 | **Status Bar** | 1 | Time, temperature, connectivity |
| 2 | **Channel Card** | 5 | One per physical slot - shows cassette state, progress, results |
| 3 | **Config Modal** | 0-1 | Opens when user configures a test |
| 4 | **Decision Modal** | 0-1 | Auto-opens when a result needs a user decision |
| 5 | **Full-Screen Views** | 0-1 | History, Settings, verification placeholder, curve loading |

Only one modal can be open at a time. If a new modal-triggering event occurs while one is open, it queues.

---

## Screen Layout

All 5 channel cards are in a **single horizontal row**, matching the physical arrangement of the 5 cassette slots on the device.

```
┌────────────────────────────────────────────────────────────────┐
│  Status Bar: 🕐 14:23   🌡️ 35.0°C   📶   [History] [Settings] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│  │ Card 1 │  │ Card 2 │  │ Card 3 │  │ Card 4 │  │ Card 5 │  │
│  │        │  │        │  │        │  │        │  │        │  │
│  │        │  │        │  │        │  │        │  │        │  │
│  │        │  │        │  │        │  │        │  │        │  │
│  │        │  │        │  │        │  │        │  │        │  │
│  │        │  │        │  │        │  │        │  │        │  │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

At `800px` wide with margins, each card is approximately **150px wide**. Cards use the full available height below the status bar.

---

## 1. Status Bar

Always visible at the top. Shows device-level information.

| Section | Content |
|---------|---------|
| **Time** | Current time |
| **Temperature** | Device temperature (relevant for incubation readiness) |
| **Connectivity** | Network/sync status icon |
| **Menu** | Hamburger or settings access |

---

## 2. Channel Card

The main component. Each card represents one physical cassette slot. The card has these **sections**:

### Card Sections

```
┌─────────────────────────┐
│ ① Header                │  Channel number + test type + scenario
├─────────────────────────┤
│                         │
│ ② Cassette Area         │  Visual: empty slot / cassette with
│    with Result Lines    │  substance test lines shown ON the
│                         │  cassette graphic (like the physical
│                         │  cassette). Lines appear as results
│                         │  come in across T1, T2, T3.
│                         │
├─────────────────────────┤
│ ③ Status Area           │  Current state text, progress, countdown
├─────────────────────────┤
│ ④ Group Result          │  Final result badge (when complete)
├─────────────────────────┤
│ ⑤ Action Button         │  Context-sensitive button
└─────────────────────────┘
```

### Section Details

#### ① Header
- **Channel number**: Always shown (CH 1, CH 2, etc.)
- **Test type badge**: Shows cassette type (2BC, 3BTC, 4BTCS) when known. Hidden when EMPTY.
- **Scenario badge**: Shows "Test" / "Pos Control" / "Animal Control" when configured.

#### ② Cassette Area (with Result Lines)

The cassette area is the largest section on the card. It shows a visual representation of the physical cassette, and **test result lines are rendered directly on the cassette graphic** — mirroring what the real cassette looks like after processing.

**Empty state:**
- Gray/muted empty slot placeholder — clearly "no cassette"

**Cassette present, no results yet:**
- Cassette illustration with blank line positions
- Number of line positions matches the cassette type (2 for 2BC, 3 for 3BTC, 4 for 4BTCS)

**Cassette with results:**
- Each substance line shows its result directly on the cassette:
  - **Positive**: line appears (colored red/dark)
  - **Negative**: line absent or faint (green/light)
  - **Pending**: line position shown as gray/dotted (not yet tested)
- During the confirmation flow, the cassette visual updates across tests:
  - After T1: lines show T1 results
  - After cassette swap for T2: new cassette, lines show T2 results
  - The card can also show a small **test number indicator** (T1, T2, T3) near the cassette to indicate which test is currently displayed

**Confirmation flow — showing test history:**
- When a confirmation flow is in progress (T2, T3), the current cassette's lines are shown on the main cassette graphic
- Small **mini-cassette indicators** below or beside the main cassette show previous test results at a glance:

```
  Example: After T2, card shows:

  ┌─────────────────────┐
  │  [Current cassette] │   ← T2 results on lines
  │  ┃  ┃  ╏           │   (2 pos, 1 neg for 3BTC)
  │                     │
  │  T1: ┃┃╏  T2: ┃┃╏  │   ← Mini history strip
  └─────────────────────┘
```

#### ③ Status Area
- Single-line or multi-line text showing what's happening right now
- Can include progress bars, countdowns, or loading spinners
- This area changes with every state transition

#### ④ Group Result
- Only visible when the test group is finalized
- Prominent badge: NEGATIVE (green) / POSITIVE (red) / INCONCLUSIVE (yellow)
- For control tests: shows the control result with the control type label

#### ⑤ Action Button
- Context-sensitive button at the bottom of the card
- Changes label and behavior based on the current state
- This is the primary touch target — tells the user what to do next

---

### Card States - Complete Mapping

Below is every state the card can be in and what each section shows.

#### EMPTY

| Section | Content |
|---------|---------|
| Header | "CH 1" (no type badge) |
| Cassette | Empty slot graphic, muted/gray |
| Status | — (blank or "No cassette") |
| Group Result | Hidden |
| Action Button | Hidden |

Card appearance: Muted, low contrast. Clearly "nothing here."

---

#### DETECTED (QR scanned or manual)

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge if QR scanned (e.g., "3BTC") |
| Cassette | Cassette present, blank line positions visible |
| Status | "Cassette detected" |
| Group Result | Hidden |
| Action Button | **"Configure"** |

Card appearance: Active, colored. The button draws attention.

---

#### ERROR_USED

| Section | Content |
|---------|---------|
| Header | "CH 1" + type from QR |
| Cassette | Cassette present (error styling) |
| Status | "Already used - remove cassette" |
| Group Result | Hidden |
| Action Button | Hidden (user must physically remove) |

Card appearance: Error styling (red tint).

---

#### CONFIGURING (modal open)

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge |
| Cassette | Cassette present, blank lines |
| Status | "Configuring..." |
| Group Result | Hidden |
| Action Button | Hidden (interaction is in the modal) |

Card appearance: Highlighted/selected to show which channel the modal belongs to. Other cards dimmed behind the modal overlay.

---

#### WAITING_TEMP

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge + "Test" |
| Cassette | Cassette present, lines pending (gray/dotted) |
| Status | "Waiting for temperature..." + current temp indicator |
| Group Result | Hidden |
| Action Button | Hidden (automatic, user waits) |

Card appearance: Active but waiting. Possibly pulsing or animated indicator.

---

#### INCUBATING

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge + "Test" |
| Cassette | Cassette present, lines pending (gray/dotted) |
| Status | "Incubating" + countdown timer (e.g., "1:42 remaining") |
| Group Result | Hidden |
| Action Button | Hidden (automatic, user waits) |

Card appearance: Active with visible countdown. Progress bar or circular timer.

---

#### INCUBATION_ALERT (cassette removed mid-incubation)

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge |
| Cassette | **Empty slot** (cassette was removed) |
| Status | "Reinsert cassette!" + 20-second countdown |
| Group Result | Hidden |
| Action Button | Hidden (user must reinsert physically) |

Card appearance: Urgent error styling. Flashing or prominent countdown.

---

#### READING

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge + "Test" |
| Cassette | Cassette present, lines pending (gray/dotted) |
| Status | "Reading..." + loading spinner |
| Group Result | Hidden |
| Action Button | Hidden (automatic, few seconds) |

Card appearance: Active with loading indicator.

---

#### RESULT - Test 1 Negative (flow complete)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with **T1 result lines** shown (all negative = faint/green lines) |
| Status | "Test complete" |
| Group Result | **NEGATIVE** (green badge) |
| Action Button | **"View Details"** |

Card appearance: Complete, green-tinted. Calm, resolved.

---

#### RESULT - Test 1 Positive (decision needed)

The **decision modal auto-opens** at this point. But the card underneath still shows:

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with **T1 result lines** shown (positive lines appear dark/red) |
| Status | "Test 1: Positive - Confirmation needed" |
| Group Result | Hidden (not yet determined) |
| Action Button | Hidden (decision is in the modal) |

Card appearance: Alert state, red-tinted. Modal is open on top.

---

#### AWAITING_CONFIRMATION (user chose Continue, cassette still in slot)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with T1 result lines still visible. Mini T1 history indicator. |
| Status | "Remove cassette and insert new for Test 2" |
| Group Result | Hidden |
| Action Button | Hidden (user must physically swap) |

Card appearance: Waiting state, instruction shown.

---

#### WAITING_FOR_SWAP (cassette removed, waiting for new one)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | **Empty slot**. Mini T1 history indicator remains visible. |
| Status | "Waiting for new cassette..." |
| Group Result | Hidden |
| Action Button | **"Stop"** (fallback → INCONCLUSIVE) |

Card appearance: Waiting, empty slot clearly shown. Stop button is secondary/subtle style.

---

#### READY_FOR_TEST_N (confirmation cassette inserted, checks passed)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | New cassette present, blank lines. Mini T1 history indicator shown. |
| Status | "Ready for Test 2" |
| Group Result | Hidden |
| Action Button | **"Start Test 2"** |

Card appearance: Active, ready. Button is prominent.

---

#### RESULT - Test 2 Positive (confirmed, flow complete)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with **T2 result lines** (positive). Mini history: T1 lines shown. |
| Status | "Test complete" |
| Group Result | **POSITIVE** (red badge) |
| Action Button | **"View Details"** |

Card appearance: Complete, red-tinted. Resolved.

---

#### RESULT - Test 2 Negative (tiebreaker needed, decision modal auto-opens)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with **T2 result lines** (all negative). Mini history: T1 lines shown. |
| Status | "Test 2: Negative - Tiebreaker needed" |
| Group Result | Hidden |
| Action Button | Hidden (decision is in the modal) |

Card appearance: Alert state. Modal is open on top.

---

#### RESULT - Test 3 (flow always completes)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Cassette with **T3 result lines**. Mini history: T1 + T2 lines shown. |
| Status | "Test complete" |
| Group Result | **POSITIVE** (red) or **NEGATIVE** (green) |
| Action Button | **"View Details"** |

Card appearance: Complete, color matches group result.

---

#### COMPLETE - INCONCLUSIVE (user aborted)

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Test" |
| Cassette | Last cassette lines shown (or empty if removed). Mini history for completed tests. |
| Status | "Test stopped" |
| Group Result | **INCONCLUSIVE** (yellow badge) |
| Action Button | **"View Details"** |

Card appearance: Yellow-tinted. Unresolved but final.

---

#### CONTROL RESULT

| Section | Content |
|---------|---------|
| Header | "CH 1" + "3BTC" + "Pos Control" or "Animal Control" |
| Cassette | Cassette with **result lines** shown |
| Status | "Control test complete" |
| Group Result | Result badge + control type label |
| Action Button | **"View Details"** |

Card appearance: Matches result styling (info/neutral tint for controls).

---

#### ERROR_TYPE_MISMATCH (confirmation cassette wrong type)

| Section | Content |
|---------|---------|
| Header | "CH 1" + mismatched type shown |
| Cassette | Cassette present (warning styling). Mini history for previous tests. |
| Status | "Wrong type - expected 3BTC" |
| Group Result | Hidden |
| Action Button | Hidden (user must remove and insert correct type) |

Card appearance: Warning styling (yellow/orange tint). On removal → returns to WAITING_FOR_SWAP (not EMPTY).

---

#### ERROR_USED_CONFIRMATION (used cassette during confirmation)

Same visual as ERROR_USED, but on removal → returns to **WAITING_FOR_SWAP** instead of EMPTY. The card remembers it's mid-confirmation.

| Section | Content |
|---------|---------|
| Header | "CH 1" + type from QR |
| Cassette | Cassette present (error styling). Mini history for previous tests. |
| Status | "Already used - remove cassette" |
| Group Result | Hidden |
| Action Button | Hidden (user must remove) |

Card appearance: Error styling (red tint). On removal → WAITING_FOR_SWAP.

---

#### ERROR (test interrupted)

| Section | Content |
|---------|---------|
| Header | "CH 1" + type badge |
| Cassette | Empty slot (cassette was removed) |
| Status | Error message (e.g., "Reading interrupted") |
| Group Result | Hidden |
| Action Button | **"Retry"** and **"Abort"** (two buttons) |

Card appearance: Error styling (red tint).

---

### Action Button Summary

| Card State | Button Label | Action |
|------------|-------------|--------|
| EMPTY | Hidden | — |
| DETECTED | **Configure** | Opens config modal |
| ERROR_USED | Hidden | User must remove cassette |
| CONFIGURING | Hidden | Interaction in modal |
| WAITING_TEMP | Hidden | Automatic |
| INCUBATING | Hidden | Automatic |
| INCUBATION_ALERT | Hidden | User must reinsert |
| READING | Hidden | Automatic |
| RESULT (T1 neg / complete) | **View Details** | Opens detail view |
| RESULT (T1 pos / T2 neg) | Hidden | Decision modal auto-opens |
| AWAITING_CONFIRMATION | Hidden | User must swap cassette |
| WAITING_FOR_SWAP | **Stop** | Marks INCONCLUSIVE |
| READY_FOR_TEST_N | **Start Test N** | Begins confirmation test |
| COMPLETE | **View Details** | Opens detail view |
| CONTROL RESULT | **View Details** | Opens detail view |
| ERROR | **Retry** / **Abort** | Retry restarts, Abort clears |

---

## 3. Config Modal

Opens when user taps "Configure" on a DETECTED card. Blocks interaction with other cards (overlay).

### Fields

| Field | Input Type | Source | Required |
|-------|-----------|--------|:--------:|
| **Channel** | Display only | Auto-assigned from tapped slot | — |
| **Scenario** | Segmented control | User picks: Test / Pos Control / Animal Control | Yes |
| **Test Type** | Dropdown or chips | Auto-filled from QR, or manual selection (2BC, 3BTC, 4BTCS) | Yes |
| **Sample ID** | Text input + recent chips | User types or taps recent | Yes |
| **Operator ID** | Text input + recent chips | User types or taps recent | Yes |
| **Processing** | Segmented control | Read Only / Read + Incubate | Yes |

### Buttons

| Button | Action |
|--------|--------|
| **Cancel** | Closes modal, card returns to DETECTED |
| **Start Test** | Validates fields, begins test, closes modal |

### Layout

```
┌──────────────────────────────────────┐
│           Configure Test             │
│           Channel 1                  │
├──────────────────────────────────────┤
│                                      │
│  Scenario                            │
│  [ Test ] [ Pos Control ] [ Animal ] │
│                                      │
│  Test Type                           │
│  [ 3BTC            ▼ ]              │
│                                      │
│  Sample ID                           │
│  [ __________________________ ]      │
│  Recent: [Sample 1048] [Farm A]      │
│                                      │
│  Operator                            │
│  [ __________________________ ]      │
│  Recent: [OP-001] [OP-042]           │
│                                      │
│  Processing                          │
│  [ Read + Incubate ] [ Read Only ]   │
│                                      │
├──────────────────────────────────────┤
│       [Cancel]     [Start Test →]    │
└──────────────────────────────────────┘
```

---

## 4. Decision Modal

Auto-opens when a test result requires a user choice. **Blocking** - no close button, user must pick an option.

### Variant A: After Test 1 POSITIVE

```
┌──────────────────────────────────────┐
│        Test 1 Result: POSITIVE       │
│        Channel 1 · 3BTC · Test       │
├──────────────────────────────────────┤
│                                      │
│  Substance Results:                  │
│  Beta-lactams    ████████  POSITIVE  │
│  Cephalexin      ████████  NEGATIVE  │
│  Cetiofur        ████████  NEGATIVE  │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  Confirmation required.              │
│  Insert a new cassette to confirm    │
│  this result (Test 2 of 3).         │
│                                      │
├──────────────────────────────────────┤
│  [Abort (Inconclusive)]  [Continue →]│
└──────────────────────────────────────┘
```

### Variant B: After Test 2 NEGATIVE

```
┌──────────────────────────────────────┐
│        Test 2 Result: NEGATIVE       │
│        Channel 1 · 3BTC · Test       │
├──────────────────────────────────────┤
│                                      │
│  Substance Results:                  │
│  Beta-lactams    ████████  NEGATIVE  │
│  Cephalexin      ████████  NEGATIVE  │
│  Cetiofur        ████████  NEGATIVE  │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  Conflicts with Test 1 (Positive).   │
│  Tiebreaker Test 3 needed.          │
│                                      │
│  Previous results:                   │
│  Test 1: POSITIVE                    │
│                                      │
├──────────────────────────────────────┤
│  [Abort (Inconclusive)]  [Continue →]│
└──────────────────────────────────────┘
```

### Modal Behavior

- **Auto-opens** when the triggering result is ready
- **Queues** if another modal is already open
- **No close button** - only the two action buttons
- **Shows substance-level results** so the user sees exactly what was detected
- **Shows previous test results** (in Variant B) for context
- Choosing **Abort** → group becomes INCONCLUSIVE, modal closes
- Choosing **Continue** → modal closes, card transitions to AWAITING_CONFIRMATION

---

## 5. Detail View

Opens when user taps "View Details" on a completed card. This is a regular modal (has a close button).

### Content

| Section | Content |
|---------|---------|
| **Header** | Channel, test type, scenario, group result badge |
| **Test History** | Each test with timestamp, substance-level results, individual outcome |
| **Config Summary** | Sample ID, operator, processing mode used |
| **Group Result** | Final result prominently displayed |

### Buttons

| Button | Action |
|--------|--------|
| **Close** | Closes modal |
| **Export / Share** | (Future: export result to PDF or sync) |

---

## 6. Home Navigation

History and Settings are available from the right side of the status bar on the home screen.

| Button | Purpose |
|--------|---------|
| **History** | View past test flows on this device |
| **Settings** | Device settings, verification entry point, and curve loading |
| **Verification** | Separate workflow reserved for a later pass |

---

## Component Interaction Rules

### Touch Targets
- All buttons must be minimum 44x44 pixels
- Channel cards are the primary touch targets on the home screen
- Cards must have clear tap affordance (the action button)

### Modal Priority
1. Only one modal at a time
2. Decision modals take priority over config modals (queue, don't interrupt)
3. If user taps a card while a modal is open → nothing happens (modal must be resolved first)

### Card Updates Behind Modals
- While a modal is open, **all 5 cards continue updating** in real-time
- If a cassette is inserted/removed in another channel, the card updates immediately
- Only modal-triggering events (like a result needing a decision) queue

### Removal During Modal
- If the cassette is removed from the channel whose config modal is open → modal closes, card → EMPTY
- If a cassette is removed from a *different* channel → that card updates, modal stays open

---

## Display Constraints & Feasibility

### Screen Budget

**Device**: `800 × 480` pixels (landscape, 7-inch screen)

- Status bar: `48px`
- Channel area: approximately `420px` high after padding
- Five cards in one row: approximately `150px` wide per card after gaps and screen padding

### Design Implications

- The home screen must stay extremely compact and use progressive disclosure.
- Channel headers should stay to one line of identity information.
- Status copy should stay short enough to fit in one strong line plus one helper line.
- The cassette visual remains the dominant object on each card.
- Full metadata and history belong in full-screen views and modals, not on the home screen.

### Feasibility Verdict

**The layout fits on the `800 × 480` display** if the prototype keeps its current priorities:

1. One horizontal row of five compact cards.
2. Short, direct status messages.
3. One primary action area per card.
4. Flow and test details moved into dedicated secondary screens.
5. Confirmation history shown as compact supporting context, not the main focus.
