/* ==========================================================================
   App Controller — Event Handling, Timers, Orchestration
   5-Port Milk Testing Device Prototype
   ========================================================================== */

// ---- Initialization ----

function init() {
    initChannels();
    renderAllCards();
    renderStatusBar();
    setInterval(renderStatusBar, 30000);
    bindSimulationEvents();
}

document.addEventListener('DOMContentLoaded', init);

// ---- Simulation Event Handlers ----

function bindSimulationEvents() {
    for (let i = 1; i <= 5; i++) {
        const panel = document.getElementById(`sim-${i}`);
        if (!panel) continue;

        panel.querySelector('.sim-btn-positive').addEventListener('click', () => {
            handleInsert(i, 'positive');
        });
        panel.querySelector('.sim-btn-negative').addEventListener('click', () => {
            handleInsert(i, 'negative');
        });
        panel.querySelector('.sim-btn-remove').addEventListener('click', () => {
            handleRemove(i);
        });
    }
}

// ---- Insert Cassette ----

function handleInsert(channelId, outcome) {
    const ch = getChannel(channelId);
    if (!canInsertCassette(ch)) return;

    // Determine cassette type from simulation panel selector
    const typeSelect = document.querySelector(`#sim-${channelId} .sim-type-select select`);
    const selectedType = typeSelect ? typeSelect.value : '3BTC';

    switch (ch.state) {
        case STATES.EMPTY:
            ch.cassettePresent = true;
            ch.cassetteType = selectedType;
            ch.simulatedOutcome = outcome;
            ch.state = STATES.DETECTED;
            ch.currentTestNumber = 0;
            break;

        case STATES.WAITING_FOR_SWAP:
            ch.cassettePresent = true;
            ch.simulatedOutcome = outcome;
            const expectedType = ch.testResults[0]
                ? ch.testResults[0].cassetteType
                : ch.cassetteType;

            if (selectedType !== expectedType) {
                // Keep ch.cassetteType as the original/expected type
                ch.state = STATES.ERROR_TYPE_MISMATCH;
            } else {
                ch.cassetteType = selectedType;
                ch.state = STATES.READY_FOR_TEST_N;
            }
            break;

        case STATES.INCUBATION_ALERT:
            // Reinserting cassette during alert — resume incubation
            ch.cassettePresent = true;
            clearTimer(ch);
            ch.alertRemaining = 0;
            ch.state = STATES.INCUBATING;
            startIncubationTimer(ch);
            break;
    }

    renderCard(ch);
    renderSimulationButtons();
}

// ---- Remove Cassette ----

function handleRemove(channelId) {
    const ch = getChannel(channelId);
    if (!canRemoveCassette(ch)) return;

    // Clean up any queued modals for this channel
    modalQueue = modalQueue.filter(m => m.channelId !== channelId);

    switch (ch.state) {
        case STATES.DETECTED:
        case STATES.WAITING_TEMP:
            resetChannel(ch);
            break;

        case STATES.CONFIGURING:
            // Close config modal if open for this channel
            if (activeModal && activeModal.type === 'config' && activeModal.channelId === channelId) {
                hideModal();
            }
            resetChannel(ch);
            break;

        case STATES.ERROR_USED:
            resetChannel(ch);
            break;

        case STATES.INCUBATING:
            clearTimer(ch);
            ch.cassettePresent = false;
            ch.state = STATES.INCUBATION_ALERT;
            ch.alertRemaining = TIMING.ALERT_TIMEOUT;
            startAlertTimer(ch);
            break;

        case STATES.READING:
            clearTimer(ch);
            ch.cassettePresent = false;
            ch.state = STATES.ERROR;
            ch.errorMessage = 'Reading interrupted — result invalid';
            break;

        case STATES.RESULT:
            if (activeModal && activeModal.type === 'decision' && activeModal.channelId === channelId) {
                // Decision modal is open — keep it open, user must still choose.
                // Just mark cassette as physically removed; card updates behind modal.
                ch.cassettePresent = false;
            } else {
                resetChannel(ch);
            }
            break;

        case STATES.COMPLETE:
            if (activeModal && activeModal.channelId === channelId) {
                hideModal();
            }
            resetChannel(ch);
            break;

        case STATES.AWAITING_CONFIRMATION:
            ch.cassettePresent = false;
            ch.state = STATES.WAITING_FOR_SWAP;
            break;

        case STATES.READY_FOR_TEST_N:
            ch.cassettePresent = false;
            ch.state = STATES.WAITING_FOR_SWAP;
            break;

        case STATES.ERROR_TYPE_MISMATCH:
        case STATES.ERROR_USED_CONFIRMATION:
            ch.cassettePresent = false;
            ch.state = STATES.WAITING_FOR_SWAP;
            break;

        default:
            break;
    }

    renderCard(ch);
    renderSimulationButtons();
}

// ---- Configure Button ----

function handleConfigure(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.DETECTED) return;
    if (activeModal) return; // Another modal is open

    ch.state = STATES.CONFIGURING;
    renderCard(ch);
    showConfigModal(ch);
}

// ---- Config Modal Actions ----

function handleConfigCancel(channelId) {
    const ch = getChannel(channelId);
    hideModal();
    if (ch.state === STATES.CONFIGURING) {
        ch.state = STATES.DETECTED;
    }
    renderCard(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleConfigStart(channelId, config) {
    const ch = getChannel(channelId);
    hideModal();

    ch.scenario = config.scenario;
    ch.cassetteType = config.testType;
    ch.route = config.route;
    ch.operatorId = config.operatorId;
    ch.processing = config.processing;
    ch.currentTestNumber = 1;

    startProcessing(ch);
    renderCard(ch);
    renderSimulationButtons();
    processModalQueue();
}

// ---- Start Processing ----

function startProcessing(ch) {
    if (ch.processing === 'read_only') {
        ch.state = STATES.READING;
        renderCard(ch);
        startReadingTimer(ch);
    } else {
        // Read + Incubate
        ch.state = STATES.WAITING_TEMP;
        renderCard(ch);
        startTempWaitTimer(ch);
    }
}

// ---- Start Test N (Confirmation) ----

function handleStartTestN(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.READY_FOR_TEST_N) return;

    ch.currentTestNumber++;
    startProcessing(ch);
    renderCard(ch);
    renderSimulationButtons();
}

// ---- Timers ----

function startTempWaitTimer(ch) {
    clearTimer(ch);
    let remaining = TIMING.TEMP_WAIT;
    ch.timerId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearTimer(ch);
            ch.state = STATES.INCUBATING;
            ch.incubationRemaining = ch.incubationTotal - ch.incubationElapsed;
            renderCard(ch);
            startIncubationTimer(ch);
        }
    }, 1000);
}

function startIncubationTimer(ch) {
    clearTimer(ch);
    if (ch.incubationRemaining <= 0) {
        ch.incubationRemaining = ch.incubationTotal - ch.incubationElapsed;
    }
    ch.timerId = setInterval(() => {
        ch.incubationRemaining--;
        ch.incubationElapsed++;
        if (ch.incubationRemaining <= 0) {
            clearTimer(ch);
            ch.incubationRemaining = 0;
            ch.incubationElapsed = 0;
            // Move to reading
            ch.state = STATES.READING;
            renderCard(ch);
            startReadingTimer(ch);
            return;
        }
        renderCard(ch);
    }, 1000);
}

function startReadingTimer(ch) {
    clearTimer(ch);
    let remaining = TIMING.READING;
    ch.timerId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearTimer(ch);
            completeReading(ch);
        }
    }, 1000);
}

function startAlertTimer(ch) {
    clearTimer(ch);
    ch.timerId = setInterval(() => {
        ch.alertRemaining--;
        if (ch.alertRemaining <= 0) {
            clearTimer(ch);
            ch.state = STATES.ERROR;
            ch.errorMessage = 'Test interrupted — cassette not reinserted';
            renderCard(ch);
            renderSimulationButtons();
            return;
        }
        renderCard(ch);
    }, 1000);
}

// ---- Complete Reading ----

function completeReading(ch) {
    // Generate substance results
    const results = generateSubstanceResults(ch.cassetteType, ch.simulatedOutcome);
    const overall = isTestPositive(results) ? 'positive' : 'negative';
    const testNumber = ch.currentTestNumber;

    ch.testResults.push({
        substances: results,
        overall: overall,
        testNumber: testNumber,
        cassetteType: ch.cassetteType
    });

    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';

    if (isControl) {
        // Control test — single test, no confirmation
        ch.state = STATES.COMPLETE;
        ch.groupResult = overall;
        renderCard(ch);
        renderSimulationButtons();
        return;
    }

    // Normal test — evaluate based on test number and result
    switch (testNumber) {
        case 1:
            if (overall === 'negative') {
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'negative';
            } else {
                // Positive — need confirmation
                ch.state = STATES.RESULT;
                // Queue decision modal (Variant A)
                queueDecisionModal(ch, 'a');
            }
            break;

        case 2:
            if (overall === 'positive') {
                // Confirmed positive
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'positive';
            } else {
                // Conflicts with T1 — need tiebreaker
                ch.state = STATES.RESULT;
                // Queue decision modal (Variant B)
                queueDecisionModal(ch, 'b');
            }
            break;

        case 3:
            // Test 3 always completes the flow
            ch.state = STATES.COMPLETE;
            ch.groupResult = overall === 'positive' ? 'positive' : 'negative';
            break;
    }

    renderCard(ch);
    renderSimulationButtons();
}

// ---- Decision Modal Queue ----

function queueDecisionModal(ch, variant) {
    if (activeModal) {
        modalQueue.push({ type: 'decision', channelId: ch.id, variant });
    } else {
        showDecisionModal(ch, variant);
    }
}

function processModalQueue() {
    if (activeModal) return;
    if (modalQueue.length === 0) return;

    const next = modalQueue.shift();
    if (next.type === 'decision') {
        const ch = getChannel(next.channelId);
        // Only show if channel is still in RESULT state
        if (ch.state === STATES.RESULT) {
            showDecisionModal(ch, next.variant);
        } else {
            processModalQueue(); // skip stale entry
        }
    }
}

// ---- Decision Modal Actions ----

function handleDecisionAbort(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    if (ch.cassettePresent) {
        // Cassette still in — show INCONCLUSIVE, user removes to clear
        ch.state = STATES.COMPLETE;
        ch.groupResult = 'inconclusive';
    } else {
        // Cassette already removed while modal was open — go straight to EMPTY
        resetChannel(ch);
    }

    renderCard(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleDecisionContinue(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    ch.incubationElapsed = 0; // Reset for next test

    if (ch.cassettePresent) {
        // Normal flow — user still needs to swap cassette
        ch.state = STATES.AWAITING_CONFIRMATION;
    } else {
        // Cassette already removed while modal was open — skip ahead
        ch.state = STATES.WAITING_FOR_SWAP;
    }

    renderCard(ch);
    renderSimulationButtons();
    processModalQueue();
}

// ---- Stop Button (WAITING_FOR_SWAP) ----

function handleStop(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.WAITING_FOR_SWAP) return;
    if (activeModal) return;

    showStopConfirmationModal(ch);
}

function handleStopConfirm(channelId) {
    const ch = getChannel(channelId);
    hideModal();
    resetChannel(ch);
    renderCard(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleStopCancel(channelId) {
    hideModal();
    processModalQueue();
}

// ---- View Details ----

function handleViewDetails(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.COMPLETE) return;
    if (activeModal) return;

    showDetailModal(ch);
}

function handleCloseDetail() {
    hideModal();
    processModalQueue();
}

// ---- Error Actions ----

function handleRetry(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.ERROR) return;

    // Preserve config, go to WAITING_FOR_SWAP so user inserts cassette and retries
    // Decrement test number so next start re-runs the same test
    ch.errorMessage = '';
    ch.cassettePresent = false;
    ch.currentTestNumber--;
    ch.state = STATES.WAITING_FOR_SWAP;

    renderCard(ch);
    renderSimulationButtons();
}

function handleAbort(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.ERROR) return;

    // Both T1 and T2/T3 abort: reset to EMPTY
    // No cassette is present in ERROR state, so going to COMPLETE
    // would create a dead-end. Clear the slot entirely.
    resetChannel(ch);

    renderCard(ch);
    renderSimulationButtons();
}
