# Device Flow - Complete Reference

This folder contains the complete flow documentation for the 5-port milk testing reader device. It covers every state a channel can be in, every user interaction, every error case, and every possible outcome.

> **How to view the diagrams:** Open the `.mermaid` files in VS Code with the "Markdown Preview Mermaid Support" extension, or paste their contents into [mermaid.live](https://mermaid.live).

---

## Diagrams

| File | What it shows |
|------|---------------|
| [flowchart_normal_test.mermaid](flowchart_normal_test.mermaid) | Complete flow for a normal (standard) test including the confirmation loop with up to 3 tests |
| [flowchart_control_test.mermaid](flowchart_control_test.mermaid) | Single-test flow for Positive Control and Animal Control |
| [flowchart_channel_states.mermaid](flowchart_channel_states.mermaid) | High-level state machine showing all channel card states and transitions |

All three diagrams share the same color system (see [Color Legend](#color-legend) below).

---

## Device Overview

- **Display**: 7-inch touchscreen, 1280x800, landscape orientation
- **Channels**: 5 physical cassette slots, each with an independent on-screen card
- **Cassette types**: 2BC, 3BTC, 4BTCS (testing different substance combinations)
- **Test scenarios**: Standard Test, Positive Control, Animal Control
- **Processing modes**: Read Only (few seconds) or Read + Incubate (~2 min)

---

## Two Test Flows

The device supports two distinct flows, chosen at configuration time:

### 1. Normal Test (Confirmation Flow)

For standard milk testing. If the first test is positive, the user is prompted to confirm with up to 2 additional tests (3 total). The flow uses a **blocking decision modal** at each branching point.

- **Test 1 Negative** → done, group result is NEGATIVE
- **Test 1 Positive** → decision modal opens: Continue or Abort
- **Test 2 Positive** → done, group result is POSITIVE (confirmed)
- **Test 2 Negative** → conflicts with Test 1, decision modal: Continue to tiebreaker or Abort
- **Test 3 Positive** → group result is POSITIVE
- **Test 3 Negative** → group result is NEGATIVE (Test 1 was a false positive)
- **Abort at any decision point** → group result is INCONCLUSIVE

### 2. Control Test

For device verification. Single test, no confirmation. The user chooses Positive Control or Animal Control **upfront** in the config modal.

- **Positive Control**: expected result is POSITIVE (device working correctly)
- **Animal Control**: result recorded as-is

> **Mobile app difference**: In the mobile app, the user labels the test as control *after* completing it. On the reader, the user selects the control type *before* starting.

---

## All Possible Group Results (Normal Test)

| # | Path | T1 | T2 | T3 | Complete? | Group Result |
|:-:|------|:--:|:--:|:--:|:---------:|:------------:|
| 1 | T1 negative | NEG | - | - | Yes | **NEGATIVE** |
| 2 | T1 pos → abort | POS | - | - | No | **INCONCLUSIVE** |
| 3 | T1 pos → T2 positive | POS | POS | - | Yes | **POSITIVE** |
| 4 | T1 pos → T2 neg → abort | POS | NEG | - | No | **INCONCLUSIVE** |
| 5 | T1 pos → T2 neg → T3 pos | POS | NEG | POS | Yes | **POSITIVE** |
| 6 | T1 pos → T2 neg → T3 neg | POS | NEG | NEG | Yes | **NEGATIVE** |

**Key principle**: Definitive results (POSITIVE or NEGATIVE) only come from completing the flow. Stopping early always means INCONCLUSIVE.

---

## Channel States

Each of the 5 channels can be in one of these states:

| State | Description | What the card shows |
|-------|-------------|---------------------|
| **EMPTY** | No cassette in slot | Empty slot graphic, muted/gray |
| **DETECTED** | Cassette inserted, QR scanned | "Cassette detected - Tap to configure" + test type |
| **ERROR_USED** | Cassette already used (QR check) | Error: "Already used - remove and use new cassette" |
| **CONFIGURING** | Config modal open | Card highlighted, modal visible |
| **WAITING_TEMP** | Waiting for device temperature | "Waiting for temperature..." |
| **INCUBATING** | Incubation countdown running | Countdown timer (~2 min) |
| **INCUBATION_ALERT** | Cassette removed mid-incubation | 20-second alert: "Reinsert cassette!" |
| **READING** | Device reading cassette | Loading indicator (few seconds) |
| **RESULT** | Test complete | Substance-level results displayed |
| **AWAITING_CONFIRMATION** | Waiting for user to swap cassette | "Remove cassette, insert new for Test N" |
| **WAITING_FOR_SWAP** | Cassette removed, waiting for new one | "Waiting for new cassette..." + Stop button |
| **COMPLETE** | Group result finalized | Final result: NEGATIVE / POSITIVE / INCONCLUSIVE |
| **ERROR** | Test failed or interrupted | Error message with Abort / Retry options |

---

## Shared Flow Phases

Both normal and control tests share the same Phase 1-3. They only diverge at the result phase.

### Phase 1: Cassette Insertion

1. User physically inserts a cassette into a slot
2. Device hardware detects the insertion
3. If QR scanning is enabled (default): device reads the QR code
   - Checks if cassette was used before → if yes, ERROR_USED
   - If new: auto-fills test type from QR
4. If QR scanning is disabled: user must select test type manually
5. Card shows "Tap to configure"

### Phase 2: Configuration (Config Modal)

User taps the channel card to open the config modal:

- **Scenario**: Test / Positive Control / Animal Control
- **Test Type**: auto-filled from QR or selected manually (2BC, 3BTC, 4BTCS)
- **Route**: text input with recent-used chips
- **Operator ID**: text input with recent-used chips
- **Processing**: Read Only / Read + Incubate
- **Cancel** returns to DETECTED, **Start** begins the test

### Phase 3: Processing

**Read Only**: brief reading (few seconds), then result.

**Read + Incubate**:
1. Temperature gate: if device not at target temp, blocks until reached
2. Incubation countdown (~2 minutes)
3. If cassette removed during incubation: 20-second alert to reinsert
   - Reinserted in time → resume incubation
   - 20 seconds expire → TEST INTERRUPTED (Abort or Retry)
4. Incubation complete → reading (few seconds)
5. If cassette removed during reading → READING INTERRUPTED (Abort or Retry)

### Phase 4: Result (diverges by scenario)

- **Normal Test** → confirmation flow (see below)
- **Control Test** → single result, done

---

## Confirmation Flow Details

### Decision Modals

When a test result requires a user decision, a **blocking modal auto-opens**:

- **No close button** - user MUST choose one of the two options
- Shows **substance-level results** (e.g., "Beta-lactams: POSITIVE, Cephalexin: NEGATIVE")
- **Queues if busy** - if another modal is already open, waits until it closes

**After Test 1 POSITIVE:**
- Shows substance results + "Confirmation required"
- Buttons: [Abort (Inconclusive)] and [Continue Confirmation]

**After Test 2 NEGATIVE (conflicts with Test 1):**
- Shows substance results + "Results conflict with Test 1. Tiebreaker needed."
- Buttons: [Abort (Inconclusive)] and [Continue to Test 3]

### Cassette Swap for Confirmation

After the user chooses [Continue]:

1. Modal closes. Card shows "Remove cassette, insert new for Test N"
2. User removes old cassette → card transitions to WAITING FOR SWAP
3. Card shows "Waiting for new cassette..." + [Stop] button (fallback → INCONCLUSIVE)
4. User inserts new cassette → QR scan → used check → **type match check**
5. Card shows "Ready for Test N - Tap to start"
6. User taps Start → test runs with inherited config

### No Config Modal for Confirmation Tests

Test 2 and Test 3 **skip the config modal entirely**. All settings are inherited from Test 1:
- Same test type (verified by QR type match check)
- Same route
- Same operator
- Same processing option

The only checks performed on the confirmation cassette are:
1. Cassette not used before
2. Cassette type matches Test 1

### Same Slot

Confirmation tests always happen in the **same physical slot** as Test 1.

### Wait Indefinitely

The WAITING FOR SWAP state has **no timeout**. The channel waits indefinitely for a new cassette, with a visible [Stop] button as a fallback.

---

## Cassette Removal Behavior

| State when removed | What happens |
|---|---|
| **EMPTY** | Nothing (already empty) |
| **DETECTED** | Channel silently returns to EMPTY |
| **CONFIGURING** (modal open) | Modal closes, channel returns to EMPTY |
| **WAITING_TEMP** | Channel returns to EMPTY (test hadn't started) |
| **INCUBATING** | 20-second alert countdown to reinsert |
| **READING** | Error: reading interrupted (Abort / Retry) |
| **RESULT / COMPLETE** | Channel immediately clears to EMPTY |
| **AWAITING_CONFIRMATION** | Transitions to WAITING FOR SWAP (expected removal for cassette swap) |

---

## Error Handling

| Error | Trigger | User sees | Options |
|-------|---------|-----------|---------|
| **Cassette already used** | QR scan finds match in history | "Already used - use a new cassette" | Remove cassette |
| **Removed during incubation** | Physical removal mid-countdown | "Reinsert within 20 seconds!" | Reinsert or wait for timeout |
| **Incubation timeout** | 20s countdown expires | "Test interrupted" | Abort / Retry |
| **Removed during reading** | Physical removal mid-read | "Reading interrupted, result invalid" | Abort / Retry |
| **Temperature not reached** | Read+Incubate, device cold | "Waiting for temperature..." | Blocks automatically |
| **Type mismatch (confirmation)** | New cassette type differs from Test 1 | "Type mismatch" warning | Remove and try correct type |

---

## Multi-Channel Behavior

### Independence
- All 5 channels operate **completely independently**
- Each tracks its own state, test sequence, and group result
- Different channels can be at different stages simultaneously

### Modal Queuing
- Only **one modal** can be open at a time (config, decision, or detail)
- Events from other channels **queue** and open when the current modal closes
- Channel cards update in **real-time** regardless of which modal is open
- Only modal-triggering events queue; card state changes happen immediately

### Cassette Presence Indicator
The channel card must **always** clearly show whether a cassette is physically present:

| Cassette state | Visual indicator |
|---|---|
| **No cassette** | Empty slot graphic, muted/gray appearance |
| **Cassette present** | Cassette visual shown, card is active/colored |
| **Waiting for swap** | Empty slot + "Insert new cassette for Test N" + Stop button |

---

## QR Code Scanning

| Setting | Behavior |
|---------|----------|
| **QR enabled** (default) | Auto-reads QR on insertion. Test type auto-filled. Used-cassette check performed. |
| **QR disabled** | User manually selects test type in config modal. No used-cassette check. |

### QR Type Mismatch During Confirmation

If the user inserts a cassette with a **different test type** during confirmation (e.g., Test 1 was 3BTC but new cassette is 2BC), the device shows a warning. The user must remove it and insert the correct type.

---

## Processing Details

| Parameter | Value |
|-----------|-------|
| **Incubation duration** | ~2 minutes (countdown shown on card) |
| **Read Only duration** | Few seconds (loading indicator) |
| **Temperature requirement** | Device must reach target temp before incubation starts |
| **Removal grace period** | 20 seconds during incubation only |
| **Removal during Read Only** | No grace period - immediate error (reading is too brief) |

---

## Config Modal Fields

| Field | Source | Notes |
|-------|--------|-------|
| **Channel** | Auto-assigned | Locked to the physical slot that was tapped |
| **Scenario** | User selects | Test / Positive Control / Animal Control |
| **Test Type** | QR or manual | 2BC, 3BTC, 4BTCS |
| **Route** | User input | Text field with recent-used chips |
| **Operator ID** | User input | Text field with recent-used chips |
| **Processing** | User selects | Read Only / Read + Incubate |

---

## Color Legend (Diagram Styling)

All three diagrams use a unified color system:

| Color | Meaning | Used for |
|-------|---------|----------|
| Gray `#f8f9fa` | Empty | EMPTY state |
| Blue `#cce5ff` | Active | DETECTED, SCAN, READING, INCUBATE, READY |
| Purple `#e8daef` | Modal | CONFIG modal, DECISION modals |
| Light gray `#e2e3e5` | Waiting | WAITING_TEMP, AWAITING, WAITING_FOR_SWAP |
| Red `#f5c6cb` | Error | ERROR_USED, ALERT, INTERRUPTED |
| Green `#d4edda` | Negative result | GROUP RESULT: NEGATIVE |
| Red `#f8d7da` | Positive result | GROUP RESULT: POSITIVE |
| Yellow `#fff3cd` | Inconclusive | GROUP RESULT: INCONCLUSIVE |

---

## UX Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cassette detection | Show notification on card, user taps when ready | Non-intrusive, user controls when to configure |
| Control type selection | Choose upfront in config modal | Cleaner than post-test labeling |
| Clear on removal | Immediate clear to EMPTY | Simple, predictable behavior |
| Confirmation slot | Same physical slot as Test 1 | Simpler than allowing any slot |
| Confirmation config | Inherited from Test 1, no reconfiguration | Faster flow, fewer errors |
| Confirmation scope | Whole test (any substance positive = test positive) | Matches the mobile app logic |
| Decision presentation | Auto-opening blocking modal | Consistent with config modal pattern, works on small screen |
| Swap waiting | Indefinite wait with Stop button | User controls the pace |
| Multi-channel modals | One at a time, events queue | Prevents overwhelming the small display |
| Substance results | Shown per-substance in decision modal | User sees exactly what was positive/negative |
