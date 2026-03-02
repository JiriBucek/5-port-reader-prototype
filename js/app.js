/* ==========================================================================
   App Controller — Event Handling, Timers, Orchestration
   5-Port Milk Testing Device Prototype
   ========================================================================== */

// ---- Initialization ----

function init() {
    initChannels();
    populateSimulationTypeOptions();
    renderAllCards();
    renderStatusBar();
    setInterval(renderStatusBar, 30000);
    bindSimulationEvents();
    bindStatusBarEvents();
}

document.addEventListener('DOMContentLoaded', init);

// ---- Status Bar ----

function bindStatusBarEvents() {
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn && !historyBtn.hidden) {
        historyBtn.addEventListener('click', () => {
            if (activeModal) return;
            showHistoryScreen();
        });
    }

    const settingsBtn = document.getElementById('settings-open-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (activeModal) return;
            showSettingsScreen();
        });
    }
}

function handleHistoryClose() {
    hideHistoryScreen();
    processModalQueue();
}

function handleSettingsCancel() {
    hideSettingsScreen();
    processModalQueue();
}

function handleSettingsApply(nextSettings) {
    hideSettingsScreen();

    const prevMicroswitch = deviceSettings.microswitchEnabled;
    const prevQr = deviceSettings.qrScanningEnabled;

    deviceSettings.microswitchEnabled = !!nextSettings.microswitchEnabled;
    deviceSettings.qrScanningEnabled = !!nextSettings.qrScanningEnabled;
    deviceSettings.incubationEnabled = !!nextSettings.incubationEnabled;
    deviceSettings.deviceTemperature = Number(nextSettings.deviceTemperature) || 50;

    // If microswitch turns ON, physically present cassettes can immediately become detected.
    if (!prevMicroswitch && deviceSettings.microswitchEnabled) {
        channels.forEach(ch => {
            if (ch.state === STATES.EMPTY && ch.physicalCassettePresent) {
                ch.cassettePresent = true;
                ch.state = STATES.DETECTED;
                const loadedInsertedType = getTestTypeById(ch.loadedTestTypeId);
                if (deviceSettings.qrScanningEnabled && loadedInsertedType?.qrEnabled && ch.loadedCassetteType) {
                    ch.cassetteType = ch.loadedCassetteType;
                }
            }
        });
    }

    // QR mode affects whether DETECTED channels show locked cassette type.
    if (prevQr !== deviceSettings.qrScanningEnabled) {
        channels.forEach(ch => {
            if (ch.state !== STATES.DETECTED) return;
            if (deviceSettings.qrScanningEnabled) {
                const loadedInsertedType = getTestTypeById(ch.loadedTestTypeId);
                if (loadedInsertedType?.qrEnabled) {
                    ch.cassetteType = ch.loadedCassetteType || ch.cassetteType;
                }
            } else {
                ch.cassetteType = null;
            }
        });
    }

    renderAllCards();
    renderStatusBar();
    processModalQueue();
}

// ---- Simulation Event Handlers ----

function bindSimulationEvents() {
    for (let i = 1; i <= 5; i++) {
        const panel = document.getElementById(`sim-${i}`);
        if (!panel) continue;

        const posBtn = panel.querySelector('.sim-btn-positive');
        const negBtn = panel.querySelector('.sim-btn-negative');
        const removeBtn = panel.querySelector('.sim-btn-remove');

        if (posBtn) {
            posBtn.addEventListener('click', () => {
                handleInsert(i, 'positive');
            });
        }

        if (negBtn) {
            negBtn.addEventListener('click', () => {
                handleInsert(i, 'negative');
            });
        }

        // Kept as compatibility no-op if older HTML still has this button.
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                handleRemove(i);
            });
        }
    }
}

function populateSimulationTypeOptions() {
    const options = getSimulationInsertOptions();
    if (options.length === 0) return;

    for (let i = 1; i <= 5; i++) {
        const select = document.querySelector(`#sim-${i} .sim-type-select select`);
        if (!select) continue;

        const previousValue = select.value;
        const selectedValue = options.some(option => String(option.id) === String(previousValue))
            ? Number(previousValue)
            : options[0].id;

        select.innerHTML = options.map(option =>
            `<option value="${option.id}"${option.id === selectedValue ? ' selected' : ''}>${option.label}</option>`
        ).join('');
    }
}

// ---- Cassette Insert / Replace ----

function handleInsert(channelId, outcome) {
    const ch = getChannel(channelId);
    if (!canInsertCassette(ch)) return;

    const typeSelect = document.querySelector(`#sim-${channelId} .sim-type-select select`);
    const selectedOption = getSimulationOptionById(typeSelect ? typeSelect.value : null) || getSimulationInsertOptions()[0];
    const selectedType = selectedOption?.familyHint || '3BTC';

    ch.physicalCassettePresent = true;
    ch.cassettePresent = true;
    ch.loadedCassetteId = nextCassetteId();
    ch.loadedCassetteType = selectedType;
    ch.loadedTestTypeId = selectedOption?.testType?.id || null;
    ch.simulatedOutcome = outcome;

    // QR-enabled mode auto-loads cassette type from inserted cassette.
    if (deviceSettings.qrScanningEnabled &&
        selectedOption?.testType?.qrEnabled &&
        (ch.state === STATES.EMPTY || ch.state === STATES.DETECTED || ch.currentTestNumber === 0)) {
        ch.cassetteType = selectedType;
    }

    // Detection is assistive. In manual mode, user can still configure from EMPTY.
    if (deviceSettings.microswitchEnabled && ch.state === STATES.EMPTY) {
        ch.state = STATES.DETECTED;
    }

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
}

// Physical removal simulation (debug/testing aid).
function handleRemove(channelId) {
    const ch = getChannel(channelId);
    if (!ch) return;
    if (!canRemoveCassette(ch)) return;

    // Removal is independent from UI clear/workflow.
    // We only update the physical slot state; workflow state remains unchanged.
    ch.physicalCassettePresent = false;

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

// ---- Configure Button ----

function handleConfigure(channelId) {
    const ch = getChannel(channelId);
    if (!canConfigureChannel(ch)) return;
    if (activeModal) return;

    ch.state = STATES.CONFIGURING;
    renderCard(ch);
    showConfigModal(ch);
}

// ---- Config Modal Actions ----

function handleConfigCancel(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    if (ch.state === STATES.CONFIGURING) {
        if (deviceSettings.microswitchEnabled && ch.cassettePresent) {
            ch.state = STATES.DETECTED;
        } else {
            ch.state = STATES.EMPTY;
        }
    }

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleConfigStart(channelId, config) {
    const ch = getChannel(channelId);
    hideModal();

    const selectedTestType = getTestTypeById(config.testTypeId);
    const selectedCurve = getCurveById(config.curveId);

    ch.scenario = config.scenario;
    ch.testTypeId = selectedTestType ? selectedTestType.id : null;
    ch.testTypeName = selectedTestType ? selectedTestType.name : (config.testTypeName || config.testType);
    ch.curveId = selectedTestType?.quantitative ? (selectedCurve?.id || null) : null;
    ch.curveName = selectedTestType?.quantitative ? (selectedCurve?.name || '') : '';
    ch.curveSource = selectedTestType?.quantitative ? (selectedCurve?.source || '') : '';
    ch.cassetteType = selectedTestType ? selectedTestType.cassetteType : normalizeLoadedCassetteType(config.testType);
    ch.route = config.route;
    ch.operatorId = config.operatorId;
    ch.processing = (config.processing === 'read_incubate' && !deviceSettings.incubationEnabled)
        ? 'read_only'
        : config.processing;
    ch.currentTestNumber = 1;

    if (ch.testTypeId) {
        rememberRecentTestType(ch.testTypeId);
    }
    if (ch.curveId) {
        rememberQuantCurve(ch.curveId);
    }

    const started = attemptStartCurrentTest(ch);

    if (!started) {
        renderCard(ch);
        renderSlot(ch);
        renderSimulationButtons();
        processModalQueue();
        return;
    }

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

// ---- Start Processing ----

function startProcessing(ch) {
    if (ch.processing === 'read_only') {
        ch.state = STATES.READING;
        renderCard(ch);
        renderSlot(ch);
        startReadingTimer(ch);
    } else {
        // Temperature is validated before start; incubation can begin immediately.
        ch.state = STATES.INCUBATING;
        ch.incubationRemaining = ch.incubationTotal;
        ch.incubationElapsed = 0;
        renderCard(ch);
        renderSlot(ch);
        startIncubationTimer(ch);
    }
}

function hasReadableCassette(ch) {
    return ch.cassettePresent &&
           ch.physicalCassettePresent &&
           ch.loadedCassetteId !== null;
}

function validateCassetteForCurrentTest(ch) {
    const temperatureValidation = getTemperatureValidation(ch.testTypeId, ch.cassetteType);
    if (!temperatureValidation.ok) {
        const selectedTestType = ch.testTypeName || ch.cassetteType;
        return {
            ok: false,
            message: `Device is at ${temperatureValidation.currentTemperature} C. Heat reader to ${temperatureValidation.requiredTemperature} C for ${selectedTestType}.`
        };
    }

    if (!hasReadableCassette(ch)) {
        return {
            ok: false,
            message: 'Cassette could not be read. Insert cassette and retry.'
        };
    }

    if (deviceSettings.qrScanningEnabled && usedCassetteIds.has(ch.loadedCassetteId)) {
        return {
            ok: false,
            message: 'Cassette already used. Insert a new cassette and retry.'
        };
    }

    const expectedType = normalizeLoadedCassetteType(
        ch.currentTestNumber > 1
            ? (ch.testResults[0] ? ch.testResults[0].cassetteType : ch.cassetteType)
            : ch.cassetteType
    );
    const expectedTypeLabel =
        (ch.currentTestNumber > 1 ? ch.testResults[0]?.testTypeName : ch.testTypeName) ||
        ch.testTypeName ||
        expectedType;

    const loadedType = normalizeLoadedCassetteType(ch.loadedCassetteType || ch.cassetteType);

    // Type mismatch is only enforceable when QR scanning is enabled, and only for confirmation tests.
    if (deviceSettings.qrScanningEnabled &&
        ch.currentTestNumber > 1 &&
        expectedType && loadedType && expectedType !== loadedType) {
        return {
            ok: false,
            message: `Wrong cassette type. Expected ${expectedTypeLabel}.`
        };
    }

    return { ok: true };
}

function setChannelError(ch, message) {
    clearTimer(ch);
    ch.state = STATES.ERROR;
    ch.errorMessage = message;
}

function attemptStartCurrentTest(ch) {
    const validation = validateCassetteForCurrentTest(ch);
    if (!validation.ok) {
        setChannelError(ch, validation.message);
        return false;
    }

    startProcessing(ch);
    return true;
}

// ---- Start Test N (Confirmation) ----

function handleStartTestN(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.READY_FOR_TEST_N) return;

    ch.currentTestNumber++;
    const started = attemptStartCurrentTest(ch);

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();

    if (!started) return;
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

            if (!hasReadableCassette(ch)) {
                setChannelError(ch, 'Cassette read failed after incubation. Retry or abort.');
                renderCard(ch);
                renderSlot(ch);
                renderSimulationButtons();
                return;
            }

            ch.state = STATES.READING;
            renderCard(ch);
            renderSlot(ch);
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

            if (!hasReadableCassette(ch)) {
                setChannelError(ch, 'Reading interrupted. Retry or abort.');
                renderCard(ch);
                renderSlot(ch);
                renderSimulationButtons();
                return;
            }

            completeReading(ch);
        }
    }, 1000);
}

// ---- Complete Reading ----

function completeReading(ch) {
    const outcome = ch.simulatedOutcome || 'negative';
    const results = generateSubstanceResults(ch.testTypeId, ch.cassetteType, outcome);
    const overall = isTestPositive(results) ? 'positive' : 'negative';
    const testNumber = ch.currentTestNumber;

    ch.testResults.push({
        substances: results,
        overall,
        testNumber,
        cassetteType: ch.cassetteType,
        testTypeId: ch.testTypeId,
        testTypeName: ch.testTypeName
    });

    if (ch.loadedCassetteId !== null) {
        usedCassetteIds.add(ch.loadedCassetteId);
    }

    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';

    if (isControl) {
        ch.state = STATES.COMPLETE;
        ch.groupResult = overall;
        renderCard(ch);
        renderSlot(ch);
        renderSimulationButtons();
        return;
    }

    switch (testNumber) {
        case 1:
            if (overall === 'negative') {
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'negative';
            } else {
                ch.state = STATES.RESULT;
                queueDecisionModal(ch, 'a');
            }
            break;

        case 2:
            if (overall === 'positive') {
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'positive';
            } else {
                ch.state = STATES.RESULT;
                queueDecisionModal(ch, 'b');
            }
            break;

        case 3:
            ch.state = STATES.COMPLETE;
            ch.groupResult = overall === 'positive' ? 'positive' : 'negative';
            break;
    }

    renderCard(ch);
    renderSlot(ch);
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
        if (ch.state === STATES.RESULT) {
            showDecisionModal(ch, next.variant);
        } else {
            processModalQueue();
        }
    }
}

// ---- Decision Modal Actions ----

function handleDecisionAbort(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    ch.state = STATES.COMPLETE;
    ch.groupResult = 'inconclusive';

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleDecisionContinue(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    ch.incubationElapsed = 0;
    ch.errorMessage = '';
    ch.state = STATES.READY_FOR_TEST_N;

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

// ---- Abort Flow (READY_FOR_TEST_N) ----

function handleStop(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.READY_FOR_TEST_N) return;
    if (activeModal) return;

    showStopConfirmationModal(ch);
}

function handleStopConfirm(channelId) {
    const ch = getChannel(channelId);
    hideModal();

    if (ch.scenario === 'test' && ch.testResults.length > 0) {
        ch.state = STATES.COMPLETE;
        ch.groupResult = 'inconclusive';
    } else {
        resetChannel(ch);
    }

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
    processModalQueue();
}

function handleStopCancel(channelId) {
    hideModal();
    processModalQueue();
}

// ---- Clear Channel ----

function handleClear(channelId) {
    const ch = getChannel(channelId);
    if (!canClearChannel(ch)) return;
    if (activeModal) return;

    if (shouldRecordInconclusiveOnClear(ch)) {
        archiveSession(ch, 'clear', 'inconclusive');
    } else {
        archiveSession(ch, 'clear', ch.groupResult || null);
    }

    resetChannel(ch);

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
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

    ch.errorMessage = '';

    if (ch.currentTestNumber > 0) {
        ch.currentTestNumber--;
    }

    ch.state = STATES.READY_FOR_TEST_N;

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
}

function handleAbort(channelId) {
    const ch = getChannel(channelId);
    if (ch.state !== STATES.ERROR) return;

    if (ch.scenario === 'test' && ch.testResults.length > 0) {
        ch.state = STATES.COMPLETE;
        ch.groupResult = 'inconclusive';
    } else {
        resetChannel(ch);
    }

    renderCard(ch);
    renderSlot(ch);
    renderSimulationButtons();
}
