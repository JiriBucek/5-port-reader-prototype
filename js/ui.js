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
                              <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Tap Configure</span>`;
                statusClass = ' is-dual';
            }
            break;

        case STATES.DETECTED:
            statusHtml = `<span class="status-text">Cassette detected</span>
                          <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Tap Configure</span>`;
            statusClass = ' is-dual';
            break;

        case STATES.ERROR_USED:
        case STATES.ERROR_USED_CONFIRMATION:
            statusHtml = `<span class="status-text status-error">Used cassette</span>
                          <span class="status-text status-error" style="font-size:var(--font-xs)">Insert new cassette</span>`;
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
                          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`;
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
                              <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Start T2</span>`;
                statusClass = ' is-dual';
            } else if (testNum === 2 && !isPos) {
                statusHtml = `<span class="status-text status-success">T2 negative</span>
                              <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Start T3</span>`;
                statusClass = ' is-dual';
            }
            break;
        }

        case STATES.READY_FOR_TEST_N: {
            const nextTest = ch.currentTestNumber + 1;
            statusHtml = `${renderConfirmationHistory(ch)}
                          <span class="status-text">Insert new cassette</span>
                          <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Start T${nextTest}</span>`;
            statusClass = ' is-history';
            break;
        }

        case STATES.COMPLETE: {
            const isCtrl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';
            if (isCtrl) {
                const controlLabel = ch.scenario === 'pos_control' ? 'Positive Control' : 'Animal Control';
                statusHtml = `<span class="status-text" style="color:var(--gray-500)">${controlLabel}</span>`;
                statusClass = ' is-single';
            } else if (ch.groupResult) {
                statusHtml = `<span class="status-text" style="color:var(--gray-500)">Test flow</span>`;
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
                          <span class="status-text status-error" style="font-size:var(--font-xs)">Expected ${expected} &mdash; insert correct type and retry</span>`;
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
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('status-bar-time');
    if (el) el.textContent = timeStr;

    const tempEl = document.getElementById('status-bar-temp-value');
    if (tempEl) tempEl.innerHTML = formatStatusBarTemperatureLabel();

    const internetEl = document.getElementById('status-bar-internet-status');
    if (internetEl) internetEl.textContent = 'Offline';
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
    const recentTestType = getRecentTestTypes()[0] || getDefaultManualTestType();
    const defaultManualTestType = qrPrefillType || getTestTypeById(ch.testTypeId) || recentTestType;
    const defaultBrandFilter = defaultManualTestType?.brand || 'MilkSafe';
    const defaultCurve = defaultManualTestType?.quantitative
        ? getDefaultCurveForTestType(defaultManualTestType.id, ch.curveId)
        : null;

    return {
        scenario: ch.scenario || 'test',
        testTypeId: defaultManualTestType?.id || getDefaultManualTestType()?.id || null,
        sampleId: ch.sampleId || '',
        operatorId: ch.operatorId || '',
        fallbackCassetteType,
        lockedToQr: Boolean(qrPrefillType),
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
        sampleId: modal.querySelector('#cfg-sample-id')?.value || '',
        operatorId: modal.querySelector('#cfg-operator')?.value || '',
        fallbackCassetteType: ch.loadedCassetteType || ch.cassetteType || previousDraft.fallbackCassetteType || CASSETTE_TYPES[0],
        lockedToQr: previousDraft.lockedToQr,
        brandFilter: previousDraft.brandFilter || 'MilkSafe',
        categoryFilter: previousDraft.categoryFilter || 'all',
        measurementFilter: previousDraft.measurementFilter || 'all',
        curveId: previousDraft.curveId || null,
        curveLoadSource: previousDraft.curveLoadSource || 'qr',
        curveLoadError: previousDraft.curveLoadError || ''
    };
}

function getDraftSelection(draft, qrLocked) {
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
        day: 'numeric'
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

    const filteredTypes = TEST_TYPES.filter(testType => {
        if (brandFilter && testType.brand !== brandFilter) return false;
        if (categoryFilter !== 'all' && testType.category.toLowerCase() !== categoryFilter) return false;
        if (measurementFilter === 'quant' && !testType.quantitative) return false;
        if (measurementFilter === 'qual' && testType.quantitative) return false;
        return true;
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
    const subtitle = ch.cassettePresent
        ? 'Cassette inserted'
        : 'Manual mode';

    modal.className = `modal config-modal${view === 'type_picker' ? ' type-picker-mode active' : ' active'}`;

    if (view === 'type_picker') {
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
                    ${qrLocked
                        ? `
                            <div class="type-picker-trigger type-picker-trigger-inline is-locked">
                                <span class="type-picker-trigger-main">${escapeHtml(selectedType?.name || 'Select test type')}</span>
                                <span class="type-picker-trigger-icon type-picker-trigger-icon-qr" aria-hidden="true"></span>
                            </div>`
                        : `
                            <button class="type-picker-trigger type-picker-trigger-inline" id="cfg-type-picker">
                                <span class="type-picker-trigger-main">${escapeHtml(selectedType?.name || 'Select test type')}</span>
                                <span class="type-picker-trigger-action">Choose</span>
                            </button>`
                    }
                </div>
                <div class="form-field">
                    <label>Sample ID</label>
                    <input type="text" class="form-input" id="cfg-sample-id" placeholder="Type or scan sample ID" value="${escapeHtml(nextDraft.sampleId)}">
                    <div class="recent-chips" id="cfg-sample-id-chips">
                        ${RECENT_SAMPLE_IDS.slice(0, 2).map(sampleId => `<span class="recent-chip" data-target="cfg-sample-id" data-value="${sampleId}">${sampleId}</span>`).join('')}
                    </div>
                </div>
                <div class="form-field">
                    <label>Operator ID</label>
                    <input type="text" class="form-input" id="cfg-operator" placeholder="Type or scan operator ID" value="${escapeHtml(nextDraft.operatorId)}">
                    <div class="recent-chips" id="cfg-operator-chips">
                        ${RECENT_OPERATORS.slice(0, 2).map(o => `<span class="recent-chip" data-target="cfg-operator" data-value="${o}">${o}</span>`).join('')}
                    </div>
                </div>
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
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="cfg-cancel">Cancel</button>
            <button class="modal-btn btn-primary" id="cfg-read-only">Read</button>
            ${isIncubationEnabled() ? `<button class="modal-btn btn-primary" id="cfg-read-incubate">Read + Incubate</button>` : ''}
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
    if (typePickerBtn && !qrLocked) {
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
    document.getElementById('cfg-read-only').disabled = !validation.ok || !hasRequiredCurve;
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
        minute: '2-digit'
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

function renderHistoryResultBadge(result, size = 'md') {
    const tone = getHistoryResultTone(result);
    return `<span class="history-result-badge is-${tone}${size === 'lg' ? ' is-large' : ''}">${escapeHtml(formatHistoryResultLabel(result))}</span>`;
}

function renderHistoryUploadBadge(uploadStatus) {
    const tone = uploadStatus === 'synced' ? 'synced' : 'pending';
    return `<span class="history-sync-badge is-${tone}">${escapeHtml(formatUploadStatusLabel(uploadStatus))}</span>`;
}

function renderHistorySequenceChips(flow) {
    return flow.tests.map(test => {
        const tone = getHistoryResultTone(test.overall);
        const label = test.overall === 'positive' ? 'POS' : 'NEG';
        return `<span class="history-sequence-chip is-${tone}">${getHistoryAnnotationShortLabel(test.annotation)} ${label}</span>`;
    }).join('');
}

function renderHistoryField(label, value) {
    return `<div class="history-field">
        <span class="history-field-label">${escapeHtml(label)}</span>
        <span class="history-field-value">${escapeHtml(value)}</span>
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
                <span>Prototype curve</span>
            </div>
            <svg class="history-curve-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Light intensity curve">
                <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" class="history-curve-axis"></line>
                <line x1="${paddingX}" y1="${height / 2}" x2="${width - paddingX}" y2="${height / 2}" class="history-curve-grid"></line>
                <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" class="history-curve-grid"></line>
                <polyline class="history-curve-line" points="${polyline}"></polyline>
            </svg>
        </div>`;
}

function renderHistoryListView(flows, page, totalPages) {
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
                <div class="history-placeholder-panel history-placeholder-panel-simple">
                    <strong>No history yet</strong>
                    <p>Run a test or clear a completed flow to add it here.</p>
                </div>
            </div>`;
    }

    const start = page * HISTORY_PAGE_SIZE;
    const pageFlows = flows.slice(start, start + HISTORY_PAGE_SIZE);

    return `
        <div class="history-screen-header">
            <div>
                <h1>History</h1>
                <p>Latest test flows first. Tap a flow to open its tests.</p>
            </div>
            <button class="history-close-btn" data-history-action="close">Close</button>
        </div>
        <div class="history-screen-body history-list-body">
            <div class="history-flow-list">
                ${pageFlows.map(flow => `
                    <button class="history-flow-row" data-history-action="open-flow" data-history-key="${flow.historyKey}">
                        <div class="history-flow-row-top">
                            <div class="history-flow-main">
                                <div class="history-flow-title">${escapeHtml(flow.testTypeName || flow.scenarioLabel)}</div>
                                <div class="history-flow-meta">${escapeHtml(formatHistoryDateTime(flow.timestamp))}${flow.sampleId ? ` &middot; ${escapeHtml(flow.sampleId)}` : ''}</div>
                            </div>
                            <div class="history-flow-side">
                                ${renderHistoryResultBadge(flow.result)}
                                ${renderHistoryUploadBadge(flow.uploadStatus)}
                            </div>
                        </div>
                        <div class="history-flow-row-bottom">
                            <div class="history-sequence-row">${renderHistorySequenceChips(flow)}</div>
                            <span class="history-flow-open">Open</span>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="history-screen-footer">
            <button class="history-page-btn" data-history-action="prev-page"${page === 0 ? ' disabled' : ''}>Previous</button>
            <span class="history-page-indicator">Page ${page + 1} / ${totalPages}</span>
            <button class="history-page-btn" data-history-action="next-page"${page >= totalPages - 1 ? ' disabled' : ''}>Next</button>
        </div>`;
}

function renderHistoryFlowView(flow) {
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
            <section class="history-summary-card">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">${escapeHtml(flow.scenarioLabel)}</span>
                        <h2>${escapeHtml(flow.testTypeName || 'Test')}</h2>
                    </div>
                    ${renderHistoryResultBadge(flow.result, 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Sample ID', flow.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', flow.operatorId || 'Not set')}
                    ${flow.userName ? renderHistoryField('User', flow.userName) : ''}
                    ${renderHistoryField('Upload Status', formatUploadStatusLabel(flow.uploadStatus))}
                    ${flow.flowId ? renderHistoryField('Flow ID', String(flow.flowId)) : ''}
                </div>
            </section>
            <section class="history-section-card">
                <div class="history-section-header">
                    <h2>Contained Tests</h2>
                    <span>${flow.testCount} test${flow.testCount === 1 ? '' : 's'}</span>
                </div>
                <div class="history-test-list">
                    ${flow.tests.map(test => `
                        <button class="history-test-row" data-history-action="open-test" data-history-key="${flow.historyKey}" data-history-test="${test.testNumber}">
                            <div class="history-test-main">
                                <div class="history-test-title">Test ${test.testNumber}</div>
                                <div class="history-test-meta">${escapeHtml(getHistoryAnnotationLabel(test.annotation))} &middot; ${escapeHtml(formatHistoryDateTime(test.timestamp))}</div>
                            </div>
                            <div class="history-test-side">
                                ${renderHistoryResultBadge(test.overall)}
                            </div>
                        </button>
                    `).join('')}
                </div>
            </section>
        </div>`;
}

function renderHistoryTestView(flow, test) {
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
            <section class="history-summary-card">
                <div class="history-summary-top">
                    <div>
                        <span class="history-summary-kicker">Test ${test.testNumber}</span>
                        <h2>${escapeHtml(flow.testTypeName || test.testTypeName || 'Test')}</h2>
                    </div>
                    ${renderHistoryResultBadge(test.overall, 'lg')}
                </div>
                <div class="history-summary-grid">
                    ${renderHistoryField('Test Type', flow.testTypeName || test.testTypeName || 'Not set')}
                    ${renderHistoryField('Date & Time', formatHistoryDateTime(test.timestamp, true))}
                    ${flow.userName ? renderHistoryField('User', flow.userName) : ''}
                    ${renderHistoryField('Sample ID', flow.sampleId || 'Not set')}
                    ${renderHistoryField('Operator ID', flow.operatorId || 'Not set')}
                    ${renderHistoryField('Upload Status', formatUploadStatusLabel(flow.uploadStatus))}
                    ${renderHistoryField('Annotation', getHistoryAnnotationLabel(test.annotation))}
                    ${flow.flowId ? renderHistoryField('Flow ID', String(flow.flowId)) : ''}
                </div>
            </section>
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

    const flows = getHistoryFlows();
    const totalPages = Math.max(Math.ceil(flows.length / HISTORY_PAGE_SIZE), 1);
    const currentState = activeModal && activeModal.type === 'history' ? activeModal : {};
    const historyState = {
        type: 'history',
        view: nextState.view || currentState.view || 'list',
        page: clampHistoryPage(nextState.page ?? currentState.page ?? 0, totalPages),
        flowKey: nextState.flowKey ?? currentState.flowKey ?? null,
        testNumber: nextState.testNumber ?? currentState.testNumber ?? null
    };

    let content = '';

    if (historyState.view === 'flow') {
        const flow = findHistoryFlowByKey(historyState.flowKey);
        if (!flow) {
            historyState.view = 'list';
            content = renderHistoryListView(flows, historyState.page, totalPages);
        } else {
            content = renderHistoryFlowView(flow);
        }
    } else if (historyState.view === 'test') {
        const flow = findHistoryFlowByKey(historyState.flowKey);
        const test = flow?.tests.find(item => String(item.testNumber) === String(historyState.testNumber));
        if (!flow || !test) {
            historyState.view = flow ? 'flow' : 'list';
            content = flow ? renderHistoryFlowView(flow) : renderHistoryListView(flows, historyState.page, totalPages);
        } else {
            content = renderHistoryTestView(flow, test);
        }
    } else {
        historyState.view = 'list';
        content = renderHistoryListView(flows, historyState.page, totalPages);
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
                            page: historyState.page,
                            flowKey: historyState.flowKey
                        });
                    } else if (historyState.view === 'flow') {
                        showHistoryScreen({
                            view: 'list',
                            page: historyState.page
                        });
                    } else {
                        handleHistoryClose();
                    }
                    break;
                case 'prev-page':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page - 1
                    });
                    break;
                case 'next-page':
                    showHistoryScreen({
                        view: 'list',
                        page: historyState.page + 1
                    });
                    break;
                case 'open-flow':
                    showHistoryScreen({
                        view: 'flow',
                        page: historyState.page,
                        flowKey: button.dataset.historyKey
                    });
                    break;
                case 'open-test':
                    showHistoryScreen({
                        view: 'test',
                        page: historyState.page,
                        flowKey: button.dataset.historyKey,
                        testNumber: button.dataset.historyTest
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

function showSettingsScreen() {
    const screen = document.getElementById('settings-screen');
    if (!screen) return;

    activeModal = { type: 'settings' };

    function segmentedControl(id, value, options) {
        const widthClass = options.length > 2 ? ' settings-toggle-wide' : '';
        return `
            <div class="segmented-control settings-toggle${widthClass}" id="${id}">
                ${options.map(option => `
                    <button class="seg-option${String(option.value) === String(value) ? ' selected' : ''}" data-value="${option.value}">${option.label}</button>
                `).join('')}
            </div>`;
    }

    function section(title, rows, note = '') {
        return `
            <section class="settings-section">
                <div class="settings-section-header">
                    <h2>${title}</h2>
                    ${note ? `<p>${note}</p>` : ''}
                </div>
                <div class="settings-section-body">${rows}</div>
            </section>`;
    }

    function liveRow({ title, detail, id, value, options }) {
        return `
            <div class="settings-item">
                <div class="settings-item-copy">
                    <h3>${title}</h3>
                    ${detail ? `<p>${detail}</p>` : ''}
                </div>
                ${segmentedControl(id, value, options)}
            </div>`;
    }

    function mockRow({ title, detail = '', value = '', badge = 'Not Implemented', buttonId = '', buttonLabel = '' }) {
        return `
            <div class="settings-item settings-item-mock">
                <div class="settings-item-copy">
                    <h3>${title}</h3>
                    ${detail ? `<p>${detail}</p>` : ''}
                </div>
                <div class="settings-item-meta">
                    ${value ? `<span class="settings-inline-value">${value}</span>` : ''}
                    ${buttonId ? `<button class="settings-row-btn" id="${buttonId}">${buttonLabel}</button>` : ''}
                    ${badge ? `<span class="settings-prototype-badge">${badge}</span>` : ''}
                </div>
            </div>`;
    }

    screen.innerHTML = `
        <div class="settings-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>Settings</h1>
                <p>Reader Controls are live. All other rows are wireframe-only.</p>
            </div>
            <button class="history-close-btn" id="settings-screen-close">Close</button>
        </div>`;

    const body = document.createElement('div');
    body.className = 'settings-screen-body';
    body.innerHTML = `
        ${section('Reader Controls', [
            liveRow({
                title: 'Temperature',
                detail: 'Off disables incubation. 40 C and 50 C turn it on.',
                id: 'set-temperature',
                value: normalizeDeviceTemperature(deviceSettings.deviceTemperature),
                options: [
                    { value: 'off', label: 'Off' },
                    { value: 40, label: '40 C' },
                    { value: 50, label: '50 C' }
                ]
            }),
            liveRow({
                title: 'QR Scanning',
                detail: 'Cassette QR loads the test type automatically.',
                id: 'set-qr',
                value: deviceSettings.qrScanningEnabled ? 'on' : 'off',
                options: [
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' }
                ]
            }),
            liveRow({
                title: 'Micro Switch',
                detail: 'Uses cassette insertion detection instead of manual start.',
                id: 'set-microswitch',
                value: deviceSettings.microswitchEnabled ? 'on' : 'off',
                options: [
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' }
                ]
            })
        ].join(''), 'These rows affect the prototype immediately.')}
        ${section('Verification', [
            mockRow({
                title: 'Run Verification',
                detail: 'Run a verification test with a verification cassette.',
                buttonId: 'settings-open-verification',
                buttonLabel: 'Open',
                badge: ''
            }),
            mockRow({
                title: 'Verification Threshold',
                detail: 'Tests since last verification warning.',
                value: '250 Tests'
            }),
            mockRow({
                title: 'Verification History',
                detail: 'Local history and cloud upload placement.',
                value: 'Not Implemented'
            })
        ].join(''))}
        ${section('Test Setup', [
            mockRow({
                title: 'Test Types',
                detail: 'Cloud-managed for signed-in users, manual enablement for anonymous.'
            }),
            mockRow({
                title: 'Load Quant Curve',
                detail: 'Load a batch calibration curve before starting a quantitative test.',
                buttonId: 'settings-open-curve-loader',
                buttonLabel: 'Open',
                badge: ''
            })
        ].join(''))}
        ${section('Connectivity', [
            mockRow({
                title: 'Connect to Internet',
                detail: 'Wi-Fi and Ethernet setup live here in the final product.'
            }),
            mockRow({
                title: 'Printer Setup',
                detail: 'Enable or disable printing and select the printer.'
            }),
            mockRow({
                title: 'LIMS',
                detail: 'Enable LIMS export behavior.'
            }),
            mockRow({
                title: 'MilkSafe Cloud',
                detail: 'Sign in, account state, and logout.'
            })
        ].join(''))}
        ${section('Device', [
            mockRow({
                title: 'Language',
                detail: 'Default language and translations.',
                value: 'English'
            }),
            mockRow({
                title: 'Date and Time',
                detail: 'Date, time, and timezone for uploads.',
                value: 'UTC'
            }),
            mockRow({
                title: 'Sound',
                detail: 'Reader sound on or off.'
            }),
            mockRow({
                title: 'Software Update',
                detail: 'USB update and internet update.'
            }),
            mockRow({
                title: 'Factory Reset',
                detail: 'Password-protected in the final product.'
            }),
            mockRow({
                title: 'About',
                detail: 'Reader and firmware details.'
            })
        ].join(''))}`;

    screen.appendChild(body);

    screen.classList.add('active');

    screen.querySelectorAll('.settings-toggle').forEach(sc => {
        sc.querySelectorAll('.seg-option').forEach(opt => {
            opt.addEventListener('click', () => {
                sc.querySelectorAll('.seg-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');

                const nextSettings = {
                    deviceTemperature: screen.querySelector('#set-temperature .seg-option.selected')?.dataset.value || 'off',
                    microswitchEnabled: screen.querySelector('#set-microswitch .seg-option.selected')?.dataset.value === 'on',
                    qrScanningEnabled: screen.querySelector('#set-qr .seg-option.selected')?.dataset.value === 'on'
                };

                handleSettingsApply(nextSettings);
            });
        });
    });

    document.getElementById('settings-screen-close').addEventListener('click', () => {
        handleSettingsCancel();
    });

    const openVerificationBtn = document.getElementById('settings-open-verification');
    if (openVerificationBtn) {
        openVerificationBtn.addEventListener('click', () => {
            hideSettingsScreen();
            showVerificationScreen();
        });
    }

    const openCurveLoaderBtn = document.getElementById('settings-open-curve-loader');
    if (openCurveLoaderBtn) {
        openCurveLoaderBtn.addEventListener('click', () => {
            hideSettingsScreen();
            showSettingsCurveScreen();
        });
    }
}

function hideSettingsScreen() {
    const screen = document.getElementById('settings-screen');
    if (!screen) return;

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
                <p>Verification is not implemented in this prototype.</p>
            </div>
            <button class="history-close-btn" id="verification-screen-close">Back</button>
        </div>
        <div class="verification-screen-body">
            <div class="history-placeholder-panel history-placeholder-panel-simple">
                <strong>Verification not implemented</strong>
                <p>This screen is only here to reserve the separate verification flow in the prototype.</p>
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

    let resultLabel, resultValue, messageHtml;

    if (variant === 'a') {
        // After T1 positive
        resultLabel = 'Test 1';
        resultValue = 'POSITIVE';
        messageHtml = `<p>Confirmation required. Insert a new ${ch.testTypeName || ch.cassetteType} test, then start Test 2.</p>
                       <p style="font-size:var(--font-sm);color:var(--gray-500);margin-top:4px">Abort &rarr; flow result Inconclusive</p>`;
    } else {
        // After T2 negative (variant b)
        resultLabel = 'Test 2';
        resultValue = 'NEGATIVE';
        messageHtml = `<p>Tiebreaker needed. T1 positive, T2 negative &mdash; insert a new ${ch.testTypeName || ch.cassetteType} test, then start Test 3.</p>
                       <p style="font-size:var(--font-sm);color:var(--gray-500);margin-top:4px">Abort &rarr; flow result Inconclusive</p>`;
    }

    const substancesHtml = lastResult.substances.map(s => {
        const resClass = s.result === 'positive' ? 'sub-result-positive' : 'sub-result-negative';
        return `<div class="substance-result-row">
            <span class="sub-name">${s.name}</span>
            <span class="sub-value">${escapeHtml(s.displayValue || '')}</span>
            <span class="sub-result ${resClass}">${s.result.toUpperCase()}</span>
        </div>`;
    }).join('');

    const titleColor = isPos ? 'var(--danger)' : 'var(--success)';

    modal.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-row">
                <div class="modal-channel-badge">${ch.id}</div>
                <div class="header-text">
                    <h2 style="color:${titleColor}">${resultLabel}: ${resultValue}</h2>
                    <div class="modal-meta">
                        <span class="meta-item"><span class="meta-value">${ch.testTypeName || ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.sampleId || 'No sample ID'}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.operatorId || ''}</span></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-body">
            <div class="substance-results">${substancesHtml}</div>
            <div class="decision-message">${messageHtml}</div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="decision-abort">Abort &mdash; Inconclusive</button>
            <button class="modal-btn btn-primary" id="decision-continue">Continue Testing &rarr;</button>
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
        const overall = isTestPositive(tr.substances) ? 'POSITIVE' : 'NEGATIVE';
        const cls = overall === 'POSITIVE' ? 'sub-result-positive' : 'sub-result-negative';
        return `<span class="${cls}" style="margin-right:8px">Test ${tr.testNumber}: ${overall}</span>`;
    }).join('');

    modal.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-row">
                <div class="modal-channel-badge">${ch.id}</div>
                <div class="header-text">
                    <h2 style="color:var(--warning)">Abort Flow?</h2>
                    <div class="modal-meta">
                        <span class="meta-item"><span class="meta-value">${ch.testTypeName || ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.sampleId || 'No sample ID'}</span></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-body">
            <div class="decision-message">
                <p>Flow result will be marked <strong>INCONCLUSIVE</strong>.</p>
                ${completedTests > 0 ? `<div class="prev-results">Completed: ${testsHtml}</div>` : ''}
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="stop-cancel">Go Back</button>
            <button class="modal-btn btn-secondary" id="stop-confirm">Abort &mdash; Inconclusive</button>
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
    const singleTest = totalTests <= 1;
    modal.classList.toggle('single-test', singleTest);

    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';
    const scenarioLabels = {
        'test': 'Standard Test',
        'pos_control': 'Positive Control',
        'animal_control': 'Animal Control'
    };

    // Group result display
    let groupResultHtml = '';
    if (isControl) {
        const lastResult = ch.testResults[ch.testResults.length - 1];
        const isPos = isTestPositive(lastResult.substances);
        const label = isPos ? 'POSITIVE' : 'NEGATIVE';
        const color = isPos ? 'var(--danger)' : 'var(--success)';
        const bgColor = isPos ? 'var(--danger-bg)' : 'var(--success-bg)';
        groupResultHtml = `<div class="detail-group-result" style="background:${bgColor}">
            <div class="detail-result-label">Result</div>
            <div class="detail-result-value" style="color:${color}">${label}</div>
        </div>`;
    } else if (ch.groupResult) {
        const colors = {
            'negative': { bg: 'var(--success-bg)', fg: 'var(--success)' },
            'positive': { bg: 'var(--danger-bg)', fg: 'var(--danger)' },
            'inconclusive': { bg: 'var(--warning-bg)', fg: 'var(--warning)' }
        };
        const c = colors[ch.groupResult];
        groupResultHtml = `<div class="detail-group-result" style="background:${c.bg}">
            <div class="detail-result-label">Flow Result</div>
            <div class="detail-result-value" style="color:${c.fg}">${ch.groupResult.toUpperCase()}</div>
        </div>`;
    }

    // Test history
    const testsHtml = ch.testResults.map(tr => {
        const overall = isTestPositive(tr.substances) ? 'POSITIVE' : 'NEGATIVE';
        const overallClass = overall === 'POSITIVE' ? 'sub-result-positive' : 'sub-result-negative';
        const subsHtml = tr.substances.map(s =>
            `<div class="test-substance-row">
                <span class="ts-name">${s.name}</span>
                <span class="ts-value">${escapeHtml(s.displayValue || '')}</span>
                <span class="ts-result ${s.result}">${s.result.toUpperCase()}</span>
            </div>`
        ).join('');
        return `<div class="test-entry">
            <div class="test-entry-header">
                <span class="test-num">Test ${tr.testNumber}</span>
                <span class="test-overall ${overallClass}">${overall}</span>
            </div>
            <div class="test-substances">${subsHtml}</div>
        </div>`;
    }).join('');

    const processingLabels = {
        'read_only': 'Read Only',
        'read_incubate': 'Read + Incubate'
    };

    const historyTitle = singleTest
        ? 'Test Result'
        : `Test History (${totalTests} test${totalTests > 1 ? 's' : ''})`;

    modal.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-row">
                <div class="modal-channel-badge">${ch.id}</div>
                <div class="header-text">
                    <h2>${scenarioLabels[ch.scenario] || 'Test'} Details</h2>
                    <div class="modal-meta">
                        <span class="meta-item"><span class="meta-value">${ch.testTypeName || ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.sampleId || 'No sample ID'}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.operatorId}</span></span>
                        <span class="meta-item"><span class="meta-value">${processingLabels[ch.processing] || ch.processing}</span></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-body">
            ${groupResultHtml}
            <div class="test-history">
                <h4 class="test-history-title">${historyTitle}</h4>
                ${testsHtml}
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="detail-close-btn">Close</button>
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

    document.getElementById('detail-close-btn').addEventListener('click', () => handleCloseDetail());
}
