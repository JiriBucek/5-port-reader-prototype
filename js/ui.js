/* ==========================================================================
   UI Rendering
   5-Port Milk Testing Device Prototype
   ========================================================================== */

// ---- Render All Cards ----

function renderAllCards() {
    channels.forEach(ch => renderCard(ch));
    channels.forEach(ch => renderSlot(ch));
    renderSimulationButtons();
}

// ---- Render Single Card ----

function renderCard(ch) {
    const el = document.getElementById(`card-${ch.id}`);
    if (!el) return;

    // Remove all state classes
    el.className = 'channel-card';
    el.classList.add(getCardStateClass(ch));

    el.innerHTML = renderCardHeader(ch) +
                   renderCardCassette(ch) +
                   renderCardStatus(ch) +
                   renderCardGroupResult(ch) +
                   renderCardAction(ch);

    const progressFill = el.querySelector('.progress-fill[data-progress]');
    if (progressFill) {
        progressFill.style.width = `${progressFill.dataset.progress}%`;
    }

    bindCardEvents(ch);
}

// ---- Card Header ----

function getCardHeaderTypeLabel(ch) {
    const configuredType = getTestTypeById(ch.testTypeId);
    if (ch.testTypeName) return ch.testTypeName;
    if (configuredType?.name) return configuredType.name;

    const insertedType = getTestTypeById(ch.loadedTestTypeId);
    if (deviceSettings.qrScanningEnabled && insertedType?.qrEnabled) {
        return insertedType.name;
    }

    return '';
}

function formatCardHeaderTypeLabel(label) {
    if (!label) return '';

    return label
        .replace(/^MilkSafe(?:™)?\s*/i, 'MS ')
        .replace(/^Bioeasy\s+/i, 'BE ');
}

function renderCardHeader(ch) {
    const typeLabel = getCardHeaderTypeLabel(ch);
    const shortTypeLabel = formatCardHeaderTypeLabel(typeLabel);

    return `<div class="card-header">
        <span class="ch-label">${ch.id}</span>
        <div class="card-badges">
            ${shortTypeLabel ? `<span class="badge badge-type" title="${escapeHtml(typeLabel)}">${escapeHtml(shortTypeLabel)}</span>` : ''}
        </div>
    </div>`;
}

// ---- Card Cassette Area ----

function renderCardCassette(ch) {
    let content = '';

    const showEmpty = !ch.cassettePresent || ch.state === STATES.EMPTY;

    if (showEmpty && ch.state === STATES.EMPTY) {
        content = renderCassetteSlotPlaceholder();
    } else if (showEmpty) {
        // Empty slot but with context (waiting for swap, alert, error)
        content = renderCassetteSlotPlaceholder();
    } else {
        content = renderCassetteGraphic(ch);
    }

    // Mini-history for confirmation flow
    const miniHistory = renderMiniHistory(ch);

    return `<div class="card-cassette-area">
        ${content}
        ${miniHistory}
    </div>`;
}

function renderCassetteSlotPlaceholder() {
    return `<div class="cassette-empty">
        <div class="cassette-ghost">
            <div class="ghost-window">
                <div class="ghost-line"></div>
                <div class="ghost-line"></div>
                <div class="ghost-line"></div>
            </div>
            <div class="ghost-sample-well"></div>
            <div class="ghost-qr"></div>
        </div>
    </div>`;
}

function renderCassetteGraphic(ch) {
    if (!ch.cassetteType) return '<div class="cassette-empty">&#9649;</div>';

    const subs = getSubstancesForTestType(ch.testTypeId, ch.cassetteType);
    const lineItems = [{ label: 'C', isControl: true }, ...subs.map(sub => ({ label: getSubstanceShortLabel(sub), isControl: false }))];
    let lineClass = 'cassette-graphic';

    if (ch.state === STATES.ERROR_USED || ch.state === STATES.ERROR_USED_CONFIRMATION) {
        lineClass += ' cassette-error';
    }
    if (ch.state === STATES.READING || ch.state === STATES.WAITING_TEMP || ch.state === STATES.INCUBATING) {
        lineClass += ' cassette-processing';
    }

    // Determine which results to show on cassette lines
    // READY_FOR_TEST_N = new blank cassette, don't show previous test results
    let currentResults = null;
    if (ch.testResults.length > 0 &&
        (ch.state === STATES.RESULT || ch.state === STATES.COMPLETE ||
         ch.state === STATES.AWAITING_CONFIRMATION)) {
        currentResults = ch.testResults[ch.testResults.length - 1].substances;
    }

    let linesHtml = lineItems.map((item, i) => {
        let resultClass = 'result-pending';
        if (ch.state === STATES.READING) {
            resultClass = 'result-reading';
        } else if (item.isControl && currentResults) {
            resultClass = 'result-control';
        } else if (currentResults) {
            const resultIndex = item.isControl ? -1 : i - 1;
            resultClass = currentResults[resultIndex].result === 'positive' ? 'result-positive' : 'result-negative';
        }
        return `<div class="substance-line${item.isControl ? ' is-control' : ''}">
            <span class="line-label">${item.label}</span>
            <div class="line-bar ${resultClass}"></div>
        </div>`;
    }).join('');

    let testLabel = '';
    if (ch.currentTestNumber > 0) {
        testLabel = `<span class="cassette-test-label">T${ch.currentTestNumber}</span>`;
    }

    return `<div class="${lineClass}">
        ${testLabel}
        <div class="substance-line-container">${linesHtml}</div>
    </div>`;
}

// ---- Mini History ----

function renderMiniHistory(ch) {
    if (ch.testResults.length === 0) return '';

    // States where main cassette is NOT showing a completed result
    // (empty slot, blank cassette, or processing) — show ALL test history
    const mainNotShowingResult = [
        STATES.READY_FOR_TEST_N,
        STATES.ERROR_TYPE_MISMATCH, STATES.ERROR_USED_CONFIRMATION,
        STATES.WAITING_TEMP, STATES.INCUBATING, STATES.READING,
        STATES.ERROR
    ];

    let testsToShow;
    if (mainNotShowingResult.includes(ch.state)) {
        testsToShow = ch.testResults;
    } else {
        // Main cassette shows latest result — exclude it from mini-history
        testsToShow = ch.testResults.slice(0, -1);
    }

    if (testsToShow.length === 0) return '';

    let minis = testsToShow.map(tr => {
        const lines = [`<div class="mini-line result-control"></div>`, ...tr.substances.map(s =>
            `<div class="mini-line result-${s.result}"></div>`
        )].join('');
        const overall = isTestPositive(tr.substances) ? 'positive' : 'negative';
        const resultClass = overall === 'positive' ? 'mini-result-positive' : 'mini-result-negative';
        return `<div class="mini-cassette">
            <div class="mini-cassette-graphic">${lines}</div>
            <span class="mini-cassette-label">T${tr.testNumber}</span>
            <span class="mini-cassette-result ${resultClass}">${overall === 'positive' ? 'POS' : 'NEG'}</span>
        </div>`;
    }).join('');

    return `<div class="mini-history">${minis}</div>`;
}

function renderConfirmationHistory(ch) {
    if (ch.testResults.length === 0) return '';

    const chips = ch.testResults.map(tr => {
        const positive = isTestPositive(tr.substances);
        const cls = positive ? 'confirm-chip-positive' : 'confirm-chip-negative';
        const label = positive ? 'POS' : 'NEG';
        return `<span class="confirm-chip ${cls}">T${tr.testNumber} ${label}</span>`;
    }).join('');

    return `<div class="confirm-history">
        <span class="confirm-history-label">Completed:</span>
        ${chips}
    </div>`;
}

// ---- Card Status Area ----

function renderCardStatus(ch) {
    let statusHtml = '';
    let statusClass = ' is-empty';

    switch (ch.state) {
        case STATES.EMPTY:
            if (deviceSettings.microswitchEnabled) {
                statusHtml = `<span class="status-text status-waiting">Insert cassette</span>`;
                statusClass = ' is-single';
            } else {
                statusHtml = `<span class="status-text status-waiting">Insert cassette</span>
                              <span class="status-text status-secondary status-waiting">Tap Configure</span>`;
                statusClass = ' is-dual';
            }
            break;

        case STATES.DETECTED:
            statusHtml = `<span class="status-text">Cassette detected</span>
                          <span class="status-text status-secondary status-waiting">Tap Configure</span>`;
            statusClass = ' is-dual';
            break;

        case STATES.ERROR_USED:
        case STATES.ERROR_USED_CONFIRMATION:
            statusHtml = `<span class="status-text status-error">Used cassette</span>
                          <span class="status-text status-secondary status-error">Insert new cassette</span>`;
            statusClass = ' is-dual';
            break;

        case STATES.CONFIGURING:
            statusHtml = `<span class="status-text status-processing">Configuring</span>`;
            statusClass = ' is-single';
            break;

        case STATES.WAITING_TEMP:
            statusHtml = `<span class="status-text status-processing">Heating</span>
                          <div class="spinner"></div>`;
            statusClass = ' is-busy';
            break;

        case STATES.INCUBATING: {
            const pct = ch.incubationTotal > 0
                ? ((ch.incubationTotal - ch.incubationRemaining) / ch.incubationTotal * 100)
                : 0;
            const mins = Math.floor(ch.incubationRemaining / 60);
            const secs = ch.incubationRemaining % 60;
            const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
            statusHtml = `<span class="status-text status-processing">Incubating</span>
                          <span class="countdown-text">${timeStr}</span>
                          <div class="progress-bar"><div class="progress-fill" data-progress="${pct.toFixed(2)}"></div></div>`;
            statusClass = ' is-meter';
            break;
        }

        case STATES.READING:
            statusHtml = `<div class="spinner"></div>
                          <span class="status-text status-processing">Reading</span>`;
            statusClass = ' is-busy';
            break;

        case STATES.RESULT: {
            const lastResult = ch.testResults[ch.testResults.length - 1];
            const isPos = isTestPositive(lastResult.substances);
            const testNum = lastResult.testNumber;
            if (testNum === 1 && isPos) {
                statusHtml = `<span class="status-text status-error">T1 positive</span>
                              <span class="status-text status-secondary status-waiting">Start T2</span>`;
                statusClass = ' is-dual';
            } else if (testNum === 2 && !isPos) {
                statusHtml = `<span class="status-text status-success">T2 negative</span>
                              <span class="status-text status-secondary status-waiting">Start T3</span>`;
                statusClass = ' is-dual';
            }
            break;
        }

        case STATES.READY_FOR_TEST_N: {
            const nextTest = ch.currentTestNumber + 1;
            statusHtml = `${renderConfirmationHistory(ch)}
                          <span class="status-text">Insert new cassette</span>
                          <span class="status-text status-secondary status-waiting">Start T${nextTest}</span>`;
            statusClass = ' is-history';
            break;
        }

        case STATES.COMPLETE: {
            const isCtrl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';
            if (isCtrl) {
                const controlLabel = ch.scenario === 'pos_control' ? 'Positive Control' : 'Animal Control';
                statusHtml = `<span class="status-text status-muted">${controlLabel}</span>`;
                statusClass = ' is-single';
            } else if (ch.groupResult) {
                statusHtml = `<span class="status-text status-muted">Test Flow</span>`;
                statusClass = ' is-single';
            }
            break;
        }

        case STATES.ERROR:
            statusHtml = `<span class="status-text status-error">${ch.errorMessage || 'Test error'}</span>`;
            statusClass = ' is-message';
            break;

        case STATES.ERROR_TYPE_MISMATCH: {
            const expected = ch.testResults.length > 0
                ? (ch.testResults[0].testTypeName || ch.testResults[0].cassetteType)
                : (ch.testTypeName || '?');
            statusHtml = `<span class="status-text status-error">Wrong cassette type</span>
                          <span class="status-text status-secondary status-error">Expected ${expected} &mdash; insert correct type and retry</span>`;
            statusClass = ' is-message';
            break;
        }
    }

    return `<div class="card-status${statusClass}">${statusHtml}</div>`;
}

// ---- Card Group Result ----

function renderCardGroupResult(ch) {
    let groupResultHtml = '';

    let badgeClass, label;
    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';

    if (ch.state === STATES.COMPLETE && isControl) {
        const lastResult = ch.testResults[ch.testResults.length - 1];
        const isPos = isTestPositive(lastResult.substances);
        label = isPos ? 'POSITIVE' : 'NEGATIVE';
        badgeClass = isPos ? 'group-badge-positive' : 'group-badge-negative';
        groupResultHtml = `
            <span class="group-badge ${badgeClass}">${label}</span>
        `;
    } else if (ch.state === STATES.COMPLETE) {
        switch (ch.groupResult) {
            case 'negative':
                badgeClass = 'group-badge-negative';
                label = 'NEGATIVE';
                break;
            case 'positive':
                badgeClass = 'group-badge-positive';
                label = 'POSITIVE';
                break;
            case 'inconclusive':
                badgeClass = 'group-badge-inconclusive';
                label = 'INCONCLUSIVE';
                break;
        }

        if (badgeClass && label) {
            groupResultHtml = `
                <span class="group-badge ${badgeClass}">${label}</span>
            `;
        }
    }

    return `<div class="card-group-result${groupResultHtml ? '' : ' is-empty'}">
        ${groupResultHtml}
    </div>`;
}

// ---- Card Action Button ----

function renderCardAction(ch) {
    const clearBtn = `<button class="action-btn btn-ghost" data-action="clear" data-ch="${ch.id}">Clear</button>`;
    const primaryAction = (buttonHtml = '') => `
        <div class="card-action-row card-action-row-primary${buttonHtml ? '' : ' is-empty'}">
            ${buttonHtml}
        </div>`;
    const secondaryAction = (buttons = []) => `
        <div class="card-action-row card-action-row-secondary${buttons.length > 1 ? ' is-split' : ''}${buttons.length ? '' : ' is-empty'}">
            ${buttons.join('')}
        </div>`;

    let primaryButton = '';
    let secondaryButtons = [];

    switch (ch.state) {
        case STATES.EMPTY:
            if (canConfigureChannel(ch)) {
                primaryButton = `<button class="action-btn btn-primary" data-action="configure" data-ch="${ch.id}">Configure</button>`;
            }
            break;

        case STATES.DETECTED:
            primaryButton = `<button class="action-btn btn-primary" data-action="configure" data-ch="${ch.id}">Configure</button>`;
            secondaryButtons = [clearBtn];
            break;

        case STATES.READY_FOR_TEST_N:
            primaryButton = `<button class="action-btn btn-primary" data-action="start-test-n" data-ch="${ch.id}">Start Test ${ch.currentTestNumber + 1}</button>`;
            secondaryButtons = [
                `<button class="action-btn btn-secondary" data-action="stop" data-ch="${ch.id}">Abort Flow</button>`
            ];
            break;

        case STATES.COMPLETE:
            primaryButton = `<button class="action-btn btn-secondary" data-action="view-details" data-ch="${ch.id}">View Details</button>`;
            secondaryButtons = [clearBtn];
            break;

        case STATES.ERROR:
            primaryButton = `<button class="action-btn btn-primary" data-action="retry" data-ch="${ch.id}">Retry</button>`;
            secondaryButtons = [
                `<button class="action-btn btn-secondary" data-action="abort" data-ch="${ch.id}">Abort</button>`
            ];
            break;

        default:
            if (canClearChannel(ch)) {
                primaryButton = clearBtn;
            }
            break;
    }

    return `<div class="card-action${primaryButton || secondaryButtons.length ? '' : ' is-empty'}">
        ${primaryAction(primaryButton)}
        ${secondaryAction(secondaryButtons)}
    </div>`;
}

// ---- Bind Card Button Events ----

function bindCardEvents(ch) {
    const card = document.getElementById(`card-${ch.id}`);
    if (!card) return;

    card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const chId = parseInt(btn.dataset.ch);

            switch (action) {
                case 'configure': handleConfigure(chId); break;
                case 'stop': handleStop(chId); break;
                case 'start-test-n': handleStartTestN(chId); break;
                case 'view-details': handleViewDetails(chId); break;
                case 'retry': handleRetry(chId); break;
                case 'abort': handleAbort(chId); break;
                case 'clear': handleClear(chId); break;
            }
        });
    });
}

// ---- Status Bar ----

function renderStatusBar() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: getSelectedTimezone()
    });
    const el = document.getElementById('status-bar-time');
    if (el) el.textContent = timeStr;

    const tempEl = document.getElementById('status-bar-temp-value');
    if (tempEl) tempEl.innerHTML = formatStatusBarTemperatureLabel();

    const internetEl = document.getElementById('status-bar-internet-status');
    if (internetEl) internetEl.textContent = getConnectivityLabel();

    const accountEl = document.getElementById('status-bar-account-status');
    if (accountEl) {
        accountEl.textContent = getActiveAccountLabel();
        accountEl.classList.toggle('is-anonymous', isAnonymousSession());
    }
}

// ---- Physical Slot Visualization ----

function renderSlot(ch) {
    const cassette = document.getElementById(`cassette-${ch.id}`);
    const linesEl = document.getElementById(`cassette-lines-${ch.id}`);
    if (!cassette || !linesEl) return;

    const shouldBeInserted = ch.physicalCassettePresent;
    const isInserted = cassette.classList.contains('inserted');

    if (shouldBeInserted && !isInserted) {
        // Insert animation
        cassette.classList.remove('removing');
        // Force reflow to restart animation
        void cassette.offsetWidth;
        cassette.classList.add('inserted');
    } else if (!shouldBeInserted && isInserted) {
        // Remove animation
        cassette.classList.remove('inserted');
        cassette.classList.add('removing');
        // Clean up removing class after animation
        setTimeout(() => cassette.classList.remove('removing'), 600);
    }

    // Update cassette lines to reflect test state
    updateSlotLines(ch, linesEl);
}

function updateSlotLines(ch, linesEl) {
    if (!ch.cassetteType) {
        linesEl.innerHTML = '';
        return;
    }

    const subs = getSubstancesForTestType(ch.testTypeId, ch.cassetteType);
    const lineItems = [{ isControl: true }, ...subs.map(() => ({ isControl: false }))];

    // Determine line states (mirror the card cassette logic)
    let currentResults = null;
    if (ch.testResults.length > 0 &&
        (ch.state === STATES.RESULT || ch.state === STATES.COMPLETE ||
         ch.state === STATES.AWAITING_CONFIRMATION)) {
        currentResults = ch.testResults[ch.testResults.length - 1].substances;
    }

    linesEl.innerHTML = lineItems.map((item, i) => {
        let lineClass = 'cassette-line-mark';
        if (ch.state === STATES.READING) {
            lineClass += ' line-reading';
        } else if (item.isControl && currentResults) {
            lineClass += ' line-control';
        } else if (currentResults) {
            const resultIndex = item.isControl ? -1 : i - 1;
            lineClass += currentResults[resultIndex].result === 'positive' ? ' line-positive' : ' line-negative';
        }
        return `<div class="${lineClass}"></div>`;
    }).join('');
}

// ---- Simulation Panel ----

function renderSimulationButtons() {
    channels.forEach(ch => {
        const panel = document.getElementById(`sim-${ch.id}`);
        if (!panel) return;

        const insertable = canInsertCassette(ch);
        const removable = canRemoveCassette(ch);

        const posBtn = panel.querySelector('.sim-btn-positive');
        const negBtn = panel.querySelector('.sim-btn-negative');
        const removeBtn = panel.querySelector('.sim-btn-remove');
        if (posBtn) posBtn.disabled = !insertable;
        if (negBtn) negBtn.disabled = !insertable;
        if (removeBtn) removeBtn.disabled = !removable;
    });
}

// ---- Config Modal ----

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildConfigDraft(ch) {
    const fallbackCassetteType = ch.loadedCassetteType || ch.cassetteType || CASSETTE_TYPES[0];
    const insertedTestType = getTestTypeById(ch.loadedTestTypeId);
    const qrPrefillType = (deviceSettings.qrScanningEnabled && ch.cassettePresent && insertedTestType?.qrEnabled)
        ? insertedTestType
        : null;
    const qrModeLocked = Boolean(qrPrefillType);
    const recentTestType = getRecentTestTypes()[0] || getDefaultManualTestType();
    const currentConfiguredType = getTestTypeById(ch.testTypeId);
    const defaultManualTestType = qrPrefillType || currentConfiguredType || recentTestType;
    const defaultBrandFilter = defaultManualTestType?.brand || 'MilkSafe';
    const defaultCurve = defaultManualTestType?.quantitative
        ? getDefaultCurveForTestType(defaultManualTestType.id, ch.curveId)
        : null;
    const defaultTestTypeId = qrPrefillType?.id || (
        isFastQrOnlyMode()
            ? null
            : (defaultManualTestType?.id || getDefaultManualTestType()?.id || null)
    );

    return {
        scenario: ch.scenario || 'test',
        testTypeId: defaultTestTypeId,
        sampleId: ch.sampleId || '',
        operatorId: ch.operatorId || '',
        fallbackCassetteType,
        lockedToQr: qrModeLocked,
        forceQrOnly: isFastQrOnlyMode(),
        brandFilter: defaultBrandFilter,
        categoryFilter: 'all',
        measurementFilter: 'all',
        curveId: defaultCurve?.id || null,
        curveLoadSource: 'qr',
        curveLoadError: ''
    };
}

function collectConfigDraft(modal, ch, previousDraft) {
    return {
        ...previousDraft,
        scenario: modal.querySelector('#cfg-scenario .seg-option.selected')?.dataset.value || previousDraft.scenario || 'test',
        sampleId: modal.querySelector('#cfg-sample-id')?.value ?? previousDraft.sampleId ?? '',
        operatorId: modal.querySelector('#cfg-operator')?.value ?? previousDraft.operatorId ?? '',
        fallbackCassetteType: ch.loadedCassetteType || ch.cassetteType || previousDraft.fallbackCassetteType || CASSETTE_TYPES[0],
        lockedToQr: previousDraft.lockedToQr,
        forceQrOnly: previousDraft.forceQrOnly,
        brandFilter: previousDraft.brandFilter || 'MilkSafe',
        categoryFilter: previousDraft.categoryFilter || 'all',
        measurementFilter: previousDraft.measurementFilter || 'all',
        curveId: previousDraft.curveId || null,
        curveLoadSource: previousDraft.curveLoadSource || 'qr',
        curveLoadError: previousDraft.curveLoadError || ''
    };
}

function getDraftSelection(draft, qrLocked) {
    if (draft.forceQrOnly && !draft.testTypeId && !qrLocked) {
        return null;
    }

    return getDisplayTestType(draft.testTypeId, draft.fallbackCassetteType, qrLocked);
}

function getDraftCurve(draft, selectedType) {
    if (!selectedType?.quantitative) return null;

    const selectedCurve = getCurveById(draft.curveId);
    if (selectedCurve && selectedCurve.testTypeId === selectedType.id) {
        return selectedCurve;
    }

    return getDefaultCurveForTestType(selectedType.id, draft.curveId);
}

function syncDraftForTestType(draft, testTypeId) {
    const normalizedTestTypeId = Number(testTypeId);
    const selectedType = getTestTypeById(normalizedTestTypeId);
    const nextDraft = {
        ...draft,
        testTypeId: normalizedTestTypeId,
        lockedToQr: false,
        curveLoadError: '',
        curveLoadSource: draft.curveLoadSource || 'qr'
    };

    if (!selectedType?.quantitative) {
        return {
            ...nextDraft,
            curveId: null
        };
    }

    return {
        ...nextDraft,
        curveId: getDefaultCurveForTestType(selectedType.id, draft.curveId)?.id || null
    };
}

function getKeyboardFieldLabel(fieldId) {
    return fieldId === 'cfg-operator' ? 'Operator ID' : 'Sample ID';
}

function setConfigKeyboardState(modal, fieldId = '') {
    if (!modal) return;

    const isActive = Boolean(fieldId);
    modal.classList.toggle('keyboard-active', isActive);
    modal.dataset.keyboardField = fieldId || '';

    const labelEl = modal.querySelector('#cfg-keyboard-field-label');
    if (labelEl) {
        labelEl.textContent = isActive ? getKeyboardFieldLabel(fieldId) : '';
    }

    if (!isActive) return;

    const targetInput = modal.querySelector(`#${fieldId}`);
    if (targetInput) {
        window.requestAnimationFrame(() => {
            targetInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }
}

function bindConfigKeyboardPlaceholder(modal) {
    if (!modal) return;

    const inputs = modal.querySelectorAll('#cfg-sample-id, #cfg-operator');
    if (!inputs.length) return;

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            setConfigKeyboardState(modal, input.id);
        });

        input.addEventListener('blur', () => {
            window.setTimeout(() => {
                const activeId = document.activeElement?.id;
                if (activeId === 'cfg-sample-id' || activeId === 'cfg-operator') {
                    setConfigKeyboardState(modal, activeId);
                    return;
                }
                setConfigKeyboardState(modal, '');
            }, 60);
        });
    });

    const doneBtn = modal.querySelector('#cfg-keyboard-done');
    if (doneBtn) {
        doneBtn.addEventListener('click', () => {
            const activeFieldId = modal.dataset.keyboardField;
            if (activeFieldId) {
                const activeInput = modal.querySelector(`#${activeFieldId}`);
                if (activeInput) activeInput.blur();
            }
            setConfigKeyboardState(modal, '');
        });
    }
}

function buildSettingsCurveDraft() {
    const selectedType = TEST_TYPES.find(testType => testType.quantitative) || getTestTypeById(20);
    const defaultCurve = selectedType ? getDefaultCurveForTestType(selectedType.id) : null;

    return {
        scenario: 'test',
        testTypeId: selectedType?.id || null,
        sampleId: '',
        operatorId: '',
        fallbackCassetteType: selectedType?.cassetteType || CASSETTE_TYPES[0],
        lockedToQr: false,
        brandFilter: selectedType?.brand || 'MilkSafe',
        categoryFilter: 'all',
        measurementFilter: 'quant',
        curveId: defaultCurve?.id || null,
        curveLoadSource: 'qr',
        curveLoadError: '',
        openedFromSettings: true
    };
}

function showSettingsCurveScreen(draft = null) {
    const screen = document.getElementById('settings-curve-screen');
    if (!screen) return;

    const nextDraft = draft || buildSettingsCurveDraft();
    const selectedType = getDraftSelection(nextDraft, false);
    const recentCurves = getRecentQuantCurves(selectedType?.id);
    const loadError = nextDraft.curveLoadError || '';

    activeModal = { type: 'settings_curve', draft: nextDraft };

    screen.innerHTML = `
        <div class="settings-curve-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>Load Quant Curve</h1>
                <p>Last five quantitative curves are stored on the device.</p>
            </div>
            <button class="history-close-btn" id="settings-curve-close">Back</button>
        </div>
        <div class="settings-curve-screen-body">
            <section class="settings-section">
                <div class="settings-section-header">
                    <h2>Load New</h2>
                </div>
                <div class="settings-section-body">
                    <div class="curve-loader-actions">
                        <button class="curve-loader-action" id="settings-curve-import-qr" data-source="qr">Load From QR</button>
                        <button class="curve-loader-action" id="settings-curve-import-card" data-source="card">Load From Chip</button>
                    </div>
                    ${loadError ? `<div class="curve-loader-status is-error">${escapeHtml(loadError)}</div>` : ''}
                </div>
            </section>
            <section class="settings-section settings-curve-list-section">
                <div class="settings-section-header">
                    <h2>Saved Curves</h2>
                </div>
                <div class="curve-picker-results settings-curve-results">
                    ${renderSettingsCurveRows(recentCurves)}
                </div>
            </section>
        </div>`;

    screen.classList.add('active');

    document.getElementById('settings-curve-close').addEventListener('click', () => {
        handleSettingsCurveClose();
    });

    screen.querySelectorAll('[data-source]').forEach(button => {
        button.addEventListener('click', () => {
            const source = button.dataset.source;
            const availability = getCurveSourceAvailability(source);

            if (!availability.ok) {
                showSettingsCurveScreen({
                    ...nextDraft,
                    curveLoadSource: source,
                    curveLoadError: availability.message
                });
                return;
            }

            const savedCurve = saveQuantCurve({
                testTypeId: selectedType.id,
                name: buildImportedCurveBatchNumber(source),
                source
            });

            if (!savedCurve) {
                showSettingsCurveScreen({
                    ...nextDraft,
                    curveLoadSource: source,
                    curveLoadError: 'Curve could not be saved.'
                });
                return;
            }

            showSettingsCurveScreen({
                ...nextDraft,
                curveLoadSource: source,
                curveLoadError: ''
            });
        });
    });
}

function formatCurveTimestamp(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: getSelectedTimezone()
    });
}

function buildImportedCurveBatchNumber(source) {
    const now = new Date();
    const yy = String(now.getUTCFullYear()).slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const sourceDigit = source === 'card' ? '2' : '1';
    const serial = String(quantCurveIdCounter % 100).padStart(2, '0');
    return `${yy}${mm}${dd}${sourceDigit}${serial}`;
}

function getCurveSourceAvailability(source) {
    if (source === 'qr') {
        return deviceSettings.curveScannerConnected
            ? { ok: true, message: 'Scanner ready. Scan the curve QR.' }
            : { ok: false, message: 'Connect pistol scanner to load from QR.' };
    }

    return deviceSettings.storageCardMounted
        ? { ok: true, message: 'Chip ready. Import a saved curve file.' }
        : { ok: false, message: 'Insert chip to import a curve.' };
}

function renderConfigTemperatureGate(draft, qrLocked) {
    const selectedType = getDraftSelection(draft, qrLocked);
    const validation = getTemperatureValidation(selectedType?.id, selectedType?.cassetteType);
    const temperatureLabel = formatTemperatureShort(selectedType);

    if (validation.requiredTemperature == null) {
        return `
            <span class="config-temp-badge">Temp</span>
            <span class="config-temp-copy">${temperatureLabel}</span>`;
    }

    if (validation.bypassed) {
        return `
            <span class="config-temp-badge">Temp Off</span>
            <span class="config-temp-copy">Incubation disabled. ${validation.requiredTemperature} C not required.</span>`;
    }

    if (validation.ok) {
        return `
            <span class="config-temp-badge">Temp OK</span>
            <span class="config-temp-copy">${validation.currentTemperatureLabel} / ${validation.requiredTemperature} C</span>`;
    }

    return `
        <span class="config-temp-badge">Temp</span>
        <span class="config-temp-copy">${validation.currentTemperatureLabel} device, ${validation.requiredTemperature} C required</span>`;
}

function getConfigTemperatureStatusClass(testTypeId, cassetteType) {
    const validation = getTemperatureValidation(testTypeId, cassetteType);
    if (validation.bypassed || validation.requiredTemperature == null) return '';
    return validation.ok ? ' is-valid' : ' is-invalid';
}

function getTestTypeBadgeItems(testType) {
    if (!testType) return [];

    const items = [
        { label: testType.category, tone: 'neutral' },
        { label: testType.qrEnabled ? 'QR On' : 'QR Off', tone: testType.qrEnabled ? 'qr-on' : 'qr-off' }
    ];

    if (testType.quantitative) {
        items.push({ label: 'Quant', tone: 'quant' });
    }

    if (testType.incubationTime != null) {
        if (testType.requiredTemperature != null) {
            items.push({ label: formatTemperatureShort(testType), tone: 'temp' });
        }
        items.push({ label: formatIncubationTimeShort(testType.incubationTime), tone: 'time' });
    }

    return items;
}

function renderTestTypeBadges(testType) {
    return getTestTypeBadgeItems(testType).map(item => `
        <span class="type-badge type-badge-${item.tone}">${escapeHtml(item.label)}</span>
    `).join('');
}

function renderCurvePickerRows(curves, selectedCurveId) {
    if (curves.length === 0) {
        return `<div class="type-picker-empty">No saved curves for this test type yet.</div>`;
    }

    return curves.map(curve => `
        <button class="type-picker-row${curve.id === selectedCurveId ? ' selected' : ''}" data-curve-id="${curve.id}">
            <span class="type-picker-row-name">${escapeHtml(curve.name)}</span>
            <span class="type-picker-row-meta">
                <span class="type-badge type-badge-neutral">${escapeHtml(getCurveSourceLabel(curve.source))}</span>
                <span class="type-badge type-badge-time">${escapeHtml(formatCurveTimestamp(curve.createdAt))}</span>
            </span>
        </button>
    `).join('');
}

function renderSettingsCurveRows(curves) {
    if (curves.length === 0) {
        return `<div class="type-picker-empty">No saved quantitative curves yet.</div>`;
    }

    return curves.map(curve => `
        <div class="type-picker-row settings-curve-row">
            <span class="type-picker-row-name">${escapeHtml(curve.name)}</span>
            <span class="type-picker-row-meta">
                <span class="type-badge type-badge-neutral">${escapeHtml(getCurveSourceLabel(curve.source))}</span>
                <span class="type-badge type-badge-time">${escapeHtml(formatCurveTimestamp(curve.createdAt))}</span>
            </span>
        </div>
    `).join('');
}

function renderTypePickerRows(testTypes, selectedTestTypeId) {
    if (testTypes.length === 0) {
        return `<div class="type-picker-empty">No test types match these filters.</div>`;
    }

    return testTypes.map(testType => `
        <button class="type-picker-row${testType.id === selectedTestTypeId ? ' selected' : ''}" data-test-type-id="${testType.id}">
            <span class="type-picker-row-name">${escapeHtml(testType.name)}</span>
            <span class="type-picker-row-meta">${renderTestTypeBadges(testType)}</span>
        </button>
    `).join('');
}

function filterTestTypesByPickerState(testTypes, filters = {}) {
    const brandFilter = filters.brandFilter || 'MilkSafe';
    const categoryFilter = filters.categoryFilter || 'all';
    const measurementFilter = filters.measurementFilter || 'all';

    return testTypes.filter(testType => {
        if (brandFilter && testType.brand !== brandFilter) return false;
        if (categoryFilter !== 'all' && testType.category.toLowerCase() !== categoryFilter) return false;
        if (measurementFilter === 'quant' && !testType.quantitative) return false;
        if (measurementFilter === 'qual' && testType.quantitative) return false;
        return true;
    });
}

function updateTypePickerList(draft) {
    const listEl = document.getElementById('cfg-type-list');
    const brandEl = document.getElementById('cfg-type-brand-filter');
    const categoryEl = document.getElementById('cfg-type-category-filter');
    const measurementEl = document.getElementById('cfg-type-measurement-filter');
    if (!listEl) return;

    const brandFilter = draft.brandFilter || 'MilkSafe';
    const categoryFilter = draft.categoryFilter || 'all';
    const measurementFilter = draft.measurementFilter || 'all';

    if (brandEl) {
        brandEl.querySelectorAll('[data-brand-filter]').forEach(button => {
            button.classList.toggle('selected', button.dataset.brandFilter === brandFilter);
            button.onclick = () => {
                if (draft.brandFilter === button.dataset.brandFilter) return;
                const nextDraft = { ...draft, brandFilter: button.dataset.brandFilter };
                updateTypePickerList(nextDraft);
                activeModal.draft = nextDraft;
            };
        });
    }

    if (categoryEl) {
        categoryEl.querySelectorAll('[data-category-filter]').forEach(button => {
            button.classList.toggle('selected', button.dataset.categoryFilter === categoryFilter);
            button.onclick = () => {
                if (draft.categoryFilter === button.dataset.categoryFilter) return;
                const nextDraft = { ...draft, categoryFilter: button.dataset.categoryFilter };
                updateTypePickerList(nextDraft);
                activeModal.draft = nextDraft;
            };
        });
    }

    if (measurementEl) {
        measurementEl.querySelectorAll('[data-measurement-filter]').forEach(button => {
            button.classList.toggle('selected', button.dataset.measurementFilter === measurementFilter);
            button.onclick = () => {
                if (draft.measurementFilter === button.dataset.measurementFilter) return;
                const nextDraft = { ...draft, measurementFilter: button.dataset.measurementFilter };
                updateTypePickerList(nextDraft);
                activeModal.draft = nextDraft;
            };
        });
    }

    const filteredTypes = filterTestTypesByPickerState(getEnabledTestTypesForCurrentUser(), {
        brandFilter,
        categoryFilter,
        measurementFilter
    });

    listEl.innerHTML = `
        <div class="type-picker-results">
            ${renderTypePickerRows(filteredTypes, draft.testTypeId)}
        </div>`;

    document.querySelectorAll('[data-test-type-id]').forEach(button => {
        button.addEventListener('click', () => {
            const nextDraft = syncDraftForTestType({
                ...draft,
                brandFilter
            }, Number(button.dataset.testTypeId));
            const ch = getChannel(activeModal.channelId);
            showConfigModal(ch, nextDraft, 'form');
        });
    });
}

function showConfigModal(ch, draft = null, view = 'form') {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('config-modal');
    if (!overlay || !modal) return;

    const nextDraft = draft || buildConfigDraft(ch);
    activeModal = { type: 'config', channelId: ch.id, draft: nextDraft, view };

    const scenarioOpts = [
        { value: 'test', label: 'Test' },
        { value: 'animal_control', label: 'Animal' },
        { value: 'pos_control', label: 'Positive' }
    ];

    const qrLocked = Boolean(nextDraft.lockedToQr);
    const selectedType = getDraftSelection(nextDraft, qrLocked);
    const selectedCurve = getDraftCurve(nextDraft, selectedType);
    const selectedTypeEnabled = !selectedType?.id || isTestTypeEnabledForCurrentUser(selectedType.id);
    const fastQrOnlyMode = Boolean(nextDraft.forceQrOnly);
    const lockTypeSelection = qrLocked || fastQrOnlyMode;
    const showSampleField = deviceSettings.sampleIdEnabled;
    const showOperatorField = deviceSettings.operatorIdEnabled;
    const showReadIncubate = Boolean(selectedType?.incubationTime) &&
        selectedType?.category !== 'Strip' &&
        isIncubationEnabled();
    const blockingMessage = !selectedTypeEnabled
        ? `${selectedType?.name || 'This test type'} is not enabled for the current reader profile.`
        : (fastQrOnlyMode && !selectedType?.id
            ? 'FAST QR only mode is enabled. Insert a supported QR cassette to continue.'
            : '');
    const subtitle = ch.cassettePresent
        ? 'Cassette inserted'
        : 'Manual mode';

    modal.className = `modal config-modal${view === 'type_picker' ? ' type-picker-mode active' : ' active'}`;

    if (view === 'type_picker') {
        if (fastQrOnlyMode) {
            showConfigModal(ch, nextDraft, 'form');
            return;
        }

        modal.innerHTML = `
            <div class="modal-header">
                <div class="modal-header-row">
                    <div class="modal-channel-badge">${ch.id}</div>
                    <div class="header-text">
                        <h2>Select Test Type</h2>
                    </div>
                    <button class="type-picker-header-btn" id="cfg-type-back">Back</button>
                </div>
            </div>
            <div class="modal-body type-picker-body">
                <div class="type-picker-brand-filter" id="cfg-type-brand-filter">
                    <button class="type-picker-brand-btn${nextDraft.brandFilter === 'MilkSafe' ? ' selected' : ''}" data-brand-filter="MilkSafe">MilkSafe</button>
                    <button class="type-picker-brand-btn${nextDraft.brandFilter === 'Bioeasy' ? ' selected' : ''}" data-brand-filter="Bioeasy">BioEasy</button>
                </div>
                <div class="type-picker-filter-row" id="cfg-type-category-filter">
                    <button class="type-picker-filter-btn${nextDraft.categoryFilter === 'all' ? ' selected' : ''}" data-category-filter="all">All</button>
                    <button class="type-picker-filter-btn${nextDraft.categoryFilter === 'cassette' ? ' selected' : ''}" data-category-filter="cassette">Cassette</button>
                    <button class="type-picker-filter-btn${nextDraft.categoryFilter === 'strip' ? ' selected' : ''}" data-category-filter="strip">Strip</button>
                </div>
                <div class="type-picker-filter-row" id="cfg-type-measurement-filter">
                    <button class="type-picker-filter-btn${nextDraft.measurementFilter === 'all' ? ' selected' : ''}" data-measurement-filter="all">All</button>
                    <button class="type-picker-filter-btn${nextDraft.measurementFilter === 'qual' ? ' selected' : ''}" data-measurement-filter="qual">Qual</button>
                    <button class="type-picker-filter-btn${nextDraft.measurementFilter === 'quant' ? ' selected' : ''}" data-measurement-filter="quant">Quant</button>
                </div>
                <div class="type-picker-sections">
                    <div class="type-picker-list-block" id="cfg-type-list"></div>
                </div>
            </div>`;

        overlay.classList.add('active');

        document.getElementById('cfg-type-back').addEventListener('click', () => {
            showConfigModal(ch, nextDraft, 'form');
        });

        updateTypePickerList(nextDraft);
        return;
    }

    if (view === 'curve_picker' || view === 'curve_loader') {
        if (!selectedType?.quantitative) {
            showConfigModal(ch, nextDraft, 'form');
            return;
        }

        const recentCurves = getRecentQuantCurves(selectedType.id);
        const launchedFromSettings = Boolean(nextDraft.openedFromSettings);
        modal.innerHTML = `
            <div class="modal-header">
                <div class="modal-header-row">
                    <div class="modal-channel-badge">${launchedFromSettings ? 'Q' : ch.id}</div>
                    <div class="header-text">
                        <h2>${launchedFromSettings ? 'Load Quant Curve' : 'Quant Curve'}</h2>
                        <span class="modal-subtitle">${escapeHtml(selectedType.name)}</span>
                    </div>
                    <button class="type-picker-header-btn" id="cfg-curve-back">Back</button>
                </div>
            </div>
            <div class="modal-body type-picker-body">
                <div class="type-picker-sections">
                    <div class="curve-loader-panel">
                        <div class="type-picker-section-title">Load New</div>
                        <div class="curve-loader-actions">
                            <button class="curve-loader-action" id="cfg-curve-import-qr" data-source="qr">Load From QR</button>
                            <button class="curve-loader-action" id="cfg-curve-import-card" data-source="card">Load From Chip</button>
                        </div>
                        ${nextDraft.curveLoadError ? `<div class="curve-loader-status is-error">${escapeHtml(nextDraft.curveLoadError)}</div>` : ''}
                    </div>
                    <div>
                        <div class="type-picker-section-title">Saved Curves</div>
                        <div class="type-picker-results curve-picker-results">
                            ${renderCurvePickerRows(recentCurves, selectedCurve?.id || null)}
                        </div>
                    </div>
                </div>
            </div>`;

        overlay.classList.add('active');

        document.getElementById('cfg-curve-back').addEventListener('click', () => {
            if (launchedFromSettings) {
                hideModal();
                showSettingsScreen();
                return;
            }

            showConfigModal(ch, {
                ...nextDraft,
                curveLoadError: ''
            }, 'form');
        });

        modal.querySelectorAll('[data-curve-id]').forEach(button => {
            button.addEventListener('click', () => {
                const nextCurveDraft = {
                    ...nextDraft,
                    curveId: Number(button.dataset.curveId),
                    curveLoadError: ''
                };

                showConfigModal(ch, nextCurveDraft, launchedFromSettings ? 'curve_picker' : 'form');
            });
        });

        modal.querySelectorAll('[data-source]').forEach(button => {
            button.addEventListener('click', () => {
                const source = button.dataset.source;
                const availability = getCurveSourceAvailability(source);
                if (!availability.ok) {
                    showConfigModal(ch, {
                        ...nextDraft,
                        curveLoadSource: source,
                        curveLoadError: availability.message
                    }, 'curve_picker');
                    return;
                }

                const savedCurve = saveQuantCurve({
                    testTypeId: selectedType.id,
                    name: buildImportedCurveBatchNumber(source),
                    source
                });

                if (!savedCurve) {
                    showConfigModal(ch, {
                        ...nextDraft,
                        curveLoadSource: source,
                        curveLoadError: 'Curve could not be saved.'
                    }, 'curve_picker');
                    return;
                }

                if (launchedFromSettings) {
                    showConfigModal(ch, {
                        ...nextDraft,
                        curveId: savedCurve.id,
                        curveLoadSource: source,
                        curveLoadError: ''
                    }, 'curve_picker');
                    return;
                }

                showConfigModal(ch, {
                    ...nextDraft,
                    curveId: savedCurve.id,
                    curveLoadSource: source,
                    curveLoadError: ''
                }, 'form');
            });
        });
        return;
    }

    modal.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-row config-header-row">
                <div class="modal-channel-badge">${ch.id}</div>
                <div class="header-text">
                    <h2>Configure Test</h2>
                    <span class="modal-subtitle">${subtitle}</span>
                </div>
                <div class="config-header-controls">
                    <div class="segmented-control compact" id="cfg-scenario">
                        ${scenarioOpts.map(o =>
                            `<button class="seg-option${o.value === nextDraft.scenario ? ' selected' : ''}" data-value="${o.value}">${o.label}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-body">
            <div class="config-grid">
                <div class="form-field">
                    <label>Test Type</label>
                    ${lockTypeSelection
                        ? `
                            <div class="type-picker-trigger type-picker-trigger-inline is-locked">
                                <span class="type-picker-trigger-main">${escapeHtml(selectedType?.name || 'Awaiting QR cassette')}</span>
                                <span class="type-picker-trigger-icon type-picker-trigger-icon-qr" aria-hidden="true"></span>
                            </div>`
                        : `
                            <button class="type-picker-trigger type-picker-trigger-inline" id="cfg-type-picker">
                                <span class="type-picker-trigger-main">${escapeHtml(selectedType?.name || 'Select test type')}</span>
                                <span class="type-picker-trigger-action">Choose</span>
                            </button>`
                    }
                    ${fastQrOnlyMode ? '<div class="config-note">FAST QR only mode. Test type is taken from cassette QR.</div>' : ''}
                </div>
                ${showSampleField ? `
                    <div class="form-field">
                        <label>Sample ID</label>
                        <input type="text" class="form-input" id="cfg-sample-id" placeholder="Type or scan sample ID" value="${escapeHtml(nextDraft.sampleId)}">
                        <div class="recent-chips" id="cfg-sample-id-chips">
                            ${RECENT_SAMPLE_IDS.slice(0, 2).map(sampleId => `<span class="recent-chip" data-target="cfg-sample-id" data-value="${sampleId}">${sampleId}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${showOperatorField ? `
                    <div class="form-field">
                        <label>Operator ID</label>
                        <input type="text" class="form-input" id="cfg-operator" placeholder="Type or scan operator ID" value="${escapeHtml(nextDraft.operatorId)}">
                        <div class="recent-chips" id="cfg-operator-chips">
                            ${RECENT_OPERATORS.slice(0, 2).map(o => `<span class="recent-chip" data-target="cfg-operator" data-value="${o}">${o}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${selectedType?.quantitative ? `
                    <div class="form-field">
                        <label>Quant Curve</label>
                        <button class="type-picker-trigger type-picker-trigger-inline${selectedCurve ? '' : ' is-missing'}" id="cfg-curve-picker">
                            <span class="type-picker-trigger-main">${escapeHtml(selectedCurve?.name || 'Select curve')}</span>
                            <span class="type-picker-trigger-action">${selectedCurve ? 'Change' : 'Choose'}</span>
                        </button>
                        ${selectedCurve ? '' : '<div class="config-note is-error">Choose or load a curve.</div>'}
                    </div>
                ` : ''}
                ${selectedType?.requiredTemperature != null ? `
                    <div class="form-field form-field-temp-status">
                        <div class="config-temp-status${getConfigTemperatureStatusClass(selectedType?.id, selectedType?.cassetteType)}" id="cfg-temp-status">
                            ${renderConfigTemperatureGate(nextDraft, qrLocked)}
                        </div>
                    </div>
                ` : ''}
                ${blockingMessage ? `<div class="config-note is-error config-note-blocking">${escapeHtml(blockingMessage)}</div>` : ''}
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="cfg-cancel">Cancel</button>
            ${blockingMessage ? '' : '<button class="modal-btn btn-primary" id="cfg-read-only">Read</button>'}
            ${!blockingMessage && showReadIncubate ? `<button class="modal-btn btn-primary" id="cfg-read-incubate">Read + Incubate</button>` : ''}
        </div>
        <div class="config-keyboard" id="cfg-keyboard">
            <div class="config-keyboard-header">
                <span class="config-keyboard-title">Keyboard</span>
                <span class="config-keyboard-field" id="cfg-keyboard-field-label"></span>
                <button class="config-keyboard-done" id="cfg-keyboard-done">Done</button>
            </div>
            <div class="config-keyboard-row">
                <span class="config-key">1</span><span class="config-key">2</span><span class="config-key">3</span><span class="config-key">4</span><span class="config-key">5</span>
                <span class="config-key">6</span><span class="config-key">7</span><span class="config-key">8</span><span class="config-key">9</span><span class="config-key">0</span>
            </div>
            <div class="config-keyboard-row">
                <span class="config-key">Q</span><span class="config-key">W</span><span class="config-key">E</span><span class="config-key">R</span><span class="config-key">T</span>
                <span class="config-key">Y</span><span class="config-key">U</span><span class="config-key">I</span><span class="config-key">O</span><span class="config-key">P</span>
            </div>
            <div class="config-keyboard-row">
                <span class="config-key">A</span><span class="config-key">S</span><span class="config-key">D</span><span class="config-key">F</span><span class="config-key">G</span>
                <span class="config-key">H</span><span class="config-key">J</span><span class="config-key">K</span><span class="config-key">L</span>
            </div>
            <div class="config-keyboard-row config-keyboard-row-bottom">
                <span class="config-key config-key-wide">Space</span>
                <span class="config-key config-key-wide">Backspace</span>
            </div>
        </div>`;

    overlay.classList.add('active');

    // Bind segmented control clicks
    modal.querySelectorAll('.segmented-control').forEach(sc => {
        sc.querySelectorAll('.seg-option').forEach(opt => {
            opt.addEventListener('click', () => {
                sc.querySelectorAll('.seg-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
    });

    // Bind recent chip clicks
    modal.querySelectorAll('.recent-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const target = document.getElementById(chip.dataset.target);
            if (target) target.value = chip.dataset.value;
        });
    });

    bindConfigKeyboardPlaceholder(modal);

    const typePickerBtn = document.getElementById('cfg-type-picker');
    if (typePickerBtn && !lockTypeSelection) {
        typePickerBtn.addEventListener('click', () => {
            const latestDraft = collectConfigDraft(modal, ch, nextDraft);
            showConfigModal(ch, latestDraft, 'type_picker');
        });
    }

    const curvePickerBtn = document.getElementById('cfg-curve-picker');
    if (curvePickerBtn && selectedType?.quantitative) {
        curvePickerBtn.addEventListener('click', () => {
            const latestDraft = collectConfigDraft(modal, ch, nextDraft);
            showConfigModal(ch, latestDraft, 'curve_picker');
        });
    }

    // Cancel
    document.getElementById('cfg-cancel').addEventListener('click', () => {
        handleConfigCancel(ch.id);
    });

    if (blockingMessage) {
        overlay.classList.add('active');
        return;
    }

    // Start helpers
    function collectConfigAndStart(processing) {
        const latestDraft = collectConfigDraft(modal, ch, nextDraft);
        const currentSelection = getDraftSelection(latestDraft, qrLocked);

        handleConfigStart(ch.id, {
            scenario: latestDraft.scenario,
            testTypeId: currentSelection?.id || null,
            testTypeName: currentSelection?.name,
            curveId: getDraftCurve(latestDraft, currentSelection)?.id || null,
            testType: currentSelection?.cassetteType || normalizeLoadedCassetteType(latestDraft.fallbackCassetteType),
            sampleId: latestDraft.sampleId || '',
            operatorId: latestDraft.operatorId || 'OP-000',
            processing
        });
    }

    document.getElementById('cfg-read-only').addEventListener('click', () => {
        collectConfigAndStart('read_only');
    });

    const incubateBtn = document.getElementById('cfg-read-incubate');
    if (incubateBtn) {
        incubateBtn.addEventListener('click', () => {
            collectConfigAndStart('read_incubate');
        });
    }

    const validation = getTemperatureValidation(selectedType?.id, selectedType?.cassetteType);
    const hasRequiredCurve = !selectedType?.quantitative || Boolean(getDraftCurve(nextDraft, selectedType)?.id);
    const readOnlyBtn = document.getElementById('cfg-read-only');
    if (readOnlyBtn) {
        readOnlyBtn.disabled = !validation.ok || !hasRequiredCurve || !selectedType;
    }
    if (incubateBtn) {
        incubateBtn.disabled = !validation.ok || !selectedType?.incubationTime || !hasRequiredCurve;
    }
}

function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    overlay.classList.remove('active');
    activeModal = null;
}

// ---- History Screen ----

const HISTORY_PAGE_SIZE = 4;
const HISTORY_PAGE_JUMP = 5;

function clampHistoryPage(page, totalPages) {
    return Math.min(Math.max(page, 0), Math.max(totalPages - 1, 0));
}

function formatHistoryDateTime(value, withYear = false) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
        hour: '2-digit',
        minute: '2-digit',
        timeZone: getSelectedTimezone()
    });
}

function getHistoryResultTone(result) {
    switch (result) {
        case 'positive':
            return 'positive';
        case 'negative':
            return 'negative';
        default:
            return 'inconclusive';
    }
}

function isHistoryControlFlow(flow) {
    return flow?.scenario === 'pos_control' || flow?.scenario === 'animal_control';
}

function getHistoryFlowTone(flow) {
    return isHistoryControlFlow(flow) ? 'control' : getHistoryResultTone(flow?.result);
}

function formatHistoryResultLabel(result) {
    switch (result) {
        case 'positive':
            return 'Positive';
        case 'negative':
            return 'Negative';
        default:
            return 'Inconclusive';
    }
}

function formatUploadStatusLabel(uploadStatus) {
    return uploadStatus === 'synced' ? 'Synced' : 'Not Synced';
}

function getHistoryAnnotationShortLabel(annotation) {
    switch (annotation) {
        case 'first_confirmation':
            return '1C';
        case 'second_confirmation':
            return '2C';
        case 'animal_control':
            return 'AC';
        case 'positive_control':
            return 'PC';
        case 'rejected':
            return 'REJ';
        default:
            return 'ORG';
    }
}

function renderToneBadge(label, tone, size = 'md') {
    return `<span class="history-result-badge is-${tone}${size === 'lg' ? ' is-large' : ''}">${escapeHtml(label)}</span>`;
}

function renderHistoryResultBadge(result, size = 'md') {
    return renderToneBadge(formatHistoryResultLabel(result), getHistoryResultTone(result), size);
}

function renderHistoryUploadBadge(uploadStatus, inline = false) {
    const tone = uploadStatus === 'synced' ? 'synced' : 'pending';
    return `<span class="history-sync-badge is-${tone}${inline ? ' is-inline' : ''}">${escapeHtml(formatUploadStatusLabel(uploadStatus))}</span>`;
}

function renderHistoryCommentBadge(flow) {
    if (!flow.comment) return '';
    return `<span class="history-comment-badge" title="Comment saved on this flow">Comment</span>`;
}

function renderHistoryFilterRow(filter) {
    return `
        <div class="history-filter-row">
            <button class="history-filter-btn${filter === 'all' ? ' selected' : ''}" data-history-action="filter-all">All</button>
            <button class="history-filter-btn${filter === 'tests' ? ' selected' : ''}" data-history-action="filter-tests">Tests</button>
            <button class="history-filter-btn${filter === 'controls' ? ' selected' : ''}" data-history-action="filter-controls">Controls</button>
        </div>`;
}

function renderHistoryNotice(notice) {
    if (!notice) return '';
    return `<div class="history-notice">${escapeHtml(notice)}</div>`;
}

function renderHistoryFlowMeta(flow) {
    const parts = [
        `<span class="history-meta-text">${escapeHtml(formatHistoryDateTime(flow.timestamp))}</span>`,
        `<span class="history-meta-text">Port ${escapeHtml(String(flow.channelId || '-'))}</span>`
    ];

    if (flow.sampleId) {
        parts.push(`<span class="history-meta-text">Sample ${escapeHtml(flow.sampleId)}</span>`);
    }

    if (flow.flowId) {
        parts.push(`<span class="history-meta-text">Flow ${escapeHtml(String(flow.flowId))}</span>`);
    }

    if (flow.accountMode === 'anonymous') {
        parts.push('<span class="history-meta-text">Anonymous</span>');
    }

    parts.push(renderHistoryCommentBadge(flow));
    parts.push(renderHistoryUploadBadge(flow.uploadStatus, true));
    return parts.join('');
}

function renderHistorySequenceChips(flow) {
    return flow.tests.map(test => {
        const tone = getHistoryResultTone(test.overall);
        const label = test.overall === 'positive' ? 'POS' : 'NEG';
        return `<span class="history-sequence-chip is-${tone}">
            <span class="history-sequence-chip-dot" aria-hidden="true"></span>
            <span class="history-sequence-chip-text">${getHistoryAnnotationShortLabel(test.annotation)} ${label}</span>
        </span>`;
    }).join('');
}

function renderHistoryField(label, value) {
    return `<div class="history-field">
        <span class="history-field-label">${escapeHtml(label)}</span>
        <span class="history-field-value">${escapeHtml(value)}</span>
    </div>`;
}

function renderStructuredModalHeader(channelId, title, subtitle = '') {
    return `
        <div class="modal-header">
            <div class="modal-header-row">
                <div class="modal-channel-badge">${channelId}</div>
                <div class="header-text">
                    <h2>${escapeHtml(title)}</h2>
                    ${subtitle ? `<span class="modal-subtitle">${escapeHtml(subtitle)}</span>` : ''}
                </div>
            </div>
        </div>`;
}

function renderHistoryLightIntensityChart(points) {
    const series = Array.isArray(points) && points.length > 1
        ? points
        : buildLightIntensitySeries();
    const width = 680;
    const height = 120;
    const paddingX = 8;
    const paddingY = 10;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(max - min, 1);
    const polyline = series.map((point, index) => {
        const x = paddingX + (index / (series.length - 1)) * (width - paddingX * 2);
        const y = paddingY + (1 - ((point - min) / range)) * (height - paddingY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `
        <div class="history-curve-card">
            <div class="history-curve-header">
                <h3>Light Intensity</h3>
                <span>Curve view</span>
            </div>
            <svg class="history-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Light intensity curve">
                <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" class="history-curve-axis"></line>
                <line x1="${paddingX}" y1="${height / 2}" x2="${width - paddingX}" y2="${height / 2}" class="history-curve-grid"></line>
                <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" class="history-curve-grid"></line>
                <polyline class="history-curve-line" points="${polyline}"></polyline>
            </svg>
        </div>`;
}

function getHistoryFlowsForFilter(flows, filter) {
    if (filter === 'tests') {
        return flows.filter(flow => !isHistoryControlFlow(flow));
    }

    if (filter === 'controls') {
        return flows.filter(flow => isHistoryControlFlow(flow));
    }

    return flows;
}

function renderHistoryListView(flows, page, totalPages, filter, notice = '') {
    if (flows.length === 0) {
        return `
            <div class="history-screen-header">
                <div>
                    <h1>History</h1>
                    <p>No test flows recorded on this reader yet.</p>
                </div>
                <button class="history-close-btn" data-history-action="close">Close</button>
            </div>
            <div class="history-screen-body">
                ${renderHistoryFilterRow(filter)}
                ${renderHistoryNotice(notice)}
                <div class="history-placeholder-panel history-placeholder-panel-simple">
                    <strong>No history yet</strong>
                    <p>No records match the current filter on this reader.</p>
                </div>
            </div>`;
    }

    const start = page * HISTORY_PAGE_SIZE;
    const pageFlows = flows.slice(start, start + HISTORY_PAGE_SIZE);

    return `
        <div class="history-screen-header">
            <div>
                <h1>History</h1>
                <p>${flows.length} flow${flows.length === 1 ? '' : 's'} on this reader. Latest first.</p>
            </div>
            <button class="history-close-btn" data-history-action="close">Close</button>
        </div>
        <div class="history-screen-body history-list-body">
            ${renderHistoryFilterRow(filter)}
            ${renderHistoryNotice(notice)}
            <div class="history-flow-list">
                ${pageFlows.map(flow => `
                    <button class="history-flow-row is-${getHistoryFlowTone(flow)}" data-history-action="open-flow" data-history-key="${flow.historyKey}">
                        <div class="history-flow-row-top">
                            <div class="history-flow-main">
                                <div class="history-flow-title">${escapeHtml(flow.testTypeName || flow.scenarioLabel)}</div>
                                <div class="history-flow-meta">${renderHistoryFlowMeta(flow)}</div>
                            </div>
                            <div class="history-flow-side">
                                <span class="history-side-label">Flow Result</span>
                                ${renderHistoryResultBadge(flow.result)}
                            </div>
                        </div>
                        <div class="history-flow-row-bottom">
                            <span class="history-sequence-label">Tests</span>
                            <div class="history-sequence-row">${renderHistorySequenceChips(flow)}</div>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="history-screen-footer">
            <button class="history-page-btn history-page-btn-jump" data-history-action="prev-page-jump"${page === 0 ? ' disabled' : ''}>Prev 5</button>
            <button class="history-page-btn" data-history-action="prev-page"${page === 0 ? ' disabled' : ''}>Previous</button>
            <span class="history-page-indicator">Page ${page + 1} / ${totalPages}</span>
            <button class="history-page-btn" data-history-action="next-page"${page >= totalPages - 1 ? ' disabled' : ''}>Next</button>
            <button class="history-page-btn history-page-btn-jump" data-history-action="next-page-jump"${page >= totalPages - 1 ? ' disabled' : ''}>Next 5</button>
        </div>`;
}

function renderHistoryActionBar(actions) {
    return `<div class="history-action-row">${actions.join('')}</div>`;
}

function renderHistoryCommentSection(flow, editingComment = false, draft = '') {
    const commentText = editingComment ? draft : (flow.comment || '');
    const helper = flow.comment
        ? `Saved on flow level${flow.commentUpdatedAt ? ` · ${escapeHtml(formatHistoryDateTime(flow.commentUpdatedAt, true))}` : ''}`
        : 'Comment applies to the whole flow, not an individual test.';

    if (!deviceSettings.commentsEnabled) {
        return `
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Comment</h2>
                    <span>Disabled in settings</span>
                </div>
                <div class="history-comment-block is-disabled">Comments are turned off for this reader profile.</div>
            </section>`;
    }

    if (editingComment) {
        return `
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Comment</h2>
                    <span>${helper}</span>
                </div>
                <div class="history-comment-editor">
                    <textarea class="history-comment-input" id="history-comment-input" placeholder="Add a flow comment">${escapeHtml(commentText)}</textarea>
                    <div class="history-comment-actions">
                        <button class="history-inline-btn" data-history-action="save-comment">Save Comment</button>
                        <button class="history-inline-btn history-inline-btn-secondary" data-history-action="cancel-comment">Cancel</button>
                    </div>
                </div>
            </section>`;
    }

    return `
        <section class="history-section-card">
            <div class="history-section-header">
                <h2>Comment</h2>
                <span>${helper}</span>
            </div>
            <div class="history-comment-block${flow.comment ? '' : ' is-empty'}">
                ${flow.comment ? escapeHtml(flow.comment) : 'No comment added for this flow yet.'}
            </div>
        </section>`;
}

function renderHistoryFlowView(flow, historyState) {
    const tone = getHistoryFlowTone(flow);
    const summaryKicker = isHistoryControlFlow(flow) ? flow.scenarioLabel : 'Flow Result';
    const editingComment = Boolean(historyState.editingComment);
    const commentActionLabel = flow.comment ? 'Edit Comment' : 'Add Comment';
    const flowActions = renderHistoryActionBar([
        `<button class="history-inline-btn" data-history-action="print-flow"${deviceSettings.printerEnabled ? '' : ' disabled'}>Print Group</button>`,
        '<button class="history-inline-btn" data-history-action="export-csv">Export CSV</button>',
        '<button class="history-inline-btn" data-history-action="export-xlsx">Export XLSX</button>',
        `<button class="history-inline-btn" data-history-action="send-lims"${deviceSettings.limsEnabled ? '' : ' disabled'}>Send to LIMS</button>`,
        `<button class="history-inline-btn history-inline-btn-secondary" data-history-action="edit-comment"${deviceSettings.commentsEnabled ? '' : ' disabled'}>${commentActionLabel}</button>`
    ]);
    return `
        <div class="history-screen-header">
            <div class="history-screen-title-row">
                <button class="history-back-btn" data-history-action="back">Back</button>
                <div>
                    <h1>Flow Detail</h1>
                    <p>${escapeHtml(formatHistoryDateTime(flow.timestamp, true))}</p>
                </div>
            </div>
            <button class="history-close-btn" data-history-action="close">Close</button>
        </div>
        <div class="history-screen-body">
            ${renderHistoryNotice(historyState.notice)}
            <section class="history-summary-card is-${tone}">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">${escapeHtml(summaryKicker)}</span>
                        <h2>${escapeHtml(flow.testTypeName || 'Test')}</h2>
                    </div>
                    ${renderHistoryResultBadge(flow.result, 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Port', String(flow.channelId || 'Not set'))}
                    ${renderHistoryField('Sample ID', flow.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', flow.operatorId || 'Not set')}
                    ${renderHistoryField(flow.accountMode === 'anonymous' ? 'Account' : 'User', flow.accountMode === 'anonymous' ? 'Anonymous' : (flow.userName || 'Signed In'))}
                    ${renderHistoryField('Upload Status', formatUploadStatusLabel(flow.uploadStatus))}
                    ${renderHistoryField('Upload Target', flow.accountMode === 'anonymous' ? 'Anonymous Data site' : activeAccount.siteName)}
                    ${flow.flowId ? renderHistoryField('Flow ID', String(flow.flowId)) : ''}
                </div>
            </section>
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Actions</h2>
                    <span>Available outputs</span>
                </div>
                ${flowActions}
            </section>
            ${renderHistoryCommentSection(flow, editingComment, historyState.commentDraft || flow.comment || '')}
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Contained Tests</h2>
                    <span>${flow.testCount} test${flow.testCount === 1 ? '' : 's'}</span>
                </div>
                <div class="history-test-list">
                    ${flow.tests.map(test => `
                        <button class="history-test-row is-${isHistoryControlFlow(flow) ? 'control' : getHistoryResultTone(test.overall)}" data-history-action="open-test" data-history-key="${flow.historyKey}" data-history-test="${test.testNumber}">
                            <div class="history-test-main">
                                <div class="history-test-title">Test ${test.testNumber}</div>
                                <div class="history-test-meta">${escapeHtml(getHistoryAnnotationLabel(test.annotation))} &middot; ${escapeHtml(formatHistoryDateTime(test.timestamp))}</div>
                            </div>
                            <div class="history-test-side">
                                <span class="history-side-label">Result</span>
                                ${renderHistoryResultBadge(test.overall)}
                            </div>
                        </button>
                    `).join('')}
                </div>
            </section>
        </div>`;
}

function renderHistoryTestView(flow, test, notice = '') {
    const tone = isHistoryControlFlow(flow) ? 'control' : getHistoryResultTone(test.overall);
    return `
        <div class="history-screen-header">
            <div class="history-screen-title-row">
                <button class="history-back-btn" data-history-action="back">Back</button>
                <div>
                    <h1>Test Detail</h1>
                    <p>${escapeHtml(getHistoryAnnotationLabel(test.annotation))}</p>
                </div>
            </div>
            <button class="history-close-btn" data-history-action="close">Close</button>
        </div>
        <div class="history-screen-body">
            ${renderHistoryNotice(notice)}
            <section class="history-summary-card is-${tone}">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">Test ${test.testNumber}</span>
                        <h2>${escapeHtml(flow.testTypeName || test.testTypeName || 'Test')}</h2>
                    </div>
                    ${renderHistoryResultBadge(test.overall, 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Date & Time', formatHistoryDateTime(test.timestamp, true))}
                    ${renderHistoryField('Annotation', getHistoryAnnotationLabel(test.annotation))}
                    ${renderHistoryField('Port', String(flow.channelId || 'Not set'))}
                    ${renderHistoryField('Upload Status', formatUploadStatusLabel(flow.uploadStatus))}
                </div>
            </section>
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Actions</h2>
                    <span>Available output</span>
                </div>
                ${renderHistoryActionBar([
                    `<button class="history-inline-btn" data-history-action="print-test"${deviceSettings.printerEnabled ? '' : ' disabled'}>Print Test</button>`
                ])}
            </section>
            ${flow.comment ? `
                <section class="history-section-card">
                    <div class="history-section-header">
                        <h2>Flow Comment</h2>
                        <span>Shared across this flow</span>
                    </div>
                    <div class="history-comment-block">${escapeHtml(flow.comment)}</div>
                </section>
            ` : ''}
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Substances</h2>
                    <span>${test.substances.length} result${test.substances.length === 1 ? '' : 's'}</span>
                </div>
                <div class="history-substance-list">
                    ${test.substances.map(substance => `
                        <div class="history-substance-row">
                            <span class="history-substance-name">${escapeHtml(substance.name)}</span>
                            <span class="history-substance-value">${escapeHtml(substance.displayValue || '')}</span>
                            <span class="history-substance-result is-${getHistoryResultTone(substance.result)}">${escapeHtml(formatHistoryResultLabel(substance.result))}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
            ${renderHistoryLightIntensityChart(test.lightIntensity)}
        </div>`;
}

function showHistoryScreen(nextState = {}) {
    const screen = document.getElementById('history-screen');
    if (!screen) return;

    const allFlows = getHistoryFlows();
    const currentState = activeModal && activeModal.type === 'history' ? activeModal : {};
    const filter = nextState.filter || currentState.filter || 'all';
    const filteredFlows = getHistoryFlowsForFilter(allFlows, filter);
    const totalPages = Math.max(Math.ceil(filteredFlows.length / HISTORY_PAGE_SIZE), 1);
    const historyState = {
        type: 'history',
        view: nextState.view || currentState.view || 'list',
        flowKey: nextState.flowKey ?? currentState.flowKey ?? null,
        testNumber: nextState.testNumber ?? currentState.testNumber ?? null,
        page: clampHistoryPage(nextState.page ?? currentState.page ?? 0, totalPages),
        filter,
        notice: nextState.notice ?? currentState.notice ?? '',
        editingComment: nextState.editingComment ?? false,
        commentDraft: nextState.commentDraft ?? currentState.commentDraft ?? ''
    };

    let content = '';

    if (historyState.view === 'flow') {
        const flow = findHistoryFlowByKey(historyState.flowKey);
        if (!flow) {
            historyState.view = 'list';
            content = renderHistoryListView(filteredFlows, historyState.page, totalPages, historyState.filter, historyState.notice);
        } else {
            content = renderHistoryFlowView(flow, historyState);
        }
    } else if (historyState.view === 'test') {
        const flow = findHistoryFlowByKey(historyState.flowKey);
        const test = flow?.tests.find(item => String(item.testNumber) === String(historyState.testNumber));
        if (!flow || !test) {
            historyState.view = flow ? 'flow' : 'list';
            content = flow
                ? renderHistoryFlowView(flow, historyState)
                : renderHistoryListView(filteredFlows, historyState.page, totalPages, historyState.filter, historyState.notice);
        } else {
            content = renderHistoryTestView(flow, test, historyState.notice);
        }
    } else {
        historyState.view = 'list';
        content = renderHistoryListView(filteredFlows, historyState.page, totalPages, historyState.filter, historyState.notice);
    }

    activeModal = historyState;
    screen.innerHTML = content;
    screen.classList.add('active');

    screen.querySelectorAll('[data-history-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.historyAction;
            switch (action) {
                case 'close':
                    handleHistoryClose();
                    break;
                case 'back':
                    if (historyState.view === 'test') {
                        showHistoryScreen({
                            view: 'flow',
                            flowKey: historyState.flowKey,
                            page: historyState.page,
                            filter: historyState.filter,
                            notice: ''
                        });
                    } else if (historyState.view === 'flow') {
                        showHistoryScreen({
                            view: 'list',
                            page: historyState.page,
                            filter: historyState.filter,
                            notice: ''
                        });
                    } else {
                        handleHistoryClose();
                    }
                    break;
                case 'prev-page':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page - 1,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'prev-page-jump':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page - HISTORY_PAGE_JUMP,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'next-page':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page + 1,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'next-page-jump':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page + HISTORY_PAGE_JUMP,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'filter-all':
                    showHistoryScreen({
                        view: 'list',
                        page: 0,
                        filter: 'all',
                        notice: ''
                    });
                    break;
                case 'filter-tests':
                    showHistoryScreen({
                        view: 'list',
                        page: 0,
                        filter: 'tests',
                        notice: ''
                    });
                    break;
                case 'filter-controls':
                    showHistoryScreen({
                        view: 'list',
                        page: 0,
                        filter: 'controls',
                        notice: ''
                    });
                    break;
                case 'open-flow':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: button.dataset.historyKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'open-test':
                    showHistoryScreen({
                        view: 'test',
                        flowKey: button.dataset.historyKey,
                        testNumber: button.dataset.historyTest,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: ''
                    });
                    break;
                case 'edit-comment': {
                    const flow = findHistoryFlowByKey(historyState.flowKey);
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        editingComment: true,
                        commentDraft: flow?.comment || ''
                    });
                    break;
                }
                case 'cancel-comment':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        editingComment: false,
                        commentDraft: ''
                    });
                    break;
                case 'save-comment': {
                    const commentValue = screen.querySelector('#history-comment-input')?.value || '';
                    updateHistoryFlowComment(historyState.flowKey, commentValue);
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        editingComment: false,
                        commentDraft: '',
                        notice: 'Comment saved.'
                    });
                    break;
                }
                case 'print-flow':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: 'Group print queued.'
                    });
                    break;
                case 'print-test':
                    showHistoryScreen({
                        view: 'test',
                        flowKey: historyState.flowKey,
                        testNumber: historyState.testNumber,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: 'Test print queued.'
                    });
                    break;
                case 'export-csv':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: 'CSV export prepared.'
                    });
                    break;
                case 'export-xlsx':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: 'Excel export prepared.'
                    });
                    break;
                case 'send-lims':
                    showHistoryScreen({
                        view: 'flow',
                        flowKey: historyState.flowKey,
                        page: historyState.page,
                        filter: historyState.filter,
                        notice: 'LIMS export queued.'
                    });
                    break;
            }
        });
    });
}

function hideHistoryScreen() {
    const screen = document.getElementById('history-screen');
    if (!screen) return;

    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'history') {
        activeModal = null;
    }
}

// ---- Settings Screen ----

function renderSettingsSegmentedControl(id, value, options) {
    const widthClass = options.length > 2 ? ' settings-toggle-wide' : '';
    return `
        <div class="segmented-control settings-toggle${widthClass}" id="${id}">
            ${options.map(option => `
                <button class="seg-option${String(option.value) === String(value) ? ' selected' : ''}" data-value="${option.value}">${option.label}</button>
            `).join('')}
        </div>`;
}

function renderSettingsSection(title, rows, note = '', sectionId = '') {
    return `
        <section class="settings-section"${sectionId ? ` id="${sectionId}"` : ''}>
            <div class="settings-section-header">
                <h2>${title}</h2>
                ${note ? `<p>${note}</p>` : ''}
            </div>
            <div class="settings-section-body">${rows}</div>
        </section>`;
}

function renderSettingsToggleRow({ title, detail, id, value, options }) {
    return `
        <div class="settings-item">
            <div class="settings-item-copy">
                <h3>${title}</h3>
                ${detail ? `<p>${detail}</p>` : ''}
            </div>
            ${renderSettingsSegmentedControl(id, value, options)}
        </div>`;
}

function renderSettingsActionRow({ title, detail = '', value = '', buttonLabel = 'Open', action = '', badge = '' }) {
    return `
        <div class="settings-item settings-item-mock">
            <div class="settings-item-copy">
                <h3>${title}</h3>
                ${detail ? `<p>${detail}</p>` : ''}
            </div>
            <div class="settings-item-meta">
                ${value ? `<span class="settings-inline-value">${value}</span>` : ''}
                ${action ? `<button class="settings-row-btn" data-settings-action="${action}">${buttonLabel}</button>` : ''}
                ${badge ? `<span class="settings-prototype-badge">${badge}</span>` : ''}
            </div>
        </div>`;
}

function renderVerificationCountRows(thresholdValue = deviceSettings.verificationThreshold) {
    return channels.map(channel => {
        const count = getVerificationCountForChannel(channel.id);
        const threshold = Number(thresholdValue || 250);
        const stateClass = count > threshold ? ' is-warning' : '';
        return `
            <div class="settings-count-row${stateClass}">
                <span class="settings-count-port">Port ${channel.id}</span>
                <span class="settings-count-value">${count} / ${threshold}</span>
            </div>`;
    }).join('');
}

function showSettingsPasswordScreen(errorMessage = '') {
    const screen = document.getElementById('settings-password-screen');
    if (!screen) return;

    activeModal = { type: 'settings_password', errorMessage };
    screen.innerHTML = `
        <div class="settings-password-card">
            <div class="settings-screen-title-wrap">
                <h1>Settings Password</h1>
                <p>Enter the reader password to open settings.</p>
            </div>
            <div class="settings-password-body">
                <label class="settings-password-label" for="settings-password-input">Password</label>
                <input class="form-input" id="settings-password-input" type="password" inputmode="numeric" placeholder="Enter password">
                ${errorMessage ? `<div class="settings-password-error">${escapeHtml(errorMessage)}</div>` : '<div class="settings-password-hint">Reader password: 2026</div>'}
            </div>
            <div class="settings-password-actions">
                <button class="history-close-btn" id="settings-password-cancel">Cancel</button>
                <button class="settings-row-btn" id="settings-password-submit">Open Settings</button>
            </div>
        </div>`;

    screen.classList.add('active');
    document.getElementById('settings-password-cancel').addEventListener('click', () => handleSettingsPasswordCancel());
    document.getElementById('settings-password-submit').addEventListener('click', () => {
        handleSettingsPasswordSubmit(document.getElementById('settings-password-input')?.value || '');
    });
}

function hideSettingsPasswordScreen() {
    const screen = document.getElementById('settings-password-screen');
    if (!screen) return;

    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'settings_password') {
        activeModal = null;
    }
}

let prototypeFullScreenTimerId = null;

function clearPrototypeFullScreenTimer() {
    if (prototypeFullScreenTimerId != null) {
        window.clearTimeout(prototypeFullScreenTimerId);
        prototypeFullScreenTimerId = null;
    }
}

function schedulePrototypeFullScreenTransition(callback, delay = 850) {
    clearPrototypeFullScreenTimer();
    prototypeFullScreenTimerId = window.setTimeout(() => {
        prototypeFullScreenTimerId = null;
        callback();
    }, delay);
}

function sanitizeVerificationThreshold(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return 250;
    return Math.min(250, Math.max(1, Math.round(parsedValue)));
}

function renderSelectableListRows(items, selectedValue, attributeName, listClass = '') {
    return `
        <div class="type-picker-list-block${listClass ? ` ${listClass}` : ''}">
            <div class="type-picker-results">
                ${items.map(item => {
                    const value = typeof item === 'string' ? item : item.value;
                    const label = typeof item === 'string' ? item : item.label;
                    const meta = typeof item === 'string' ? '' : (item.meta || '');
                    return `
                    <button class="type-picker-row${value === selectedValue ? ' selected' : ''}" ${attributeName}="${escapeHtml(value)}">
                        <span class="type-picker-row-name">${escapeHtml(label)}</span>
                        ${meta ? `<span class="type-picker-row-meta">${meta}</span>` : ''}
                    </button>
                `;
                }).join('')}
            </div>
        </div>`;
}

function renderLanguageSelectionRows(selectedLanguage, attributeName) {
    return renderSelectableListRows(DEFAULT_LANGUAGE_OPTIONS, selectedLanguage, attributeName, 'settings-language-list');
}

function renderAsyncStateBlock(tone, message) {
    if (!message) return '';

    const safeTone = ['info', 'loading', 'success', 'error'].includes(tone) ? tone : 'info';
    return `
        <div class="async-state-block is-${safeTone}">
            ${safeTone === 'loading' ? '<span class="spinner"></span>' : ''}
            <span>${escapeHtml(message)}</span>
        </div>`;
}

function renderTestTypeToggleControl(testTypeId, enabled, disabled = false) {
    return `
        <div class="segmented-control settings-binary-toggle${disabled ? ' is-disabled' : ''}" data-settings-test-type-toggle="${testTypeId}">
            <button class="seg-option${enabled ? ' selected' : ''}" data-value="on"${disabled ? ' disabled' : ''}>On</button>
            <button class="seg-option${enabled ? '' : ' selected'}" data-value="off"${disabled ? ' disabled' : ''}>Off</button>
        </div>`;
}

function getWifiSignalStrength(signal) {
    switch (signal) {
        case 'Excellent':
            return 4;
        case 'Good':
            return 3;
        case 'Fair':
            return 2;
        default:
            return 1;
    }
}

function renderWifiSignalIcon(signal) {
    const strength = getWifiSignalStrength(signal);
    return `
        <span class="wifi-signal-icon" aria-hidden="true">
            ${Array.from({ length: 4 }, (_, index) => `
                <span class="wifi-signal-bar${index < strength ? ' is-active' : ''}"></span>
            `).join('')}
        </span>`;
}

function renderWifiLockIcon(network) {
    if (!network.security) return '';
    return `
        <span class="wifi-lock-wrap">
            <span class="wifi-lock-icon" aria-hidden="true"></span>
            <span class="wifi-lock-label">${escapeHtml(network.security)}</span>
        </span>`;
}

function buildConnectivityDraft(source = {}) {
    const connectivity = source.connectivity || deviceSettings.connectivity || 'offline';
    const wifiNetwork = source.wifiNetwork || deviceSettings.wifiNetwork || getDefaultWifiNetworkName();
    let wifiStage = source.wifiStage || '';

    if (!wifiStage) {
        if (connectivity === 'wifi') {
            wifiStage = deviceSettings.wifiNetwork ? 'wifi_success' : 'wifi_list';
        } else if (connectivity === 'ethernet') {
            wifiStage = 'ethernet_ready';
        } else {
            wifiStage = 'offline';
        }
    }

    return {
        connectivity,
        wifiStage,
        wifiNetwork,
        wifiPassword: source.wifiPassword || '',
        wifiError: source.wifiError || ''
    };
}

function getConnectivitySummaryText(draft) {
    if (draft.connectivity === 'wifi') {
        return `Wi-Fi ${draft.wifiNetwork || getDefaultWifiNetworkName()}`;
    }
    if (draft.connectivity === 'ethernet') return 'Ethernet';
    return 'Offline';
}

function renderConnectivityPanel(draft) {
    let detail = '';

    if (draft.connectivity === 'offline') {
        detail = `
            ${renderAsyncStateBlock('info', 'Cloud sign-in and internet software updates are unavailable while the reader is offline.')}`;
    } else if (draft.connectivity === 'ethernet') {
        detail = `
            <div class="settings-summary-card">
                <div class="settings-summary-row"><span>Connection</span><strong>Ethernet</strong></div>
                <div class="settings-summary-row"><span>Status</span><strong>Connected</strong></div>
            </div>
            ${renderAsyncStateBlock('success', 'Ethernet connected.')}`;
    } else if (draft.wifiStage === 'wifi_password' || draft.wifiStage === 'wifi_error') {
        detail = `
            <div class="settings-summary-card">
                <div class="settings-summary-row"><span>Wi-Fi</span><strong>${escapeHtml(draft.wifiNetwork)}</strong></div>
                <div class="settings-summary-row"><span>Status</span><strong>Enter Password</strong></div>
            </div>
            <div class="settings-inline-form">
                <label>Wi-Fi Password</label>
                <input class="form-input" id="shared-wifi-password" type="password" value="${escapeHtml(draft.wifiPassword || '')}" placeholder="Enter network password">
            </div>
            ${draft.wifiError ? renderAsyncStateBlock('error', draft.wifiError) : ''}
            <div class="history-action-row">
                <button class="history-inline-btn history-inline-btn-secondary" data-shared-connectivity-action="back-to-wifi-list">Back To Networks</button>
                <button class="history-inline-btn" data-shared-connectivity-action="connect-wifi">Connect</button>
            </div>`;
    } else if (draft.wifiStage === 'wifi_connecting') {
        detail = `
            <div class="settings-summary-card">
                <div class="settings-summary-row"><span>Wi-Fi</span><strong>${escapeHtml(draft.wifiNetwork)}</strong></div>
                <div class="settings-summary-row"><span>Status</span><strong>Connecting...</strong></div>
            </div>
            ${renderAsyncStateBlock('loading', 'Connecting to Wi-Fi...')}`;
    } else if (draft.wifiStage === 'wifi_success') {
        detail = `
            <div class="settings-summary-card">
                <div class="settings-summary-row"><span>Wi-Fi</span><strong>${escapeHtml(draft.wifiNetwork)}</strong></div>
                <div class="settings-summary-row"><span>Status</span><strong>Connected</strong></div>
            </div>
            ${renderAsyncStateBlock('success', `${draft.wifiNetwork} connected.`)}
            <div class="history-action-row">
                <button class="history-inline-btn history-inline-btn-secondary" data-shared-connectivity-action="choose-other-network">Choose Another Network</button>
            </div>`;
    } else {
        detail = `
            <div class="type-picker-list-block">
                <div class="type-picker-results">
                    ${DEFAULT_WIFI_NETWORKS.map(network => `
                        <button class="type-picker-row wifi-network-row${draft.wifiNetwork === network.ssid ? ' selected' : ''}" data-shared-wifi-network="${escapeHtml(network.ssid)}">
                            <span class="wifi-network-name">${escapeHtml(network.ssid)}</span>
                            <span class="wifi-network-icons">
                                ${renderWifiSignalIcon(network.signal)}
                                ${renderWifiLockIcon(network)}
                            </span>
                        </button>
                    `).join('')}
                </div>
            </div>`;
    }

    return `
        <div class="settings-section-body">
            ${renderSettingsToggleRow({
                title: 'Connection',
                detail: 'Offline, Wi-Fi, and Ethernet use the same flow in onboarding and settings.',
                id: 'shared-connectivity-mode',
                value: draft.connectivity,
                options: [
                    { value: 'offline', label: 'Offline' },
                    { value: 'wifi', label: 'Wi-Fi' },
                    { value: 'ethernet', label: 'Ethernet' }
                ]
            })}
            ${detail}
        </div>`;
}

function buildCloudFlowState(source = {}) {
    const accountMode = source.accountMode || (isSignedIn() ? 'signed_in' : 'anonymous');
    return {
        accountMode,
        username: source.username ?? activeAccount.username ?? DEFAULT_CLOUD_USERNAME,
        password: source.password || '',
        signInState: source.signInState || (isSignedIn() && accountMode === 'signed_in' ? 'success' : 'idle'),
        signInError: source.signInError || ''
    };
}

function renderCloudAccountPanel(cloudState, options = {}) {
    const showStatusSummary = isSignedIn() && cloudState.signInState === 'success';
    const activeConnectivity = options.connectivity || deviceSettings.connectivity;
    const connectivityLabel = options.connectivityLabel || getConnectivityLabel(activeConnectivity);
    const signInBlocked = activeConnectivity === 'offline' && !showStatusSummary;
    const asyncStateMarkup = signInBlocked
        ? renderAsyncStateBlock('error', 'Connect to Wi-Fi or Ethernet before signing in.')
        : (cloudState.signInState === 'loading'
            ? renderAsyncStateBlock('loading', 'Signing in...')
            : (cloudState.signInState === 'success_feedback'
                ? renderAsyncStateBlock('success', 'Signed in.')
                : (cloudState.signInError
                    ? renderAsyncStateBlock('error', cloudState.signInError)
                    : renderAsyncStateBlock('info', `Use ${getCloudCredentialHint()}.`))));

    return `
        <div class="settings-section-body">
            ${showStatusSummary ? `
                <div class="settings-summary-card">
                    <div class="settings-summary-row"><span>Username</span><strong>${escapeHtml(cloudState.username)}</strong></div>
                    <div class="settings-summary-row"><span>Site</span><strong>${escapeHtml(activeAccount.siteName)}</strong></div>
                    <div class="settings-summary-row"><span>Connection</span><strong>${escapeHtml(connectivityLabel)}</strong></div>
                </div>
                ${renderAsyncStateBlock('success', 'Signed in.')}
            ` : `
                <div class="settings-inline-form">
                    <label>Username</label>
                    <input class="form-input" id="${options.usernameInputId || 'shared-cloud-username'}" value="${escapeHtml(cloudState.username || '')}" placeholder="Username">
                    <label>Password</label>
                    <input class="form-input" id="${options.passwordInputId || 'shared-cloud-password'}" type="password" value="${escapeHtml(cloudState.password || '')}" placeholder="Password">
                </div>
                ${asyncStateMarkup}
                <div class="history-action-row">
                    <button class="history-inline-btn history-inline-btn-primary" data-shared-cloud-action="login"${signInBlocked ? ' disabled' : ''}>Sign In</button>
                </div>
            `}
            ${showStatusSummary ? `
                <div class="history-action-row">
                    <button class="history-inline-btn" data-shared-cloud-action="logout">Log Out</button>
                </div>
            ` : ''}
        </div>`;
}

function renderOnboardingCloudPanel(draft, connectivityDraft) {
    const signInBlocked = connectivityDraft.connectivity === 'offline';
    const asyncStateMarkup = signInBlocked
        ? renderAsyncStateBlock('error', 'Connect to Wi-Fi or Ethernet before signing in.')
        : (draft.signInState === 'loading'
            ? renderAsyncStateBlock('loading', 'Signing in...')
            : (draft.signInState === 'success_feedback'
                ? renderAsyncStateBlock('success', 'Signed in.')
                : (draft.signInError ? renderAsyncStateBlock('error', draft.signInError) : '')));

    return `
        <div class="settings-section-body">
            <div class="settings-inline-form">
                <label>Username</label>
                <input class="form-input" id="onboarding-username" value="${escapeHtml(draft.username || '')}" placeholder="Username">
                <label>Password</label>
                <input class="form-input" id="onboarding-password" type="password" value="${escapeHtml(draft.password || '')}" placeholder="Password">
            </div>
            ${asyncStateMarkup}
            <div class="history-action-row">
                <button class="history-inline-btn history-inline-btn-primary" data-onboarding-cloud-action="login"${signInBlocked ? ' disabled' : ''}>Sign In</button>
                <button class="history-inline-btn" data-onboarding-cloud-action="continue-anonymous">Continue without login</button>
            </div>
        </div>`;
}

function buildTestTypeManagerState(source = {}) {
    return {
        step: source.step || 'brand',
        brandFilter: source.brandFilter || '',
        categoryFilter: source.categoryFilter || ''
    };
}

function renderTestTypeManagementRows(managerState) {
    const selectedBrand = managerState.brandFilter;
    const selectedCategory = managerState.categoryFilter;
    const filteredTypes = TEST_TYPES.filter(testType => {
        if (selectedBrand && testType.brand !== selectedBrand) return false;
        if (selectedCategory && testType.category.toLowerCase() !== selectedCategory) return false;
        return true;
    });

    if (managerState.step === 'brand') {
        return `
            <div class="settings-section-body">
                ${renderSelectableListRows([
                    { value: 'MilkSafe', label: 'MilkSafe' },
                    { value: 'Bioeasy', label: 'BioEasy' }
                ], selectedBrand, 'data-settings-type-brand')}
            </div>`;
    }

    if (managerState.step === 'category') {
        return `
            <div class="settings-section-body">
                ${renderSelectableListRows([
                    { value: 'cassette', label: 'Cassette Tests' },
                    { value: 'strip', label: 'Strip Tests' }
                ], selectedCategory, 'data-settings-type-category')}
            </div>`;
    }

    return `
        <div class="settings-section-body">
            <div class="settings-detail-note">${escapeHtml(
                isSignedIn()
                    ? `Signed in as ${activeAccount.username}. Test type toggles are loaded from cloud and locked on the device.`
                    : 'Anonymous reader mode. Every loaded test type can be enabled or disabled locally on this device.'
            )}</div>
            <div class="type-picker-list-block">
                <div class="type-picker-results">
                    ${filteredTypes.length === 0 ? '<div class="type-picker-empty">No test types match these filters.</div>' : filteredTypes.map(testType => {
                        const enabled = isTestTypeEnabledForCurrentUser(testType.id);
                        return `
                            <div class="type-picker-row settings-test-type-row">
                                <div class="settings-test-type-copy">
                                    <span class="type-picker-row-name">${escapeHtml(testType.name)}</span>
                                    <span class="type-picker-row-meta">${renderTestTypeBadges(testType)}</span>
                                </div>
                                ${renderTestTypeToggleControl(testType.id, enabled, isSignedIn())}
                            </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function buildSoftwareState(source = {}) {
    return {
        source: source.source || 'cloud',
        stage: source.stage || 'home',
        progress: Number(source.progress || 0),
        installedVersion: source.installedVersion || deviceSettings.softwareVersion || CURRENT_SOFTWARE_VERSION,
        availableVersion: source.availableVersion || LATEST_SOFTWARE_VERSION,
        notice: source.notice || ''
    };
}

function renderSoftwarePanel(softwareState) {
    const currentVersion = softwareState.installedVersion;
    const sourceLabel = softwareState.source === 'usb' ? 'USB Package' : 'Cloud Latest';
    const progressMarkup = softwareState.progress > 0 ? `
        <div class="progress-bar">
            <div class="progress-fill" style="width:${softwareState.progress}%"></div>
        </div>
        <div class="countdown-text">${softwareState.progress}%</div>` : '';

    let detail = `
        <div class="settings-summary-card">
            <div class="settings-summary-row"><span>Installed Version</span><strong>${escapeHtml(currentVersion)}</strong></div>
            <div class="settings-summary-row"><span>${escapeHtml(sourceLabel)}</span><strong>${escapeHtml(softwareState.availableVersion)}</strong></div>
            <div class="settings-summary-row"><span>Source</span><strong>${softwareState.source === 'usb' ? 'USB' : getConnectivityLabel()}</strong></div>
        </div>`;

    if (softwareState.stage === 'checking') {
        detail += renderAsyncStateBlock('loading', 'Checking for updates...');
    } else if (softwareState.stage === 'detecting_usb') {
        detail += renderAsyncStateBlock('loading', 'Reading USB package...');
    } else if (softwareState.stage === 'offline_blocked') {
        detail += renderAsyncStateBlock('error', 'Connect to Wi-Fi or Ethernet before checking for updates.');
    } else if (softwareState.stage === 'up_to_date') {
        detail += renderAsyncStateBlock('success', `Software is up to date. Current version: ${currentVersion}.`);
    } else if (softwareState.stage === 'package_ready') {
        detail += renderAsyncStateBlock('info', softwareState.source === 'usb' ? 'USB package is ready to install.' : 'An update is available.');
    } else if (softwareState.stage === 'transferring') {
        detail += `
            ${renderAsyncStateBlock('loading', softwareState.source === 'usb' ? 'Loading update package...' : 'Downloading update...')}
            ${progressMarkup}`;
    } else if (softwareState.stage === 'installing') {
        detail += `
            ${renderAsyncStateBlock('loading', `Installing ${softwareState.availableVersion}...`)}
            ${progressMarkup}`;
    } else if (softwareState.stage === 'restart_required') {
        detail += renderAsyncStateBlock('success', 'Update loaded. Restart the reader to finish.');
    } else if (softwareState.stage === 'restarting') {
        detail += renderAsyncStateBlock('loading', 'Restarting reader...');
    } else {
        detail += renderAsyncStateBlock('info', 'Choose USB or cloud update.');
    }

    const actions = [];
    actions.push('<button class="history-inline-btn history-inline-btn-secondary" data-settings-software-action="usb">USB Update</button>');
    if (softwareState.stage === 'home' || softwareState.stage === 'offline_blocked' || softwareState.stage === 'up_to_date') {
        actions.push('<button class="history-inline-btn" data-settings-software-action="check">Check Cloud</button>');
    }
    if (softwareState.stage === 'package_ready') {
        actions.push(`<button class="history-inline-btn" data-settings-software-action="download">${softwareState.source === 'usb' ? 'Install' : 'Download'}</button>`);
    }
    if (softwareState.stage === 'restart_required') {
        actions.push('<button class="history-inline-btn" data-settings-software-action="restart">Restart Reader</button>');
    }

    return `
        <div class="settings-section-body">
            ${softwareState.notice ? renderHistoryNotice(softwareState.notice) : ''}
            ${detail}
            <div class="history-action-row">${actions.join('')}</div>
        </div>`;
}

function renderOnboardingStepper(stepIndex, totalSteps) {
    return `
        <div class="onboarding-stepper">
            ${Array.from({ length: totalSteps }, (_, index) => `
                <span class="onboarding-step-dot${index === stepIndex ? ' is-active' : ''}${index < stepIndex ? ' is-complete' : ''}"></span>
            `).join('')}
        </div>`;
}

function showOnboardingScreen(stepIndex = 0, draft = buildOnboardingDraftFromState()) {
    const screen = document.getElementById('onboarding-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();

    const totalSteps = 5;
    const normalizedDraft = {
        ...buildOnboardingDraftFromState(),
        ...draft
    };
    activeModal = { type: 'onboarding', stepIndex, draft: normalizedDraft };

    const sections = [
        {
            title: 'Language',
            body: `
                <div class="settings-section-body">
                    ${renderLanguageSelectionRows(normalizedDraft.language, 'data-onboarding-language')}
                </div>`
        },
        {
            title: 'Printing',
            body: `
                <div class="settings-section-body">
                    ${renderSettingsToggleRow({
                        title: 'Printer',
                        detail: 'Enable or disable printing during setup. This can be changed later in settings.',
                        id: 'onboarding-printer',
                        value: normalizedDraft.printerEnabled ? 'on' : 'off',
                        options: [
                            { value: 'on', label: 'On' },
                            { value: 'off', label: 'Off' }
                        ]
                    })}
                </div>`
        },
        {
            title: 'Internet',
            body: `
                <div class="settings-section-body">
                    ${renderConnectivityPanel(buildConnectivityDraft(normalizedDraft))}
                </div>`
        },
        {
            title: 'Cloud Account',
            body: `
                <div class="settings-section-body">
                    ${renderOnboardingCloudPanel(normalizedDraft, buildConnectivityDraft(normalizedDraft))}
                </div>`
        },
        {
            title: 'Finish',
            body: `
                <div class="settings-section-body">
                    <div class="settings-summary-card">
                        <div class="settings-summary-row"><span>Language</span><strong>${escapeHtml(normalizedDraft.language)}</strong></div>
                        <div class="settings-summary-row"><span>Printer</span><strong>${normalizedDraft.printerEnabled ? 'Enabled' : 'Disabled'}</strong></div>
                        <div class="settings-summary-row"><span>Internet</span><strong>${escapeHtml(getConnectivitySummaryText(buildConnectivityDraft(normalizedDraft)))}</strong></div>
                        <div class="settings-summary-row"><span>Account</span><strong>${escapeHtml(
                            normalizedDraft.accountMode === 'signed_in' && normalizedDraft.signInState === 'success'
                                ? normalizedDraft.username
                                : 'Anonymous'
                        )}</strong></div>
                    </div>
                </div>`
        }
    ];

    const currentStep = sections[Math.min(Math.max(stepIndex, 0), totalSteps - 1)];
    const nextLabel = stepIndex >= totalSteps - 1 ? 'Finish Setup' : 'Next';
    const showBack = stepIndex > 0;
    const connectivityDraft = buildConnectivityDraft(normalizedDraft);
    const canAdvance = stepIndex === 2
        ? connectivityDraft.connectivity !== 'wifi' || connectivityDraft.wifiStage === 'wifi_success'
        : (stepIndex === 3
            ? normalizedDraft.accountMode === 'anonymous' || normalizedDraft.signInState === 'success'
            : true);

    screen.innerHTML = `
        <div class="onboarding-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>First-Time Setup</h1>
                <p>Complete the first-time setup for the reader.</p>
            </div>
        </div>
        <div class="onboarding-screen-body">
            ${renderOnboardingStepper(stepIndex, totalSteps)}
            <section class="settings-section">
                <div class="settings-section-header">
                    <h2>${currentStep.title}</h2>
                    <p>Step ${stepIndex + 1} / ${totalSteps}</p>
                </div>
                ${currentStep.body}
            </section>
        </div>
        <div class="settings-screen-footer">
            ${showBack ? '<button class="modal-btn btn-secondary" id="onboarding-back-btn">Back</button>' : ''}
            <button class="modal-btn btn-primary" id="onboarding-next-btn"${canAdvance ? '' : ' disabled'}>${nextLabel}</button>
        </div>`;

    screen.classList.add('active');

    const collectDraft = () => ({
        ...normalizedDraft,
        printerEnabled: (screen.querySelector('#onboarding-printer .seg-option.selected')?.dataset.value || (normalizedDraft.printerEnabled ? 'on' : 'off')) === 'on',
        wifiPassword: screen.querySelector('#shared-wifi-password')?.value ?? normalizedDraft.wifiPassword,
        username: screen.querySelector('#onboarding-username')?.value ?? normalizedDraft.username,
        password: screen.querySelector('#onboarding-password')?.value ?? normalizedDraft.password
    });

    screen.querySelectorAll('[data-onboarding-language]').forEach(button => {
        button.addEventListener('click', () => {
            showOnboardingScreen(stepIndex, {
                ...collectDraft(),
                language: button.dataset.onboardingLanguage
            });
        });
    });

    screen.querySelectorAll('.settings-toggle .seg-option').forEach(option => {
        option.addEventListener('click', () => {
            const toggle = option.closest('.settings-toggle');
            const toggleId = toggle.id;
            const nextDraft = collectDraft();

            if (toggleId === 'onboarding-printer') {
                showOnboardingScreen(stepIndex, {
                    ...nextDraft,
                    printerEnabled: option.dataset.value === 'on'
                });
                return;
            }

            if (toggleId === 'shared-connectivity-mode') {
                const nextConnectivity = option.dataset.value;
                showOnboardingScreen(stepIndex, {
                    ...nextDraft,
                    connectivity: nextConnectivity,
                    wifiStage: nextConnectivity === 'wifi'
                        ? 'wifi_list'
                        : (nextConnectivity === 'ethernet' ? 'ethernet_ready' : 'offline'),
                    wifiError: ''
                });
                return;
            }

        });
    });

    screen.querySelectorAll('[data-shared-wifi-network]').forEach(button => {
        button.addEventListener('click', () => {
            showOnboardingScreen(stepIndex, {
                ...collectDraft(),
                connectivity: 'wifi',
                wifiNetwork: button.dataset.sharedWifiNetwork,
                wifiStage: 'wifi_password',
                wifiError: ''
            });
        });
    });

    screen.querySelectorAll('[data-shared-connectivity-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.sharedConnectivityAction;
            const nextDraft = collectDraft();

            if (action === 'back-to-wifi-list' || action === 'choose-other-network') {
                showOnboardingScreen(stepIndex, {
                    ...nextDraft,
                    connectivity: 'wifi',
                    wifiStage: 'wifi_list',
                    wifiError: ''
                });
                return;
            }

            if (action === 'connect-wifi') {
                const wifiPassword = screen.querySelector('#shared-wifi-password')?.value || '';
                const selectedNetwork = getWifiNetworkBySsid(nextDraft.wifiNetwork);
                const connectingDraft = {
                    ...nextDraft,
                    connectivity: 'wifi',
                    wifiPassword,
                    wifiStage: 'wifi_connecting',
                    wifiError: ''
                };
                showOnboardingScreen(stepIndex, connectingDraft);
                schedulePrototypeFullScreenTransition(() => {
                    const passwordMatches = selectedNetwork && wifiPassword === selectedNetwork.password;
                    showOnboardingScreen(stepIndex, {
                        ...connectingDraft,
                        wifiStage: passwordMatches ? 'wifi_success' : 'wifi_error',
                        wifiError: passwordMatches ? '' : 'Password incorrect. Re-enter the Wi-Fi password to continue.'
                    });
                });
            }
        });
    });

    screen.querySelectorAll('[data-onboarding-cloud-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.onboardingCloudAction;
            const nextDraft = collectDraft();

            if (action === 'continue-anonymous') {
                showOnboardingScreen(Math.min(stepIndex + 1, totalSteps - 1), {
                    ...nextDraft,
                    accountMode: 'anonymous',
                    signInState: 'idle',
                    signInError: '',
                    password: ''
                });
                return;
            }

            if (action === 'login') {
                const username = screen.querySelector('#onboarding-username')?.value || '';
                const password = screen.querySelector('#onboarding-password')?.value || '';
                if (buildConnectivityDraft(nextDraft).connectivity === 'offline') {
                    showOnboardingScreen(stepIndex, {
                        ...nextDraft,
                        accountMode: 'signed_in',
                        username,
                        password,
                        signInState: 'idle',
                        signInError: 'The reader must be connected to Wi-Fi or Ethernet before it can sign in.'
                    });
                    return;
                }

                const loadingDraft = {
                    ...nextDraft,
                    accountMode: 'signed_in',
                    username,
                    password,
                    signInState: 'loading',
                    signInError: ''
                };

                showOnboardingScreen(stepIndex, loadingDraft);
                schedulePrototypeFullScreenTransition(() => {
                    const success = isCloudCredentialValid(username, password);
                    if (!success) {
                        showOnboardingScreen(stepIndex, {
                            ...loadingDraft,
                            signInState: 'idle',
                            signInError: 'Username or password is incorrect.'
                        });
                        return;
                    }

                    const successDraft = {
                        ...loadingDraft,
                        password: '',
                        signInState: 'success_feedback',
                        signInError: ''
                    };

                    showOnboardingScreen(stepIndex, successDraft);
                    schedulePrototypeFullScreenTransition(() => {
                        showOnboardingScreen(Math.min(stepIndex + 1, totalSteps - 1), {
                            ...successDraft,
                            signInState: 'success'
                        });
                    }, 450);
                }, 700);
            }
        });
    });

    const backBtn = document.getElementById('onboarding-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showOnboardingScreen(stepIndex - 1, collectDraft());
        });
    }

    document.getElementById('onboarding-next-btn').addEventListener('click', () => {
        if (!canAdvance) return;
        const nextDraft = collectDraft();
        if (stepIndex >= totalSteps - 1) {
            handleOnboardingComplete(nextDraft);
            return;
        }
        showOnboardingScreen(stepIndex + 1, nextDraft);
    });
}

function hideOnboardingScreen() {
    const screen = document.getElementById('onboarding-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();
    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'onboarding') {
        activeModal = null;
    }
}

function showSettingsDetailScreen(view, state = {}) {
    const screen = document.getElementById('settings-detail-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();

    const detailState = {
        type: 'settings_detail',
        view,
        notice: state.notice || '',
        factoryPasswordError: state.factoryPasswordError || '',
        focusSection: state.focusSection || '',
        connectivityDraft: buildConnectivityDraft(state.connectivityDraft || {}),
        cloudState: buildCloudFlowState(state.cloudState || {}),
        testTypeState: buildTestTypeManagerState(state.testTypeState || {}),
        softwareState: buildSoftwareState(state.softwareState || {}),
        thresholdInput: String(state.thresholdInput || deviceSettings.verificationThreshold)
    };
    activeModal = detailState;

    let title = 'Settings Detail';
    let subtitle = '';
    let body = '';

    if (view === 'connectivity') {
        title = 'Connect To Internet';
        subtitle = 'Wi-Fi, Ethernet, and offline mode share one reusable reader flow.';
        body = `
            <section class="settings-section">
                ${detailState.notice ? renderHistoryNotice(detailState.notice) : ''}
                ${renderConnectivityPanel(detailState.connectivityDraft)}
            </section>`;
    } else if (view === 'language') {
        title = 'Language';
        subtitle = 'Choose the device language.';
        body = `
            <section class="settings-section">
                <div class="settings-section-body">
                    ${detailState.notice ? renderHistoryNotice(detailState.notice) : ''}
                    ${renderLanguageSelectionRows(deviceSettings.language, 'data-settings-language')}
                </div>
            </section>`;
    } else if (view === 'verification_threshold') {
        const thresholdValue = sanitizeVerificationThreshold(detailState.thresholdInput);
        title = 'Verification Threshold';
        subtitle = 'Set the local early warning for outstanding verification.';
        body = `
            <section class="settings-section">
                <div class="settings-section-body">
                    ${detailState.notice ? renderHistoryNotice(detailState.notice) : ''}
                    <div class="settings-detail-note">Cloud default is 250. Use a lower local number here for an earlier warning.</div>
                    <div class="settings-inline-form">
                        <label>Local Warning Threshold</label>
                        <input class="form-input" id="settings-threshold-input" type="number" min="1" max="250" value="${escapeHtml(String(thresholdValue))}" placeholder="Enter number up to 250">
                    </div>
                    <div class="history-action-row">
                        <button class="history-inline-btn history-inline-btn-secondary" id="settings-threshold-reset">Reset To 250</button>
                        <button class="history-inline-btn" id="settings-threshold-save">Save Threshold</button>
                    </div>
                    <div class="settings-count-panel">
                        <div class="settings-count-panel-head"><strong>${escapeHtml(getVerificationSummaryLabel(thresholdValue))}</strong><span>Per port</span></div>
                        <div class="settings-count-grid">${renderVerificationCountRows(thresholdValue)}</div>
                    </div>
                </div>
            </section>`;
    } else if (view === 'test_types') {
        title = 'Test Types';
        subtitle = detailState.testTypeState.step === 'brand'
            ? 'Choose the brand.'
            : (detailState.testTypeState.step === 'category'
                ? 'Choose cassette or strip tests.'
                : `${detailState.testTypeState.brandFilter} ${detailState.testTypeState.categoryFilter === 'cassette' ? 'Cassette' : 'Strip'} test types.`);
        body = `
            <section class="settings-section">
                ${detailState.notice ? renderHistoryNotice(detailState.notice) : ''}
                ${renderTestTypeManagementRows(detailState.testTypeState)}
            </section>`;
    } else if (view === 'cloud') {
        title = 'MilkSafe Cloud';
        subtitle = 'Sign in with username and password. If already signed in, you can log out here.';
        body = `
            <section class="settings-section">
                ${detailState.notice ? renderHistoryNotice(detailState.notice) : ''}
                ${renderCloudAccountPanel(detailState.cloudState, {
                    usernameInputId: 'settings-cloud-username',
                    passwordInputId: 'settings-cloud-password'
                })}
            </section>`;
    } else if (view === 'date_time') {
        title = 'Date And Time';
        subtitle = 'View the current time and choose the upload timezone.';
        body = `
            <section class="settings-section">
                <div class="settings-section-body">
                    <div class="settings-summary-card">
                        <div class="settings-summary-row"><span>Current Time</span><strong>${escapeHtml(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', timeZone: getSelectedTimezone() }))}</strong></div>
                        <div class="settings-summary-row"><span>Timezone</span><strong>${escapeHtml(deviceSettings.timezone)}</strong></div>
                    </div>
                    ${renderSelectableListRows(DEFAULT_TIMEZONE_OPTIONS, deviceSettings.timezone, 'data-settings-timezone', 'settings-timezone-list')}
                </div>
            </section>`;
    } else if (view === 'software') {
        title = 'Software Update';
        subtitle = 'Check the cloud, download the latest software package, install it, and restart the reader.';
        body = `
            <section class="settings-section">
                ${renderSoftwarePanel(detailState.softwareState)}
            </section>`;
    } else if (view === 'factory_reset') {
        title = 'Factory Reset';
        subtitle = 'Factory reset is protected by the reader password.';
        body = `
            <section class="settings-section">
                <div class="settings-section-body">
                    ${renderHistoryNotice(detailState.notice)}
                    <div class="settings-inline-form">
                        <label>Password</label>
                        <input class="form-input" id="settings-factory-password" type="password" inputmode="numeric" placeholder="Enter password">
                    </div>
                    ${detailState.factoryPasswordError ? `<div class="settings-password-error">${escapeHtml(detailState.factoryPasswordError)}</div>` : '<div class="settings-password-hint">Reader password: 2026</div>'}
                    <div class="history-action-row">
                        <button class="history-inline-btn history-inline-btn-secondary" id="settings-factory-reset-confirm">Factory Reset</button>
                    </div>
                </div>
            </section>`;
    } else {
        title = 'About';
        subtitle = 'Reader summary and software details.';
        body = `
            <section class="settings-section">
                <div class="settings-section-body">
                    <div class="settings-summary-card">
                        <div class="settings-summary-row"><span>Reader</span><strong>5-Port MilkSafe Reader</strong></div>
                        <div class="settings-summary-row"><span>Display</span><strong>800 x 480</strong></div>
                        <div class="settings-summary-row"><span>Software Version</span><strong>${escapeHtml(deviceSettings.softwareVersion || CURRENT_SOFTWARE_VERSION)}</strong></div>
                        <div class="settings-summary-row"><span>Language</span><strong>${escapeHtml(deviceSettings.language)}</strong></div>
                        <div class="settings-summary-row"><span>Timezone</span><strong>${escapeHtml(deviceSettings.timezone)}</strong></div>
                    </div>
                </div>
            </section>`;
    }

    screen.innerHTML = `
        <div class="settings-detail-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            <button class="history-close-btn" id="settings-detail-back">Back</button>
        </div>
        <div class="settings-detail-screen-body">${body}</div>
        ${view === 'factory_reset' ? '<div class="settings-screen-footer"><button class="modal-btn btn-secondary" id="settings-detail-back-footer">Back</button></div>' : ''}`;

    screen.classList.add('active');

    const playSoftwareSequence = (softwareStates, delay = 850) => {
        if (!Array.isArray(softwareStates) || softwareStates.length === 0) return;
        const [currentState, ...remainingStates] = softwareStates;
        showSettingsDetailScreen('software', {
            focusSection: detailState.focusSection,
            softwareState: currentState
        });
        if (remainingStates.length > 0) {
            schedulePrototypeFullScreenTransition(() => playSoftwareSequence(remainingStates, delay), delay);
        }
    };

    screen.querySelectorAll('.settings-toggle .seg-option').forEach(option => {
        option.addEventListener('click', () => {
            const toggle = option.closest('.settings-toggle');
            const nextValue = option.dataset.value;

            if (toggle.id === 'shared-connectivity-mode') {
                if (nextValue === 'offline' || nextValue === 'ethernet') {
                    handleSettingsApply({
                        connectivity: nextValue
                    });
                    renderStatusBar();
                }

                showSettingsDetailScreen('connectivity', {
                    focusSection: detailState.focusSection,
                    connectivityDraft: {
                        ...detailState.connectivityDraft,
                        connectivity: nextValue,
                        wifiStage: nextValue === 'wifi'
                            ? 'wifi_list'
                            : (nextValue === 'ethernet' ? 'ethernet_ready' : 'offline'),
                        wifiError: ''
                    }
                });
                return;
            }
        });
    });

    screen.querySelectorAll('[data-settings-language]').forEach(button => {
        button.addEventListener('click', () => {
            handleSettingsApply({ language: button.dataset.settingsLanguage });
            renderStatusBar();
            showSettingsDetailScreen('language', {
                focusSection: detailState.focusSection
            });
        });
    });

    screen.querySelectorAll('[data-settings-timezone]').forEach(button => {
        button.addEventListener('click', () => {
            handleSettingsApply({ timezone: button.dataset.settingsTimezone });
            renderStatusBar();
            showSettingsDetailScreen('date_time', {
                focusSection: detailState.focusSection
            });
        });
    });

    screen.querySelectorAll('[data-shared-wifi-network]').forEach(button => {
        button.addEventListener('click', () => {
            showSettingsDetailScreen('connectivity', {
                focusSection: detailState.focusSection,
                connectivityDraft: {
                    ...detailState.connectivityDraft,
                    connectivity: 'wifi',
                    wifiNetwork: button.dataset.sharedWifiNetwork,
                    wifiStage: 'wifi_password',
                    wifiError: ''
                }
            });
        });
    });

    screen.querySelectorAll('[data-shared-connectivity-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.sharedConnectivityAction;

            if (action === 'back-to-wifi-list' || action === 'choose-other-network') {
                showSettingsDetailScreen('connectivity', {
                    focusSection: detailState.focusSection,
                    connectivityDraft: {
                        ...detailState.connectivityDraft,
                        connectivity: 'wifi',
                        wifiStage: 'wifi_list',
                        wifiError: ''
                    }
                });
                return;
            }

            if (action === 'connect-wifi') {
                const wifiPassword = document.getElementById('shared-wifi-password')?.value || '';
                const selectedNetwork = getWifiNetworkBySsid(detailState.connectivityDraft.wifiNetwork);
                const connectingDraft = {
                    ...detailState.connectivityDraft,
                    connectivity: 'wifi',
                    wifiPassword,
                    wifiStage: 'wifi_connecting',
                    wifiError: ''
                };

                showSettingsDetailScreen('connectivity', {
                    focusSection: detailState.focusSection,
                    connectivityDraft: connectingDraft
                });

                schedulePrototypeFullScreenTransition(() => {
                    const passwordMatches = selectedNetwork && wifiPassword === selectedNetwork.password;
                    if (passwordMatches) {
                        handleSettingsApply({
                            connectivity: 'wifi',
                            wifiNetwork: connectingDraft.wifiNetwork
                        });
                        renderStatusBar();
                    }

                    showSettingsDetailScreen('connectivity', {
                        focusSection: detailState.focusSection,
                        connectivityDraft: {
                            ...connectingDraft,
                            wifiStage: passwordMatches ? 'wifi_success' : 'wifi_error',
                            wifiError: passwordMatches ? '' : 'Password incorrect. Re-enter the Wi-Fi password to continue.'
                        },
                        notice: passwordMatches ? `${connectingDraft.wifiNetwork} connected successfully.` : ''
                    });
                });
            }
        });
    });

    screen.querySelectorAll('[data-settings-type-brand]').forEach(button => {
        button.addEventListener('click', () => {
            showSettingsDetailScreen('test_types', {
                focusSection: detailState.focusSection,
                testTypeState: {
                    step: 'category',
                    brandFilter: button.dataset.settingsTypeBrand,
                    categoryFilter: ''
                }
            });
        });
    });

    screen.querySelectorAll('[data-settings-type-category]').forEach(button => {
        button.addEventListener('click', () => {
            showSettingsDetailScreen('test_types', {
                focusSection: detailState.focusSection,
                testTypeState: {
                    ...detailState.testTypeState,
                    step: 'list',
                    categoryFilter: button.dataset.settingsTypeCategory
                }
            });
        });
    });

    screen.querySelectorAll('[data-settings-test-type-toggle]').forEach(toggle => {
        toggle.querySelectorAll('.seg-option').forEach(option => {
            option.addEventListener('click', () => {
                if (isSignedIn()) return;
                const testTypeId = Number(toggle.dataset.settingsTestTypeToggle);
                setAnonymousTestTypeEnabled(testTypeId, option.dataset.value === 'on');
                showSettingsDetailScreen('test_types', {
                    focusSection: detailState.focusSection,
                    testTypeState: detailState.testTypeState
                });
            });
        });
    });

    screen.querySelectorAll('[data-shared-cloud-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.sharedCloudAction;
            if (action === 'logout') {
                applyAccountMode('anonymous');
                renderStatusBar();
                showSettingsDetailScreen('cloud', {
                    focusSection: detailState.focusSection,
                    cloudState: {
                        accountMode: 'anonymous',
                        username: activeAccount.username,
                        password: '',
                        signInState: 'idle',
                        signInError: ''
                    },
                    notice: 'Reader switched to anonymous mode.'
                });
                return;
            }

            if (action === 'login') {
                const username = document.getElementById('settings-cloud-username')?.value || '';
                const password = document.getElementById('settings-cloud-password')?.value || '';
                if (deviceSettings.connectivity === 'offline') {
                    showSettingsDetailScreen('cloud', {
                        focusSection: detailState.focusSection,
                        cloudState: {
                            ...detailState.cloudState,
                            username,
                            password,
                            signInState: 'idle',
                            signInError: 'The reader must be connected to Wi-Fi or Ethernet before it can sign in.'
                        }
                    });
                    return;
                }

                const loadingState = {
                    ...detailState.cloudState,
                    username,
                    password,
                    signInState: 'loading',
                    signInError: ''
                };
                showSettingsDetailScreen('cloud', {
                    focusSection: detailState.focusSection,
                    cloudState: loadingState
                });

                schedulePrototypeFullScreenTransition(() => {
                    const success = isCloudCredentialValid(username, password);
                    if (!success) {
                        showSettingsDetailScreen('cloud', {
                            focusSection: detailState.focusSection,
                            cloudState: {
                                ...loadingState,
                                signInState: 'idle',
                                signInError: 'Username or password is incorrect.'
                            }
                        });
                        return;
                    }

                    showSettingsDetailScreen('cloud', {
                        focusSection: detailState.focusSection,
                        cloudState: {
                            ...loadingState,
                            password: '',
                            signInState: 'success_feedback',
                            signInError: ''
                        }
                    });

                    schedulePrototypeFullScreenTransition(() => {
                        applyAccountMode('signed_in', { username });
                        renderStatusBar();
                        showSettingsDetailScreen('cloud', {
                            focusSection: detailState.focusSection,
                            cloudState: {
                                username,
                                password: '',
                                signInState: 'success',
                                signInError: ''
                            }
                        });
                    }, 450);
                }, 700);
            }
        });
    });

    screen.querySelectorAll('[data-settings-software-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.settingsSoftwareAction;
            if (action === 'usb') {
                showSettingsDetailScreen('software', {
                    focusSection: detailState.focusSection,
                    softwareState: {
                        ...detailState.softwareState,
                        source: 'usb',
                        stage: 'detecting_usb',
                        notice: ''
                    }
                });

                schedulePrototypeFullScreenTransition(() => {
                    showSettingsDetailScreen('software', {
                        focusSection: detailState.focusSection,
                        softwareState: {
                            ...detailState.softwareState,
                            source: 'usb',
                            stage: 'package_ready',
                            progress: 0
                        }
                    });
                });
                return;
            }

            if (action === 'check') {
                if (deviceSettings.connectivity === 'offline') {
                    showSettingsDetailScreen('software', {
                        focusSection: detailState.focusSection,
                        softwareState: {
                            ...detailState.softwareState,
                            stage: 'offline_blocked'
                        }
                    });
                    return;
                }

                showSettingsDetailScreen('software', {
                    focusSection: detailState.focusSection,
                    softwareState: {
                        ...detailState.softwareState,
                        source: 'cloud',
                        stage: 'checking',
                        progress: 0
                    }
                });

                schedulePrototypeFullScreenTransition(() => {
                    showSettingsDetailScreen('software', {
                        focusSection: detailState.focusSection,
                        softwareState: {
                            ...detailState.softwareState,
                            source: 'cloud',
                            stage: compareSoftwareVersions(LATEST_SOFTWARE_VERSION, deviceSettings.softwareVersion || CURRENT_SOFTWARE_VERSION) > 0
                                ? 'package_ready'
                                : 'up_to_date'
                        }
                    });
                });
                return;
            }

            if (action === 'download') {
                const source = detailState.softwareState.source || 'cloud';
                playSoftwareSequence([
                    { ...detailState.softwareState, source, stage: 'transferring', progress: source === 'usb' ? 46 : 22 },
                    { ...detailState.softwareState, source, stage: 'transferring', progress: source === 'usb' ? 100 : 56 },
                    { ...detailState.softwareState, source, stage: 'transferring', progress: 100 },
                    { ...detailState.softwareState, source, stage: 'installing', progress: 34 },
                    { ...detailState.softwareState, source, stage: 'installing', progress: 82 },
                    { ...detailState.softwareState, source, stage: 'restart_required', progress: 100 }
                ]);
                return;
            }

            if (action === 'restart') {
                showSettingsDetailScreen('software', {
                    focusSection: detailState.focusSection,
                    softwareState: {
                        ...detailState.softwareState,
                        stage: 'restarting',
                        progress: 100
                    }
                });

                schedulePrototypeFullScreenTransition(() => {
                    deviceSettings.softwareVersion = LATEST_SOFTWARE_VERSION;
                    showSettingsDetailScreen('software', {
                        focusSection: detailState.focusSection,
                        softwareState: {
                            ...detailState.softwareState,
                            installedVersion: deviceSettings.softwareVersion,
                            stage: 'up_to_date',
                            progress: 0,
                            notice: `Reader restarted on ${deviceSettings.softwareVersion}. Software is now up to date.`
                        }
                    });
                });
            }
        });
    });

    document.querySelectorAll('#settings-detail-back, #settings-detail-back-footer').forEach(button => {
        button.addEventListener('click', () => {
            if (view === 'test_types' && detailState.testTypeState.step === 'list') {
                showSettingsDetailScreen('test_types', {
                    focusSection: detailState.focusSection,
                    testTypeState: {
                        ...detailState.testTypeState,
                        step: 'category'
                    }
                });
                return;
            }

            if (view === 'test_types' && detailState.testTypeState.step === 'category') {
                showSettingsDetailScreen('test_types', {
                    focusSection: detailState.focusSection,
                    testTypeState: {
                        step: 'brand',
                        brandFilter: '',
                        categoryFilter: ''
                    }
                });
                return;
            }

            handleSettingsDetailClose(true, detailState.focusSection);
        });
    });

    const thresholdSaveBtn = document.getElementById('settings-threshold-save');
    if (thresholdSaveBtn) {
        thresholdSaveBtn.addEventListener('click', () => {
            const nextThreshold = sanitizeVerificationThreshold(document.getElementById('settings-threshold-input')?.value || detailState.thresholdInput);
            handleSettingsApply({ verificationThreshold: nextThreshold });
            renderStatusBar();
            showSettingsDetailScreen('verification_threshold', {
                focusSection: detailState.focusSection,
                thresholdInput: String(nextThreshold),
                notice: `Local verification warning saved to ${nextThreshold}.`
            });
        });
    }

    const thresholdResetBtn = document.getElementById('settings-threshold-reset');
    if (thresholdResetBtn) {
        thresholdResetBtn.addEventListener('click', () => {
            handleSettingsApply({ verificationThreshold: 250 });
            showSettingsDetailScreen('verification_threshold', {
                focusSection: detailState.focusSection,
                thresholdInput: '250',
                notice: 'Local verification warning reset to 250.'
            });
        });
    }

    const factoryResetBtn = document.getElementById('settings-factory-reset-confirm');
    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', () => {
            const password = document.getElementById('settings-factory-password')?.value || '';
            if (String(password).trim() !== SETTINGS_PASSWORD) {
                showSettingsDetailScreen('factory_reset', {
                    focusSection: detailState.focusSection,
                    factoryPasswordError: 'Wrong password. Use 2026.'
                });
                return;
            }

            resetPrototypeToFactoryDefaults();
            hideSettingsDetailScreen();
            populateSimulationTypeOptions();
            renderAllCards();
            renderStatusBar();
            renderSimulationButtons();
        });
    }
}

function hideSettingsDetailScreen() {
    const screen = document.getElementById('settings-detail-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();
    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'settings_detail') {
        activeModal = null;
    }
}

function showSettingsScreen(focusSection = '') {
    const screen = document.getElementById('settings-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();
    activeModal = { type: 'settings', focusSection };

    screen.innerHTML = `
        <div class="settings-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>Settings</h1>
                <p>${escapeHtml(isSignedIn() ? `${activeAccount.username} · ${activeAccount.siteName}` : 'Anonymous reader mode')}</p>
            </div>
            <button class="history-close-btn" id="settings-screen-close">Close</button>
        </div>
        <div class="settings-screen-body">
            ${renderSettingsSection('Reader Controls', [
                renderSettingsToggleRow({
                    title: 'Temperature',
                    detail: 'Off disables incubation. 40 C and 50 C are the supported reader temperatures.',
                    id: 'set-temperature',
                    value: normalizeDeviceTemperature(deviceSettings.deviceTemperature),
                    options: [
                        { value: 'off', label: 'Off' },
                        { value: 40, label: '40 C' },
                        { value: 50, label: '50 C' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'QR Scanning',
                    detail: 'Cassette QR loads the test type automatically when QR is available.',
                    id: 'set-qr',
                    value: deviceSettings.qrScanningEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'Micro Switch',
                    detail: 'Uses cassette insertion detection instead of manual start.',
                    id: 'set-microswitch',
                    value: deviceSettings.microswitchEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsActionRow({
                    title: 'Language',
                    detail: 'Open the full device language list on a dedicated screen.',
                    value: deviceSettings.language,
                    buttonLabel: 'Open',
                    action: 'open-language'
                })
            ].join(''), 'Live settings that apply right away.', 'settings-reader-controls')}
            ${renderSettingsSection('Verification', [
                renderSettingsActionRow({
                    title: 'Run Verification',
                    detail: 'Verification stays separate for now.',
                    buttonLabel: 'Open',
                    action: 'open-verification'
                }),
                renderSettingsActionRow({
                    title: 'Verification Threshold',
                    detail: `Local device warning set to ${deviceSettings.verificationThreshold}. The cloud default remains 250.`,
                    value: getVerificationOutstandingCount() > 0 ? getVerificationSummaryLabel() : `Local ${deviceSettings.verificationThreshold}`,
                    buttonLabel: 'Manage',
                    action: 'open-verification-threshold',
                    badge: getVerificationOutstandingCount() > 0 ? 'Attention' : ''
                })
            ].join(''), 'Verification stays separate for now.', 'settings-verification')}
            ${renderSettingsSection('Data And Setup', [
                renderSettingsActionRow({
                    title: 'Test Types',
                    detail: isSignedIn() ? 'Signed-in readers show cloud-loaded test types and lock the toggles.' : 'Anonymous readers can enable or disable every loaded test type locally.',
                    value: isSignedIn() ? 'Cloud' : 'Local',
                    buttonLabel: 'Manage',
                    action: 'open-test-types'
                }),
                renderSettingsActionRow({
                    title: 'Connect To Internet',
                    detail: 'Wi-Fi uses saved credentials and Ethernet is plug-and-play.',
                    value: getConnectivityLabel(),
                    buttonLabel: 'Manage',
                    action: 'open-connectivity'
                }),
                renderSettingsActionRow({
                    title: 'MilkSafe Cloud',
                    detail: 'Sign in with username and password, or continue as anonymous.',
                    value: isSignedIn() ? activeAccount.username : 'Anonymous',
                    buttonLabel: 'Manage',
                    action: 'open-cloud'
                }),
                renderSettingsActionRow({
                    title: 'Date And Time',
                    detail: 'Date, time, and timezone for uploads.',
                    value: deviceSettings.timezone,
                    buttonLabel: 'Manage',
                    action: 'open-date-time'
                }),
                renderSettingsActionRow({
                    title: 'Load Quant Curve',
                    detail: 'Load a batch calibration curve before starting a quantitative test.',
                    buttonLabel: 'Open',
                    action: 'open-curve-loader'
                })
            ].join(''), '', 'settings-setup')}
            ${renderSettingsSection('Outputs And Metadata', [
                renderSettingsToggleRow({
                    title: 'Printer',
                    detail: 'Enable or disable printed result outputs.',
                    id: 'set-printer',
                    value: deviceSettings.printerEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'Comments',
                    detail: 'Controls whether flow comments can be added in history.',
                    id: 'set-comments',
                    value: deviceSettings.commentsEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'Sample ID',
                    detail: 'Show or hide sample ID capture in test configuration.',
                    id: 'set-sample-id',
                    value: deviceSettings.sampleIdEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'Operator ID',
                    detail: 'Show or hide operator ID capture in test configuration.',
                    id: 'set-operator-id',
                    value: deviceSettings.operatorIdEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'LIMS',
                    detail: 'Enable the LIMS export action in history.',
                    id: 'set-lims',
                    value: deviceSettings.limsEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                }),
                renderSettingsToggleRow({
                    title: 'Sound',
                    detail: 'Reader sound on or off.',
                    id: 'set-sound',
                    value: deviceSettings.soundEnabled ? 'on' : 'off',
                    options: [
                        { value: 'on', label: 'On' },
                        { value: 'off', label: 'Off' }
                    ]
                })
            ].join(''), '', 'settings-outputs')}
            ${renderSettingsSection('Maintenance', [
                renderSettingsActionRow({
                    title: 'Software Update',
                    detail: 'Check the latest software and step through the update flow.',
                    value: deviceSettings.softwareVersion || CURRENT_SOFTWARE_VERSION,
                    buttonLabel: 'Open',
                    action: 'open-software'
                }),
                renderSettingsActionRow({
                    title: 'Factory Reset',
                    detail: 'Password-protected factory reset.',
                    buttonLabel: 'Open',
                    action: 'open-factory-reset'
                }),
                renderSettingsActionRow({
                    title: 'About',
                    detail: 'Reader and software summary.',
                    buttonLabel: 'Open',
                    action: 'open-about'
                })
            ].join(''), '', 'settings-maintenance')}
        </div>`;

    screen.classList.add('active');

    screen.querySelectorAll('.settings-toggle .seg-option').forEach(option => {
        option.addEventListener('click', () => {
            const toggle = option.closest('.settings-toggle');
            const toggleId = toggle.id;
            const nextValue = option.dataset.value;

            let nextSettings = {};
            if (toggleId === 'set-temperature') nextSettings = { deviceTemperature: nextValue };
            if (toggleId === 'set-qr') nextSettings = { qrScanningEnabled: nextValue === 'on' };
            if (toggleId === 'set-microswitch') nextSettings = { microswitchEnabled: nextValue === 'on' };
            if (toggleId === 'set-printer') nextSettings = { printerEnabled: nextValue === 'on' };
            if (toggleId === 'set-comments') nextSettings = { commentsEnabled: nextValue === 'on' };
            if (toggleId === 'set-sample-id') nextSettings = { sampleIdEnabled: nextValue === 'on' };
            if (toggleId === 'set-operator-id') nextSettings = { operatorIdEnabled: nextValue === 'on' };
            if (toggleId === 'set-lims') nextSettings = { limsEnabled: nextValue === 'on' };
            if (toggleId === 'set-sound') nextSettings = { soundEnabled: nextValue === 'on' };

            handleSettingsApply(nextSettings);
            renderStatusBar();
            showSettingsScreen(focusSection);
        });
    });

    document.getElementById('settings-screen-close').addEventListener('click', () => {
        handleSettingsCancel();
    });

    screen.querySelectorAll('[data-settings-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.settingsAction;
            if (action === 'open-verification') {
                hideSettingsScreen();
                showVerificationScreen();
                return;
            }
            if (action === 'open-curve-loader') {
                hideSettingsScreen();
                showSettingsCurveScreen();
                return;
            }
            if (action === 'open-language') {
                hideSettingsScreen();
                showSettingsDetailScreen('language', { focusSection: 'settings-reader-controls' });
                return;
            }
            if (action === 'open-verification-threshold') {
                hideSettingsScreen();
                showSettingsDetailScreen('verification_threshold', { focusSection: 'settings-verification' });
                return;
            }
            if (action === 'open-connectivity') {
                hideSettingsScreen();
                showSettingsDetailScreen('connectivity', { focusSection: 'settings-setup' });
                return;
            }
            if (action === 'open-test-types') {
                hideSettingsScreen();
                showSettingsDetailScreen('test_types', { focusSection: 'settings-setup' });
                return;
            }
            if (action === 'open-cloud') {
                hideSettingsScreen();
                showSettingsDetailScreen('cloud', { focusSection: 'settings-setup' });
                return;
            }
            if (action === 'open-date-time') {
                hideSettingsScreen();
                showSettingsDetailScreen('date_time', { focusSection: 'settings-setup' });
                return;
            }
            if (action === 'open-software') {
                hideSettingsScreen();
                showSettingsDetailScreen('software', { focusSection: 'settings-maintenance' });
                return;
            }
            if (action === 'open-factory-reset') {
                hideSettingsScreen();
                showSettingsDetailScreen('factory_reset', { focusSection: 'settings-maintenance' });
                return;
            }
            if (action === 'open-about') {
                hideSettingsScreen();
                showSettingsDetailScreen('about', { focusSection: 'settings-maintenance' });
            }
        });
    });

    if (focusSection) {
        const focusElement = document.getElementById(focusSection);
        if (focusElement) {
            focusElement.scrollIntoView({ block: 'start' });
        }
    }
}

function hideSettingsScreen() {
    const screen = document.getElementById('settings-screen');
    if (!screen) return;

    clearPrototypeFullScreenTimer();
    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'settings') {
        activeModal = null;
    }
}

function hideSettingsCurveScreen() {
    const screen = document.getElementById('settings-curve-screen');
    if (!screen) return;

    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'settings_curve') {
        activeModal = null;
    }
}

// ---- Verification Screen ----

function showVerificationScreen() {
    const screen = document.getElementById('verification-screen');
    if (!screen) return;

    activeModal = { type: 'verification' };

    screen.innerHTML = `
        <div class="verification-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>Verification</h1>
                <p>Verification is not available yet.</p>
            </div>
            <button class="history-close-btn" id="verification-screen-close">Back</button>
        </div>
        <div class="verification-screen-body">
            <div class="history-placeholder-panel history-placeholder-panel-simple">
                <strong>Verification not implemented</strong>
                <p>This screen reserves the separate verification flow.</p>
            </div>
        </div>`;

    screen.classList.add('active');

    document.getElementById('verification-screen-close').addEventListener('click', () => {
        handleVerificationClose();
    });
}

function hideVerificationScreen() {
    const screen = document.getElementById('verification-screen');
    if (!screen) return;

    screen.classList.remove('active');
    screen.innerHTML = '';

    if (activeModal && activeModal.type === 'verification') {
        activeModal = null;
    }
}

// ---- Decision Modal ----

function showDecisionModal(ch, variant) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('decision-modal');
    if (!overlay || !modal) return;

    activeModal = { type: 'decision', channelId: ch.id, variant };

    const lastResult = ch.testResults[ch.testResults.length - 1];
    const isPos = isTestPositive(lastResult.substances);
    const resultKey = isPos ? 'positive' : 'negative';
    const testTypeLabel = ch.testTypeName || ch.cassetteType || 'Test';

    let headerTitle, resultLabel, messageHtml, continueLabel;

    if (variant === 'a') {
        headerTitle = 'Confirmation Required';
        resultLabel = 'Test 1 Result';
        continueLabel = 'Start Test 2';
        messageHtml = `<p>Test 1 is positive. Insert a new ${testTypeLabel} cassette, then start Test 2.</p>
                       <p class="decision-hint">Abort &rarr; Flow result inconclusive</p>`;
    } else {
        headerTitle = 'Tiebreaker Required';
        resultLabel = 'Test 2 Result';
        continueLabel = 'Start Test 3';
        messageHtml = `<p>Test 1 is positive and Test 2 is negative. Insert a new ${testTypeLabel} cassette, then start Test 3.</p>
                       <p class="decision-hint">Abort &rarr; Flow result inconclusive</p>`;
    }

    const substancesHtml = lastResult.substances.map(s => {
        return `<div class="history-substance-row">
            <span class="history-substance-name">${escapeHtml(s.name)}</span>
            <span class="history-substance-value">${escapeHtml(s.displayValue || '')}</span>
            <span class="history-substance-result is-${getHistoryResultTone(s.result)}">${escapeHtml(formatHistoryResultLabel(s.result))}</span>
        </div>`;
    }).join('');

    modal.innerHTML = `
        ${renderStructuredModalHeader(ch.id, headerTitle, `Channel ${ch.id}`)}
        <div class="modal-body modal-structured-body">
            <section class="history-summary-card modal-summary-card is-${resultKey}">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">${resultLabel}</span>
                        <h2>${escapeHtml(testTypeLabel)}</h2>
                    </div>
                    ${renderHistoryResultBadge(resultKey, 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Sample ID', ch.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', ch.operatorId || 'Not set')}
                </div>
            </section>
            <section class="history-section-card modal-section-card">
                <div class="history-section-header">
                    <h2>Substances</h2>
                    <span>${lastResult.substances.length} result${lastResult.substances.length === 1 ? '' : 's'}</span>
                </div>
                <div class="history-substance-list">
                    ${substancesHtml}
                </div>
            </section>
            <div class="decision-message">${messageHtml}</div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="decision-abort">Abort Flow</button>
            <button class="modal-btn btn-primary" id="decision-continue">${continueLabel}</button>
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

    document.getElementById('decision-abort').addEventListener('click', () => {
        handleDecisionAbort(ch.id);
    });

    document.getElementById('decision-continue').addEventListener('click', () => {
        handleDecisionContinue(ch.id);
    });
}

// ---- Stop Confirmation Modal ----

function showStopConfirmationModal(ch) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('decision-modal');
    if (!overlay || !modal) return;

    activeModal = { type: 'stop_confirm', channelId: ch.id };

    const completedTests = ch.testResults.length;
    const testsHtml = ch.testResults.map(tr => {
        const resultKey = isTestPositive(tr.substances) ? 'positive' : 'negative';
        const annotationLabel = getHistoryAnnotationLabel(tr.annotation || getHistoryAnnotationForTest(ch.scenario, tr.testNumber));
        return `<div class="history-test-row history-test-row-static is-${resultKey}">
            <div class="history-test-main">
                <div class="history-test-title">Test ${tr.testNumber}</div>
                <div class="history-test-meta">${escapeHtml(annotationLabel)} &middot; ${escapeHtml(formatHistoryDateTime(tr.completedAt, true))}</div>
            </div>
            <div class="history-test-side">
                <span class="history-side-label">Result</span>
                ${renderHistoryResultBadge(resultKey)}
            </div>
        </div>`;
    }).join('');

    modal.innerHTML = `
        ${renderStructuredModalHeader(ch.id, 'Abort Flow', `Channel ${ch.id}`)}
        <div class="modal-body modal-structured-body">
            <section class="history-summary-card modal-summary-card is-warning">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">Flow Action</span>
                        <h2>${escapeHtml(ch.testTypeName || ch.cassetteType || 'Test')}</h2>
                    </div>
                    ${renderToneBadge('Inconclusive', 'inconclusive', 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Sample ID', ch.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', ch.operatorId || 'Not set')}
                    ${renderHistoryField('Completed Tests', String(completedTests))}
                </div>
            </section>
            ${completedTests > 0 ? `
                <section class="history-section-card modal-section-card">
                    <div class="history-section-header">
                        <h2>Completed Tests</h2>
                        <span>${completedTests} test${completedTests === 1 ? '' : 's'}</span>
                    </div>
                    <div class="history-test-list">
                        ${testsHtml}
                    </div>
                </section>
            ` : ''}
            <div class="decision-message is-warning">
                <p>Aborting now records this flow as inconclusive.</p>
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="stop-cancel">Keep Flow</button>
            <button class="modal-btn btn-warning" id="stop-confirm">Abort Flow</button>
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

    document.getElementById('stop-cancel').addEventListener('click', () => {
        handleStopCancel(ch.id);
    });

    document.getElementById('stop-confirm').addEventListener('click', () => {
        handleStopConfirm(ch.id);
    });
}

// ---- Detail Modal ----

function showDetailModal(ch) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('detail-modal');
    if (!overlay || !modal) return;

    activeModal = { type: 'detail', channelId: ch.id };
    const totalTests = ch.testResults.length;
    modal.classList.toggle('single-test', totalTests <= 1);

    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';
    const scenarioLabels = {
        'test': 'Standard Test',
        'pos_control': 'Positive Control',
        'animal_control': 'Animal Control'
    };

    let summaryTone = 'inconclusive';
    let summaryBadge = '';
    if (isControl) {
        const lastResult = ch.testResults[ch.testResults.length - 1];
        const isPos = isTestPositive(lastResult.substances);
        summaryTone = 'control';
        summaryBadge = renderHistoryResultBadge(isPos ? 'positive' : 'negative', 'lg');
    } else if (ch.groupResult) {
        summaryTone = getHistoryResultTone(ch.groupResult);
        summaryBadge = renderHistoryResultBadge(ch.groupResult, 'lg');
    }

    const testsHtml = ch.testResults.map(tr => {
        const resultKey = isTestPositive(tr.substances) ? 'positive' : 'negative';
        const annotationLabel = getHistoryAnnotationLabel(tr.annotation || getHistoryAnnotationForTest(ch.scenario, tr.testNumber));
        const timestampLabel = tr.completedAt ? formatHistoryDateTime(tr.completedAt, true) : 'Just completed';
        const subsHtml = tr.substances.map(s =>
            `<div class="history-substance-row">
                <span class="history-substance-name">${escapeHtml(s.name)}</span>
                <span class="history-substance-value">${escapeHtml(s.displayValue || '')}</span>
                <span class="history-substance-result is-${getHistoryResultTone(s.result)}">${escapeHtml(formatHistoryResultLabel(s.result))}</span>
            </div>`
        ).join('');
        return `<div class="test-entry is-${isControl ? 'control' : resultKey}">
            <div class="test-entry-header">
                <div class="test-entry-title-group">
                    <span class="test-num">Test ${tr.testNumber}</span>
                    <span class="test-entry-meta">${escapeHtml(annotationLabel)} &middot; ${escapeHtml(timestampLabel)}</span>
                </div>
                ${renderHistoryResultBadge(resultKey)}
            </div>
            <div class="history-substance-list history-substance-list-compact">${subsHtml}</div>
        </div>`;
    }).join('');

    const processingLabels = {
        'read_only': 'Read Only',
        'read_incubate': 'Read + Incubate'
    };

    modal.innerHTML = `
        ${renderStructuredModalHeader(ch.id, 'Flow Detail', `Channel ${ch.id}`)}
        <div class="modal-body modal-structured-body">
            <section class="history-summary-card modal-summary-card is-${summaryTone}">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">${escapeHtml(scenarioLabels[ch.scenario] || 'Test Flow')}</span>
                        <h2>${escapeHtml(ch.testTypeName || ch.cassetteType || 'Test')}</h2>
                    </div>
                    ${summaryBadge}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Sample ID', ch.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', ch.operatorId || 'Not set')}
                    ${renderHistoryField(ch.accountMode === 'anonymous' ? 'Account' : 'User', ch.accountMode === 'anonymous' ? 'Anonymous' : (ch.userName || getActiveUserName() || 'Signed In'))}
                    ${renderHistoryField('Processing', processingLabels[ch.processing] || ch.processing || 'Not set')}
                    ${renderHistoryField('Channel', String(ch.id))}
                    ${renderHistoryField('Upload Status', 'Not Synced')}
                </div>
            </section>
            <section class="history-section-card modal-section-card">
                <div class="history-section-header">
                    <h2>Contained Tests</h2>
                    <span>${totalTests} test${totalTests === 1 ? '' : 's'}</span>
                </div>
                <div class="test-history test-history-structured">
                    ${testsHtml}
                </div>
            </section>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="detail-close-btn">Close</button>
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

    document.getElementById('detail-close-btn').addEventListener('click', () => handleCloseDetail());
}
