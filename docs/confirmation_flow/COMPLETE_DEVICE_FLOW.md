# Complete Device Flow - All States & Transitions

> **Prototype update (no-removal detection mode):** The current interactive prototype no longer depends on removal events. Confirmation now advances through `READY_FOR_TEST_N` with explicit user actions (`Start`, `Abort`, `Clear`), and incomplete flows can be manually cleared with inconclusive recording.

## UX Decisions Made

| Decision | Choice |
|----------|--------|
| Cassette detection trigger | Show notification on channel card ("Cassette detected - tap to configure"). User taps when ready. |
| Control type selection | Choose upfront: Test / Positive Control / Animal Control in the config modal |
| Channel clear behavior | Immediate clear when cassette is physically removed |
| Confirmation slot | Always the same physical slot as Test 1 |
| Confirmation config | Same test type, sample ID, operator - no reconfiguration needed |
| Confirmation scope | Whole test - if any substance is positive, the entire test is positive |
| Multi-channel | Completely independent, all shown simultaneously on one screen |
| Modal interruptions | Events queue, wait until previous modal is closed |

---

## Channel States

A channel (physical slot + screen area) can be in one of these states:

| State | Description | What the user sees on the card |
|-------|-------------|-------------------------------|
| **EMPTY** | No cassette in slot | Empty slot indicator |
| **DETECTED** | Cassette inserted, QR scanned | "Cassette detected - Tap to configure" + test type from QR |
| **ERROR_USED** | QR check: cassette already used | Error message: "Cassette already used" |
| **CONFIGURING** | Config modal open for this channel | Card highlighted, modal open |
| **WAITING_TEMP** | Read+Incubate selected, device not at target temp | "Waiting for temperature..." |
| **INCUBATING** | Incubation countdown in progress | Countdown timer (~2 min) |
| **INCUBATION_ALERT** | Cassette removed during incubation | 20-second countdown: "Reinsert cassette!" |
| **READING** | Device is reading the cassette | Brief loading indicator (few seconds) |
| **RESULT** | Test complete, result displayed | Test result + substance breakdown |
| **AWAITING_CONFIRMATION** | Positive result, waiting for user to swap cassette | Result shown + "Insert new cassette for Test N" |
| **COMPLETE** | Group result finalized | Final group result (NEGATIVE / POSITIVE / INCONCLUSIVE) |
| **ERROR** | Test interrupted or failed | Error message with retry/abort options |

---

## Complete Flow: Normal Test

### Phase 1: Cassette Insertion & Detection

```
1. EMPTY
   │
   ├─ User inserts cassette into slot
   │
   ▼
2. Device hardware detects cassette
   │
   ├─ QR auto-scan enabled (default)?
   │   ├─ YES → Read QR code from cassette
   │   │         ├─ Check: cassette used before?
   │   │         │   ├─ YES → ERROR_USED ("Cassette already used - remove and use a new one")
   │   │         │   └─ NO → DETECTED (show test type from QR on card)
   │   │         │
   │   └─ NO (QR disabled in settings) → DETECTED (no test type shown, user picks manually)
   │
   ▼
3. DETECTED - Card shows: "Cassette detected - Tap to configure"
```

### Phase 2: Test Configuration

```
4. DETECTED
   │
   ├─ User taps channel card
   │
   ▼
5. Config modal opens (CONFIGURING):
   ┌──────────────────────────────────┐
   │ Channel: X (locked to slot)      │
   │ Test Type: [from QR / manual]    │
   │ Scenario: ○ Test  ○ Pos Control  │
   │           ○ Animal Control       │
   │ Sample ID: [text + recent chips] │
   │ Operator: [text + recent chips]  │
   │ Processing: ○ Read+Incubate      │
   │             ○ Read Only          │
   │                                  │
   │         [Cancel]  [Start Test →] │
   └──────────────────────────────────┘
   │
   ├─ User selects "Test" scenario
   ├─ User fills Sample ID, Operator
   ├─ User selects processing option
   ├─ User taps "Start Test"
   │
   ▼
6. → Go to Phase 3 (Processing)
```

### Phase 3: Processing

```
7. User selected "Read Only"?
   │
   ├─ YES → READING (brief loading, few seconds)
   │         │
   │         ▼
   │         → Go to Phase 4 (Result)
   │
   └─ NO → "Read and Incubate" selected
           │
           ├─ Device at target temperature?
           │   ├─ NO → WAITING_TEMP ("Waiting for device to reach target temperature...")
           │   │        │
           │   │        ├─ Temperature reached → Continue to incubation
           │   │        └─ (blocks until reached)
           │   │
           │   └─ YES → Continue to incubation
           │
           ▼
           INCUBATING (countdown ~2 minutes)
           │
           ├─ Cassette removed during incubation?
           │   │
           │   ▼
           │   INCUBATION_ALERT (20-second countdown)
           │   │
           │   ├─ Cassette reinserted within 20s → Resume INCUBATING
           │   └─ 20 seconds expire → ERROR ("Test interrupted - cassette removed during incubation")
           │                           │
           │                           ├─ User can: [Abort] → EMPTY (cassette removed)
           │                           └─ User can: [Retry] → Back to DETECTED
           │
           ├─ Countdown complete → READING (brief loading, few seconds)
           │
           ▼
           → Go to Phase 4 (Result)
```

### Phase 4: Result & Confirmation Flow

```
8. READING complete → RESULT
   │
   ├─ Which test number is this?
   │
   ├── TEST 1 ──────────────────────────────────
   │   │
   │   ├─ All substances NEGATIVE?
   │   │   ├─ YES → Group: NEGATIVE → COMPLETE ✅
   │   │   │        (Flow naturally complete. Channel shows final result.)
   │   │   │        (Clears to EMPTY when cassette physically removed.)
   │   │   │
   │   │   └─ NO (any substance POSITIVE) →
   │   │       AWAITING_CONFIRMATION
   │   │       Card shows: Result + "Insert new cassette for Test 2"
   │   │       │
   │   │       ├─ User removes cassette and inserts new one → Go to Phase 1 (as Test 2)
   │   │       ├─ User removes cassette and does NOT insert new one → Group: INCONCLUSIVE → COMPLETE
   │   │       └─ User taps card → Detail modal with [Continue Confirmation] / [Stop]
   │   │           ├─ [Stop] → Group: INCONCLUSIVE → COMPLETE
   │   │           └─ [Continue] → Prompt to swap cassette
   │
   ├── TEST 2 ──────────────────────────────────
   │   │
   │   ├─ Any substance POSITIVE?
   │   │   ├─ YES → Group: POSITIVE → COMPLETE ✅
   │   │   │        (Confirmed. Flow naturally complete.)
   │   │   │
   │   │   └─ NO (all substances NEGATIVE) → Contradicts Test 1
   │   │       AWAITING_CONFIRMATION
   │   │       Card shows: Result + "Insert new cassette for Test 3 (tiebreaker)"
   │   │       │
   │   │       ├─ User removes cassette and inserts new one → Go to Phase 1 (as Test 3)
   │   │       ├─ User removes cassette and does NOT insert new one → Group: INCONCLUSIVE → COMPLETE
   │   │       └─ User taps card → Detail modal with [Continue Confirmation] / [Stop]
   │   │           ├─ [Stop] → Group: INCONCLUSIVE → COMPLETE
   │   │           └─ [Continue] → Prompt to swap cassette
   │
   └── TEST 3 ──────────────────────────────────
       │
       ├─ Any substance POSITIVE?
       │   ├─ YES → Group: POSITIVE → COMPLETE ✅
       │   │
       │   └─ NO (all negative) → Group: NEGATIVE → COMPLETE ✅
       │        (Both confirmations negative. Test 1 was false positive.)
       │
       (No more tests. Flow always ends at Test 3.)
```

---

## Complete Flow: Control Test

Control tests are a **single test** with no confirmation flow.

```
1. EMPTY → Cassette inserted → DETECTED
   │
2. User taps card → Config modal opens
   │
   ├─ Scenario: "Positive Control" or "Animal Control" (chosen upfront)
   ├─ All other fields same as normal test
   │
3. User taps "Start Test" → Processing (Read Only / Read+Incubate)
   │
4. RESULT → Single test result displayed
   │
   ├─ For Positive Control: expected result is POSITIVE
   │   ├─ If POSITIVE → "✓ Control passed" (device working correctly)
   │   └─ If NEGATIVE → "⚠ Unexpected result" (device may need verification)
   │
   ├─ For Animal Control: result is recorded as-is
   │
5. COMPLETE → Clears to EMPTY when cassette removed
```

**No confirmation flow. No group result. Single test only.**

---

## Cassette Removal - All Scenarios

| Current State | What happens on removal | Group Result Impact |
|---------------|------------------------|---------------------|
| **DETECTED** | Channel clears → EMPTY | None (no test started) |
| **ERROR_USED** | Channel clears → EMPTY | None |
| **CONFIGURING** | Close modal, channel clears → EMPTY | None |
| **WAITING_TEMP** | Channel clears → EMPTY | None (test not started yet) |
| **INCUBATING** | → INCUBATION_ALERT (20s countdown) | Test interrupted if not reinserted |
| **READING** | → ERROR ("Cassette removed during reading") | Invalid result, retry or abort |
| **RESULT (T1 Negative)** | Channel clears → EMPTY | NEGATIVE (already determined) |
| **RESULT (T1 Positive)** | Group: INCONCLUSIVE → EMPTY | Flow stopped before confirmation |
| **AWAITING_CONFIRMATION (after T1+)** | Depends: swapping cassette or abandoning? | INCONCLUSIVE if abandoned |
| **AWAITING_CONFIRMATION (after T2-)** | Depends: swapping cassette or abandoning? | INCONCLUSIVE if abandoned |
| **COMPLETE (group already determined)** | Channel clears → EMPTY | No change (already finalized) |

### The Cassette Swap Challenge

During AWAITING_CONFIRMATION, the user **must** remove the old cassette to insert a new one. This means cassette removal is **expected** at this stage. The UX challenge:

> **How does the device distinguish between "swapping for confirmation" vs "abandoning the flow"?**

**Proposed approach:**
- When cassette is removed during AWAITING_CONFIRMATION:
  - Channel transitions to a "waiting for swap" state
  - Card shows: "Waiting for new cassette for Test N..." + [Stop / Mark Inconclusive] button
  - If new cassette inserted → Continue confirmation flow
  - If user taps [Stop] → Group: INCONCLUSIVE → COMPLETE
  - Channel stays in "waiting" state indefinitely until one of the above happens

---

## Error Handling

| Error | Trigger | What user sees | Options |
|-------|---------|----------------|---------|
| **Cassette already used** | QR scan finds match in device history | "This cassette has already been used. Please use a new cassette." | Remove cassette |
| **Cassette removed during incubation** | Physical removal during countdown | "Cassette removed! Reinsert within 20 seconds." (countdown) | Reinsert or wait for timeout |
| **Incubation timeout** | 20s countdown expires | "Test interrupted. Cassette was not reinserted in time." | [Abort] or [Retry with new cassette] |
| **Cassette removed during reading** | Physical removal during read | "Reading interrupted. Result invalid." | [Abort] or [Retry] |
| **Device temp not reached** | Read+Incubate selected, device cold | "Waiting for device to reach target temperature..." | Wait (blocks automatically) |

---

## Multi-Channel Behavior

### Independence
- All 5 channels operate **completely independently**
- Each channel has its own state, test sequence, and group result
- Different channels can be at different stages simultaneously

### Modal Queuing
- Only **one modal** can be open at a time
- If an event occurs on Channel 3 while Channel 1's modal is open:
  - The event is queued
  - Channel 3's card updates (e.g., shows "Cassette detected")
  - When Channel 1's modal closes, Channel 3's event can be addressed
- Events that update channel cards (state changes, results) happen **immediately** on the card, even if a modal is open for another channel. Only modal-triggering events queue.

### Screen Layout
```
┌──────────────────────────────────────┐
│ 🕐 14:23  🌡️ 35.0°C  📶        ☰  │  ← Status bar
├──────────────────────────────────────┤
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ CH 1 │  │ CH 2 │  │ CH 3 │      │  ← Row 1: Channels 1-3
│  │      │  │      │  │      │      │
│  └──────┘  └──────┘  └──────┘      │
│                                      │
│  ┌──────┐  ┌──────┐                 │
│  │ CH 4 │  │ CH 5 │                 │  ← Row 2: Channels 4-5
│  │      │  │      │                 │
│  └──────┘  └──────┘                 │
│                                      │
│  [History]  [Settings]  [Verify]     │  ← Bottom nav
└──────────────────────────────────────┘
```

---

## Incubation Details

| Parameter | Value |
|-----------|-------|
| **Incubation duration** | ~2 minutes (countdown shown) |
| **Read Only duration** | Few seconds (loading indicator) |
| **Temperature requirement** | Device must reach target temp before incubation can start |
| **Removal grace period** | 20 seconds to reinsert cassette during incubation |
| **Removal during Read Only** | No grace period - immediate error (reading is too brief) |

---

## QR Code Scanning

| Setting | Behavior |
|---------|----------|
| **QR enabled (default)** | Device automatically reads QR on cassette insertion. Test type auto-filled. |
| **QR disabled** | User must manually select test type in config modal. |

### QR Check: Used Cassette
- Device maintains a history of cassette IDs
- On every QR scan, checks if this cassette has been used before
- If used → ERROR_USED state, prevents test from starting
- User must remove the used cassette and insert a new one

---

## Confirmation Flow: Decision Modal & Cassette Swap

### Decision Modal (Auto-Opening, Blocking)

When a test result requires a user decision (T1 positive, or T2 negative), a **blocking modal auto-opens**:

- **No close button** - user MUST choose one of the two options
- **Shows substance-level results** - user sees exactly what was positive/negative
- **Queues if busy** - if another modal is open, the decision modal waits and opens when the previous modal closes
- **Same pattern as control labeling** - consistent blocking modal UX across the device

#### After Test 1 POSITIVE:
```
┌──────────────────────────────────────┐
│         Test 1 Result: POSITIVE      │
│                                      │
│   Beta-lactams ████████ POSITIVE     │
│   Cephalexin   ████████ NEGATIVE     │
│   Cetiofur     ████████ NEGATIVE     │
│                                      │
│   ─────────────────────────────────  │
│                                      │
│   Confirmation required.             │
│   Insert a new cassette to confirm   │
│   this result (Test 2 of 3).        │
│                                      │
│  ┌──────────────┐ ┌───────────────┐  │
│  │    Abort      │ │   Continue    │  │
│  │ (Inconclusive)│ │ Confirmation →│  │
│  └──────────────┘ └───────────────┘  │
└──────────────────────────────────────┘
```

#### After Test 2 NEGATIVE (conflicts with Test 1):
```
┌──────────────────────────────────────┐
│         Test 2 Result: NEGATIVE      │
│                                      │
│   Beta-lactams ████████ NEGATIVE     │
│   Cephalexin   ████████ NEGATIVE     │
│   Cetiofur     ████████ NEGATIVE     │
│                                      │
│   ─────────────────────────────────  │
│                                      │
│   Results conflict with Test 1.      │
│   Tiebreaker Test 3 needed.         │
│                                      │
│  ┌──────────────┐ ┌───────────────┐  │
│  │    Abort      │ │  Continue to  │  │
│  │ (Inconclusive)│ │   Test 3 →   │  │
│  └──────────────┘ └───────────────┘  │
└──────────────────────────────────────┘
```

### After User Chooses [Continue]

```
Step 1: Modal closes
        Card shows: "Remove cassette and insert new for Test N+1"
        Old cassette is still in the slot

Step 2: User removes old cassette
        Card transitions to WAITING FOR SWAP:
        "Waiting for new cassette for Test N+1..."
        [Stop] button visible (fallback if user changes their mind)

Step 3: User inserts new cassette → QR scan
        Check: cassette not used before
        Check: cassette type matches Test 1
        Card shows: "Ready for Test N+1 - Tap to start"
        (No config modal - settings inherited from Test 1)
        User taps Start → Test begins

Fallback: If user taps [Stop] on WAITING FOR SWAP card → INCONCLUSIVE
```

### After User Chooses [Abort]

```
Group Result: INCONCLUSIVE
Channel: COMPLETE
Clears to EMPTY when cassette removed
```

---

## Summary: All Possible Group Results for Normal Tests

| # | Path | T1 | T2 | T3 | Flow Complete? | Group Result |
|---|------|----|----|-----|:-:|:---:|
| 1 | T1 Negative | NEG | - | - | Yes | **NEGATIVE** |
| 2 | T1 Positive → Stop | POS | - | - | No | **INCONCLUSIVE** |
| 3 | T1 Positive → T2 Positive | POS | POS | - | Yes | **POSITIVE** |
| 4 | T1 Positive → T2 Negative → Stop | POS | NEG | - | No | **INCONCLUSIVE** |
| 5 | T1 Positive → T2 Negative → T3 Positive | POS | NEG | POS | Yes | **POSITIVE** |
| 6 | T1 Positive → T2 Negative → T3 Negative | POS | NEG | NEG | Yes | **NEGATIVE** |

Definitive results only when the flow completes naturally. Stopping early = INCONCLUSIVE.

---

## Resolved Questions

1. **Cassette swap during confirmation:** Waits **indefinitely** with a visible [Stop] button. No timeout.
2. **Read+Incubate during confirmation:** Same processing option as the original Test 1 config. No reconfiguration.
3. **Detail modal during confirmation swap:** Channel shows a distinct empty/waiting state. Must clearly distinguish between "cassette inside" vs "no cassette" at all times.
4. **Multiple confirmations across channels:** Handled completely independently. No coordination between channels.
