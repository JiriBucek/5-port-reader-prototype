# Confirmation Flow - All Possible Outcomes

## Overview

This document covers two distinct test flows on the reader device:

1. **Normal Test (Confirmation Flow)** - Up to 3 tests with a confirmation protocol
2. **Control Test** - Single test for Positive Control or Animal Control

The user chooses which flow to use **at the start** when configuring the test on the reader.

---

## 1. Normal Test - Confirmation Flow

When a milk sample tests **positive** for antibiotics or other substances in the initial (presumptive) test, the result must be confirmed through up to **2 additional tests** (3 tests total per group). At each stage of the flow, the user can either continue with confirmation or stop.

### Possible Group Results

- **NEGATIVE** - No substances detected, or initial positive disproven by confirmation
- **POSITIVE** - Substances detected and confirmed by at least one confirmation test
- **INCONCLUSIVE** - Flow was stopped before a definitive result could be reached

### Key Principle

> **Definitive results (POSITIVE or NEGATIVE) are only possible when the flow completes naturally.** If the user stops the flow at any point before it reaches a natural conclusion, the group result is always **INCONCLUSIVE**.

### Core Rules

1. **Test 1 NEGATIVE** → Group is **NEGATIVE** (done, flow complete)
2. **Test 1 POSITIVE** → Confirmation needed (Tests 2 & 3)
   - If **ANY** confirmation test (Test 2 or Test 3) is **POSITIVE** → Group is **POSITIVE** (flow complete)
   - If **BOTH** confirmation tests (Test 2 and Test 3) are **NEGATIVE** → Group is **NEGATIVE** (flow complete)
3. **Stopping the flow early** (before a natural conclusion) → Group is **INCONCLUSIVE**

---

### The Three Test Stages

| Stage | Name | Purpose | Biosample |
|-------|------|---------|-----------|
| **Test 1** | Presumptive | Initial screening test | Biosample 1 |
| **Test 2** | First Confirmation | Confirm or refute the positive from Test 1 | Biosample 2 |
| **Test 3** | Second Confirmation | Tiebreaker when Test 1 and Test 2 conflict | Biosample 3 |

---

### All Possible Paths & Outcomes

#### Path 1: Test 1 Negative
```
Test 1: NEGATIVE → ✅ Flow complete → Group Result: NEGATIVE
```
- All tested substances come back negative in the presumptive test
- No confirmation needed - the flow is naturally complete

**Group Result: NEGATIVE**

---

#### Path 2: Test 1 Positive → User Stops (No Confirmation)
```
Test 1: POSITIVE → User stops → Group Result: INCONCLUSIVE
```
- One or more substances test positive in Test 1
- User is prompted to confirm but chooses to **stop** without running confirmation tests
- The positive result was never confirmed or refuted, so the outcome is indeterminate

**Group Result: INCONCLUSIVE**

---

#### Path 3: Test 1 Positive → Test 2 Positive
```
Test 1: POSITIVE → Confirm → Test 2: POSITIVE → ✅ Flow complete → Group Result: POSITIVE
```
- Test 1 is positive, user chooses to confirm
- Test 2 (first confirmation) is also positive
- Since **any** confirmation test being positive confirms the group result, the flow is naturally complete
- No Test 3 needed

**Group Result: POSITIVE** (confirmed)

---

#### Path 4: Test 1 Positive → Test 2 Negative → User Stops
```
Test 1: POSITIVE → Confirm → Test 2: NEGATIVE → User stops → Group Result: INCONCLUSIVE
```
- Test 1 is positive, user chooses to confirm
- Test 2 (first confirmation) is negative - this **contradicts** Test 1
- A tiebreaker (Test 3) is needed, but the user chooses to **stop**
- With 1 positive and 1 negative, the result cannot be determined

**Group Result: INCONCLUSIVE**

---

#### Path 5: Test 1 Positive → Test 2 Negative → Test 3 Positive
```
Test 1: POSITIVE → Confirm → Test 2: NEGATIVE → Continue → Test 3: POSITIVE → ✅ Flow complete → Group Result: POSITIVE
```
- Test 1 is positive, user chooses to confirm
- Test 2 is negative (contradicts Test 1)
- User continues to tiebreaker Test 3
- Test 3 is positive - since **any** confirmation test is positive, the flow is naturally complete

**Group Result: POSITIVE**

---

#### Path 6: Test 1 Positive → Test 2 Negative → Test 3 Negative
```
Test 1: POSITIVE → Confirm → Test 2: NEGATIVE → Continue → Test 3: NEGATIVE → ✅ Flow complete → Group Result: NEGATIVE
```
- Test 1 is positive, user chooses to confirm
- Test 2 is negative (contradicts Test 1)
- User continues to tiebreaker Test 3
- Test 3 is also negative - since **both** confirmation tests are negative, the initial positive was a false alarm

**Group Result: NEGATIVE**

---

### Summary Table

| Path | Test 1 | Decision | Test 2 | Decision | Test 3 | Flow Complete? | Group Result |
|------|--------|----------|--------|----------|--------|:--------------:|:------------:|
| 1 | Negative | - | - | - | - | Yes | **NEGATIVE** |
| 2 | Positive | Stop | - | - | - | No | **INCONCLUSIVE** |
| 3 | Positive | Confirm | Positive | - | - | Yes | **POSITIVE** |
| 4 | Positive | Confirm | Negative | Stop | - | No | **INCONCLUSIVE** |
| 5 | Positive | Confirm | Negative | Continue | Positive | Yes | **POSITIVE** |
| 6 | Positive | Confirm | Negative | Continue | Negative | Yes | **NEGATIVE** |

---

### Outcome Distribution

| Group Result | Paths | Count | How |
|:------------:|-------|:-----:|-----|
| **NEGATIVE** | Path 1, Path 6 | 2 | Flow completed with no confirmed positives |
| **POSITIVE** | Path 3, Path 5 | 2 | Flow completed with a confirmed positive |
| **INCONCLUSIVE** | Path 2, Path 4 | 2 | User stopped flow before natural conclusion |

---

### User Decision Points

There are **two decision points** where the user controls the flow:

#### Decision Point 1: After Test 1 Positive
- **Stop** → Group marked **INCONCLUSIVE** (Path 2)
- **Continue to confirm** → Proceed to Test 2 (Paths 3-6)

#### Decision Point 2: After Test 2 Negative (conflicting with Test 1)
- **Stop** → Group marked **INCONCLUSIVE** (Path 4)
- **Continue** → Proceed to Test 3 tiebreaker (Paths 5-6)

> **Note:** After Test 2 **Positive**, there is no decision point - the flow is naturally complete and the group result is POSITIVE. After Test 3, there is no decision point either - the flow is naturally complete and the result is determined by the test outcome.

---

### Flow Diagram (Text Representation)

```
                         ┌─────────┐
                         │ Test 1  │
                         │(Screen) │
                         └────┬────┘
                              │
                         ┌────▼────┐
                    ┌────┤ Result? ├────┐
                    │    └─────────┘    │
                    │                   │
               NEGATIVE             POSITIVE
                    │                   │
                    ▼              ┌────▼──────┐
             ╔══════════╗    ┌────┤ Continue?  ├────┐
             ║ NEGATIVE ║    │    └────────────┘    │
             ╚══════════╝    │                      │
                           Stop                  Confirm
                             │                      │
                             ▼                 ┌────▼────┐
                     ╔═════════════╗           │ Test 2  │
                     ║INCONCLUSIVE ║           │(Screen) │
                     ╚═════════════╝           └────┬────┘
                                                    │
                                               ┌────▼────┐
                                          ┌────┤ Result? ├────┐
                                          │    └─────────┘    │
                                          │                   │
                                     NEGATIVE             POSITIVE
                                          │                   │
                                     ┌────▼──────┐           ▼
                                ┌────┤ Continue?  ├───┐ ╔══════════╗
                                │    └────────────┘   │ ║ POSITIVE ║
                                │                     │ ╚══════════╝
                             Stop                 Continue
                                │                     │
                                ▼                ┌────▼────┐
                        ╔═════════════╗          │ Test 3  │
                        ║INCONCLUSIVE ║          │(Screen) │
                        ╚═════════════╝          └────┬────┘
                                                      │
                                                 ┌────▼────┐
                                            ┌────┤ Result? ├────┐
                                            │    └─────────┘    │
                                            │                   │
                                       NEGATIVE             POSITIVE
                                            │                   │
                                            ▼                   ▼
                                     ╔══════════╗        ╔══════════╗
                                     ║ NEGATIVE ║        ║ POSITIVE ║
                                     ╚══════════╝        ╚══════════╝
```

---

## 2. Control Test Flow (Single Test)

Control tests are used to verify that the device is functioning correctly. They are **not** part of the confirmation flow and consist of a **single test only**.

The user selects the control test type at the start when configuring the test on the reader.

### Control Test Types

| Type | Purpose |
|------|---------|
| **Positive Control** | Verifies the device correctly detects a known positive sample |
| **Animal Control** | Tests a control sample from a specific animal |

### Control Test Flow

```
Select "Control Test" → Choose type (Positive Control / Animal Control) → Run single test → Result
```

- There is **no confirmation flow** for control tests
- The test runs once and produces a result
- After the test completes, the result is labeled with the control type

### Control Test Outcomes

| Result | Meaning |
|--------|---------|
| **Positive** | Expected result for Positive Control (device is working correctly) |
| **Negative** | Unexpected for Positive Control (may indicate device issue) |

> **Note on mobile app difference:** In the mobile app, the user labels the test as Positive Control or Animal Control *after* the test completes. On the reader device, the user chooses the test type *before* starting the test.

---

## Notes

- **Substance-level results**: Each test checks multiple substances (depending on cassette type: 2BC, 3BTC, 4BTCS). If **any** substance tests positive, the overall test result is considered positive.
- **No auto-advance**: The user must manually choose to continue at each decision point. The system never auto-advances to the next test.
- **Same cassette type**: All tests within a confirmation group should use the same cassette type as the original presumptive test.
- **Normal vs Control**: The user selects the test mode (Normal Test or Control Test) at the beginning. This determines which flow is followed.
