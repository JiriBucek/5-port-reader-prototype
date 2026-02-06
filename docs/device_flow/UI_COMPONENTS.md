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
| 5 | **Bottom Navigation** | 1 | History, Settings, etc. |

Only one modal can be open at a time. If a new modal-triggering event occurs while one is open, it queues.

---

## Screen Layout

All 5 channel cards are in a **single horizontal row**, matching the physical arrangement of the 5 cassette slots on the device.

```
┌────────────────────────────────────────────────────────────────┐
│  Status Bar: 🕐 14:23        🌡️ 35.0°C        📶          ☰  │
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
├────────────────────────────────────────────────────────────────┤
│  [History]            [Settings]            [Verify]           │
└────────────────────────────────────────────────────────────────┘
```

At 1280px wide with margins, each card is approximately **220-230px wide**. Cards use the full available height between the status bar and bottom nav.

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
| **Route** | Text input + recent chips | User types or taps recent | Yes |
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
│  Route                               │
│  [ __________________________ ]      │
│  Recent: [Farm A] [Route 12]         │
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
| **Config Summary** | Route, operator, processing mode used |
| **Group Result** | Final result prominently displayed |

### Buttons

| Button | Action |
|--------|--------|
| **Close** | Closes modal |
| **Export / Share** | (Future: export result to PDF or sync) |

---

## 6. Bottom Navigation

Always visible at the bottom of the screen.

| Button | Purpose |
|--------|---------|
| **History** | View past test results |
| **Settings** | Device settings (QR on/off, calibration, etc.) |
| **Verify** | Device verification / diagnostic |

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

**Device**: 1280 x 800 pixels (landscape, 7-inch screen)

```
Total height: 800px
─ Status bar:       ~40px
─ Bottom nav:       ~50px
─ Top/bottom pad:   ~20px (10px each)
─────────────────────────
Available for cards: ~690px
```

```
Total width: 1280px
─ Left/right margin: ~20px (10px each)
─ Gaps between cards: ~40px (4 × 10px)
─────────────────────────
Available for cards: ~1220px
Per card width:      ~244px (1220 / 5)
```

### Card Section Height Budget (~690px available)

| Section | Height | Notes |
|---------|-------:|-------|
| ① Header | ~40px | Channel label + type badge + scenario badge. Single row. |
| ② Cassette Area | ~380px | Largest section. Cassette graphic + result lines + mini-history strip. |
| ③ Status Area | ~80px | 1-2 lines of text + countdown/progress bar. |
| ④ Group Result | ~50px | Badge only. Hidden in most states (collapses to 0). |
| ⑤ Action Button | ~50px | 44px min touch target + padding. Hidden in many states. |
| Padding/borders | ~40px | Internal spacing between sections. |
| **Total** | **~640px** | **Fits within 690px with ~50px spare.** |

When Group Result and Action Button are both hidden (most in-progress states), the Cassette Area and Status Area can expand to use the freed ~100px.

### Width Constraints at 244px

| Element | Fits? | Notes |
|---------|:-----:|-------|
| Header text "CH 1 · 3BTC · Test" | Yes | ~150px at 12-14px font. Room for all badges. |
| Cassette graphic with 4 lines (4BTCS) | Yes | Lines are simple horizontal bars. ~200px wide cassette works. |
| Mini-cassette history (T1 + T2 + current) | Yes | Each mini-cassette ~60px wide. 3 × 60 = 180px fits in 244px. During T2: 2 × 80px = 160px. |
| Status text "Waiting for temperature..." | Yes | Wraps to 2 lines at 14px font. 80px height handles this. |
| Status text "Remove cassette, insert new for Test 2" | Tight | Longest status message. Wraps to 2-3 lines at 13px font. Fits in 80px. |
| Two buttons side-by-side (ERROR state) | Yes | "Retry" (~60px) + "Abort" (~60px) + gap = ~130px. Fits in 244px. Can also stack vertically if needed. |
| "Start Test 2" button | Yes | Single button ~130px wide, centered. |
| Group result badge "INCONCLUSIVE" | Tight | Longest label at ~110px. Fits in 244px with padding. Use abbreviation "INCONCL." if needed. |

### Touch Target Compliance

| Element | Size | Meets 44×44 minimum? |
|---------|------|:--------------------:|
| Channel card (tap to configure) | 244 × 690px | Yes |
| Action button | 244 × 50px | Yes (full card width) |
| Stop button (WAITING_FOR_SWAP) | ~130 × 44px | Yes |
| Retry / Abort buttons (ERROR) | ~110 × 44px each | Yes |
| Bottom nav buttons | ~400 × 50px each | Yes |
| Config modal buttons | ~160 × 44px each | Yes |
| Decision modal buttons | ~200 × 44px each | Yes |

### Cassette Area Detail (380px height)

The cassette area is the most complex section. Here's how it breaks down during the most demanding state — Test 3 with history:

```
┌──────────────────────────┐
│                          │
│   ┌──────────────────┐   │  ← Current cassette: ~220px tall
│   │                  │   │    Houses up to 4 substance lines
│   │  ┃  ┃  ╏  ╏     │   │    (4BTCS cassette)
│   │                  │   │
│   └──────────────────┘   │
│          T3              │  ← Test number label: ~20px
│                          │
│   ┌──────┐  ┌──────┐    │  ← Mini-history: ~80px tall
│   │T1┃┃╏╏│  │T2┃┃╏╏│   │    2 previous cassettes at ~60×60px
│   │ POS  │  │ NEG  │    │    with mini result label underneath
│   └──────┘  └──────┘    │
│                          │
│ Total: ~340px            │  ← Fits in 380px with padding
└──────────────────────────┘
```

For simpler states (T1 only, no history), the main cassette graphic can be larger.

### Modal Sizing

Modals overlay the full screen. They don't need to fit within a single card.

| Modal | Estimated Size | Fits? |
|-------|---------------|:-----:|
| Config Modal | ~500 × 600px | Yes. Centered, leaves card edges visible. |
| Decision Modal | ~500 × 550px | Yes. Similar sizing. |
| Detail View | ~600 × 650px | Yes. Larger to show full test history. |

At 1280×800, a 500px-wide modal leaves 390px on each side — enough to see parts of the cards behind the overlay for spatial context.

### Critical Text Lengths

| Text | Characters | Fits at 244px? |
|------|:----------:|:--------------:|
| "CH 1" | 4 | Yes |
| "3BTC" | 4 | Yes |
| "Pos Control" | 11 | Yes |
| "Cassette detected" | 18 | Yes |
| "Incubating - 1:42" | 18 | Yes |
| "Waiting for temperature..." | 27 | Wraps to 2 lines |
| "Remove cassette, insert new for Test 2" | 39 | Wraps to 2-3 lines |
| "Already used - remove cassette" | 31 | Wraps to 2 lines |
| "Wrong type - expected 3BTC" | 27 | Wraps to 2 lines |
| "NEGATIVE" | 8 | Yes |
| "POSITIVE" | 8 | Yes |
| "INCONCLUSIVE" | 13 | Yes |

All text fits. Longest messages wrap to 2-3 lines which the 80px Status Area can accommodate at 13-14px font size.

### Feasibility Verdict

**The layout fits on the 7-inch 1280×800 display.** Key findings:

1. **5 cards at ~244px wide** — enough for all content including the widest cassette type (4BTCS with 4 lines)
2. **690px card height** — section budget totals ~640px, leaving room for breathing
3. **Mini-cassette history** — fits within the cassette area even at T3 (showing T1 + T2 + current)
4. **All text fits** — longest labels wrap to 2-3 lines, accommodated by the Status Area height
5. **Touch targets** — all interactive elements meet the 44×44px minimum
6. **Modals** — have ample room at ~500×600px centered on 1280×800

**One area to watch during implementation:** The Status Area text during AWAITING_CONFIRMATION states is verbose. Consider abbreviating to "Swap cassette for Test 2" if wrapping becomes visually cramped.
