Hello Kiwi,

We made a clickable prototype for the new 5-slot milk testing device UI.
This is NOT the final design. It is a prototype to test how the user will interact with the device.
Please try it and then answer our 2 questions below.


=== HOW TO OPEN ===

1. Unzip "prototype.zip"
2. Open "index.html" in your web browser (Chrome, Edge, Safari)
3. No internet needed. No installation needed. Just open the file.


=== HOW TO USE ===

You will see the device screen with 5 channel slots (like the real device).

Below the device screen, there is a SIMULATION PANEL with buttons:
  - "Insert Positive" = simulate inserting a cassette with positive result
  - "Insert Negative" = simulate inserting a cassette with negative result
  - "Remove Cassette" = simulate physically removing the cassette from the slot

Try this:
  1. Click "Insert Negative" on Channel 1
  2. The device detects the cassette - click "Configure" on the card
  3. Select test type and click "Start Test"
  4. Watch the test run (temperature wait -> incubation -> reading -> result)
  5. Try "Insert Positive" on another channel to see the confirmation flow
  6. Try clicking on cards to see detail modals
  7. Try removing cassettes mid-test and use Retry/Abort/Clear to recover

The UI has one main screen with 5 slot cards. Everything happens through popup modals (configure, results, details). The user does not navigate to other screens.


=== QUESTION 1: Cassette Detection (Micro Switch) ===

IMPORTANT: This UI now supports a removal-independent fallback mode.

For example:
  - If Sensor ON: insertion detection can still assist the user
  - If Sensor OFF: user can configure/start without insertion detection
  - The user can manually clear a channel in non-running states

We know the micro switch in the DRC sometimes breaks.
We know there is an option to turn off the micro switch in that device.

Our question:
  Can the new 5-slot device RELIABLY detect if a cassette is inside or outside?
  Maybe with micro switch, maybe with QR code scanner, or another method?

  If YES = we keep this UI design (simple, fewer buttons)
  If NO = we must change the UI and add more buttons for manual control
         (this makes the screen more crowded and user needs more taps)

Please tell us: can we rely on cassette detection? How reliable is it?


=== QUESTION 2: Can You Build This UI? ===

This prototype has:
  - 5 channels running at the same time
  - Each channel has its own test progress and timers
  - Modal popups for configuration and results
  - Confirmation flow (up to 3 tests when positive result)
  - Different cassette types (2BC, 3BTC, 4BTCS)

Our question:
  Can you develop this kind of rich UI on the device hardware?
  Is the hardware powerful enough for 5 channels with modals and animations?

Even if we change the design later, we need to know:
  Can the hardware handle this level of UI complexity?

Please confirm before we continue with the design work.


Thank you!
