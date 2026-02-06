# Device Flow - Complete Flowcharts

> **How to view:** Open the `.mermaid` files directly in VS Code with the "Markdown Preview Mermaid Support" extension, or paste their contents into [mermaid.live](https://mermaid.live) to see rendered diagrams.

---

## Diagrams

### 1. [Normal Test - Complete Flow](flowchart_normal_test.mermaid)

The full flow for a **normal test** on a single channel, including:
- Cassette insertion & QR detection
- Used cassette check
- Test configuration
- Processing (Read Only vs Read+Incubate with temperature gate)
- Incubation interruption handling (20s grace period)
- Test 1 / Test 2 / Test 3 result branching
- Confirmation loop (cassette swap back to insertion)
- All 6 group result endpoints (2 NEGATIVE, 2 POSITIVE, 2 INCONCLUSIVE)

#### Decision modals (purple nodes)

When a result requires a user decision, a **blocking modal auto-opens** (no close button - user must choose):

- **After Test 1 POSITIVE:** Modal shows substance results + "Confirmation required"
  - [Continue Confirmation] → card shows swap instructions
  - [Abort] → Group: INCONCLUSIVE

- **After Test 2 NEGATIVE** (conflicts with Test 1): Modal shows "Tiebreaker needed"
  - [Continue to Test 3] → card shows swap instructions
  - [Abort] → Group: INCONCLUSIVE

If another modal is already open, the decision modal **queues** and opens when the previous modal closes.

#### Confirmation loop

After the user chooses [Continue], the confirmation cassette follows a **shorter path** (no config modal):

1. **Decision modal** → user chooses [Continue]
2. Card shows "Remove cassette, insert new for Test N"
3. User removes old cassette → card shows "Waiting for new cassette" + [Stop] button
4. User inserts new cassette → QR scan → used check → **type match check**
5. Card shows "Ready for Test N - Tap to start" (config inherited from Test 1: same type, route, operator, processing)
6. User taps Start → test runs → result checked as Test N

**No config modal for confirmation tests.** All settings carry over from Test 1. The only checks are: cassette not used before, and cassette type matches the original.

The [Stop] button on the WAITING FOR SWAP card is a fallback in case the user changes their mind. It also leads to INCONCLUSIVE.

---

### 2. [Control Test Flow](flowchart_control_test.mermaid)

Simple **single test** flow for Positive Control and Animal Control. No confirmation. Type chosen upfront in the config modal.

#### Control result interpretation

| Control Type | Positive Result | Negative Result |
|:---:|:---:|:---:|
| **Positive Control** | Expected - device working correctly | Unexpected - device may need verification |
| **Animal Control** | Recorded as-is | Recorded as-is |

---

### 3. [Channel Card States](flowchart_channel_states.mermaid)

State machine showing all possible states a channel card can be in and the transitions between them. This is the high-level lifecycle view that covers both normal and control tests.

---

## All Possible Group Results (Normal Test)

| # | Path | T1 | T2 | T3 | Complete? | Group Result |
|:-:|------|:--:|:--:|:--:|:---------:|:------------:|
| 1 | T1 negative | NEG | — | — | Yes | **NEGATIVE** |
| 2 | T1 pos → stop | POS | — | — | No | **INCONCLUSIVE** |
| 3 | T1 pos → T2 positive | POS | POS | — | Yes | **POSITIVE** |
| 4 | T1 pos → T2 neg → stop | POS | NEG | — | No | **INCONCLUSIVE** |
| 5 | T1 pos → T2 neg → T3 pos | POS | NEG | POS | Yes | **POSITIVE** |
| 6 | T1 pos → T2 neg → T3 neg | POS | NEG | NEG | Yes | **NEGATIVE** |

---

## Cassette Presence Indicator

The channel card must **always** clearly show whether a cassette is physically present:

| Cassette State | Visual Indicator |
|:---:|---|
| **No cassette** | Empty slot graphic, muted/gray appearance |
| **Cassette present** | Cassette visual shown, card is active/colored |
| **Waiting for swap** | Empty slot + message "Insert new cassette for Test N" + Stop button |

---

## Edge Cases & Notes

### Cassette removal at each state

| State when removed | Behavior |
|---|---|
| **DETECTED** | Channel silently returns to EMPTY |
| **CONFIGURING** (modal open) | Modal closes, channel returns to EMPTY |
| **WAITING_TEMP** | Channel returns to EMPTY (test hadn't started) |
| **INCUBATING** | 20-second alert countdown (see normal test flow) |
| **READING** | Error: reading interrupted (see normal test flow) |
| **COMPLETE** | Channel immediately clears to EMPTY |

### Confirmation test config

For Test 2 and Test 3, **no config modal is shown**. All settings are inherited from Test 1:
- Same test type (verified by QR type match check)
- Same route
- Same operator
- Same processing option

The card shows "Ready for Test N - Tap to start" and one tap starts the test.

### QR type mismatch during confirmation

If the user inserts a cassette with a **different test type** during confirmation (e.g., Test 1 was 3BTC but new cassette is 2BC), the device should warn the user that the type doesn't match the original test.

### Multi-channel independence

- All 5 channels run completely independently
- Each channel tracks its own state and test sequence
- Only **one modal** open at a time - events from other channels queue
- Channel cards update in real-time regardless of which modal is open
