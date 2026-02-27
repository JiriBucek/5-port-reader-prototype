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

function renderCardHeader(ch) {
    let badges = '';

    if (ch.cassetteType) {
        badges += `<span class="badge badge-type">${ch.cassetteType}</span>`;
    }

    if (ch.scenario && ch.scenario !== 'test') {
        const scenarioLabels = {
            'pos_control': 'Pos Control',
            'animal_control': 'Animal Ctrl'
        };
        badges += `<span class="badge badge-scenario scenario-control">${scenarioLabels[ch.scenario]}</span>`;
    }

    if (ch.currentTestNumber > 1 && ch.state !== STATES.COMPLETE) {
        badges += `<span class="badge badge-test-num">T${ch.currentTestNumber}/3</span>`;
    }

    return `<div class="card-header">
        <span class="ch-label">CH ${ch.id}</span>
        ${badges ? `<div class="card-badges">${badges}</div>` : ''}
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

    const subs = SUBSTANCES[ch.cassetteType];
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

    let linesHtml = subs.map((sub, i) => {
        let resultClass = 'result-pending';
        if (ch.state === STATES.READING) {
            resultClass = 'result-reading';
        } else if (currentResults) {
            resultClass = currentResults[i].result === 'positive' ? 'result-positive' : 'result-negative';
        }
        return `<div class="substance-line">
            <span class="line-label">${SUBSTANCE_SHORT[sub]}</span>
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
        const lines = tr.substances.map(s =>
            `<div class="mini-line result-${s.result}"></div>`
        ).join('');
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

// ---- Card Status Area ----

function renderCardStatus(ch) {
    let statusHtml = '';

    switch (ch.state) {
        case STATES.EMPTY:
            if (deviceSettings.microswitchEnabled) {
                statusHtml = `<span class="status-text status-waiting">No cassette inserted</span>`;
            } else {
                statusHtml = `<span class="status-text status-waiting">Manual mode</span>
                              <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Tap Configure to start without detection</span>`;
            }
            break;

        case STATES.DETECTED:
            statusHtml = `<span class="status-text">Cassette detected</span>
                          <span class="status-text status-waiting" style="font-size:var(--font-xs);margin-top:2px">Tap Configure to start</span>`;
            break;

        case STATES.ERROR_USED:
        case STATES.ERROR_USED_CONFIRMATION:
            statusHtml = `<span class="status-text status-error">Used cassette detected</span>
                          <span class="status-text status-error" style="font-size:var(--font-xs)">Insert a new cassette and retry</span>`;
            break;

        case STATES.CONFIGURING:
            statusHtml = `<span class="status-text status-processing">Configuring test...</span>`;
            break;

        case STATES.WAITING_TEMP:
            statusHtml = `<span class="status-text status-processing">Reaching temperature</span>
                          <div class="spinner"></div>`;
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
            break;
        }

        case STATES.READING:
            statusHtml = `<div class="spinner"></div>
                          <span class="status-text status-processing">Reading cassette...</span>`;
            break;

        case STATES.RESULT: {
            const lastResult = ch.testResults[ch.testResults.length - 1];
            const isPos = isTestPositive(lastResult.substances);
            const testNum = lastResult.testNumber;
            if (testNum === 1 && isPos) {
                statusHtml = `<span class="status-text status-error">Test 1: Positive</span>
                              <span class="status-text" style="font-size:var(--font-xs);margin-top:2px;color:var(--gray-500)">Confirmation required</span>`;
            } else if (testNum === 2 && !isPos) {
                statusHtml = `<span class="status-text" style="color:var(--warning)">Test 2: Negative</span>
                              <span class="status-text" style="font-size:var(--font-xs);margin-top:2px;color:var(--gray-500)">Tiebreaker test needed</span>`;
            }
            break;
        }

        case STATES.READY_FOR_TEST_N: {
            const nextTest = ch.currentTestNumber + 1;
            statusHtml = `<span class="status-text">Ready for Test ${nextTest}</span>
                          <span class="status-text" style="font-size:var(--font-xs);margin-top:2px;color:var(--gray-500)">Insert cassette if needed, then tap Start</span>`;
            break;
        }

        case STATES.COMPLETE: {
            const isCtrl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';
            if (isCtrl) {
                const controlLabel = ch.scenario === 'pos_control' ? 'Positive Control' : 'Animal Control';
                statusHtml = `<span class="status-text" style="color:var(--gray-500)">${controlLabel}</span>`;
            } else if (ch.groupResult === 'inconclusive') {
                statusHtml = `<span class="status-text" style="color:var(--warning)">Flow result INCONCLUSIVE</span>`;
            } else if (ch.groupResult === 'positive') {
                statusHtml = `<span class="status-text status-error">Flow result POSITIVE</span>`;
            } else {
                statusHtml = `<span class="status-text" style="color:var(--success)">Flow result NEGATIVE</span>`;
            }
            break;
        }

        case STATES.ERROR:
            statusHtml = `<span class="status-text status-error">${ch.errorMessage || 'Test error'}</span>`;
            break;

        case STATES.ERROR_TYPE_MISMATCH: {
            const expected = ch.testResults.length > 0 ? ch.testResults[0].cassetteType : '?';
            statusHtml = `<span class="status-text status-error">Wrong cassette type</span>
                          <span class="status-text status-error" style="font-size:var(--font-xs)">Expected ${expected} &mdash; insert correct type and retry</span>`;
            break;
        }
    }

    return `<div class="card-status">${statusHtml}</div>`;
}

// ---- Card Group Result ----

function renderCardGroupResult(ch) {
    if (ch.state !== STATES.COMPLETE) return '';

    let badgeClass, label;
    const isControl = ch.scenario === 'pos_control' || ch.scenario === 'animal_control';

    if (isControl) {
        const lastResult = ch.testResults[ch.testResults.length - 1];
        const isPos = isTestPositive(lastResult.substances);
        label = isPos ? 'POSITIVE' : 'NEGATIVE';
        badgeClass = isPos ? 'group-badge-positive' : 'group-badge-negative';
        return `<div class="card-group-result">
            <span class="group-badge ${badgeClass}">${label}</span>
        </div>`;
    }

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
        default:
            return '';
    }

    return `<div class="card-group-result">
        <span class="group-badge ${badgeClass}">${label}</span>
    </div>`;
}

// ---- Card Action Button ----

function renderCardAction(ch) {
    const clearBtn = `<button class="action-btn btn-ghost" data-action="clear" data-ch="${ch.id}">Clear</button>`;

    switch (ch.state) {
        case STATES.EMPTY:
            if (!canConfigureChannel(ch)) return '';
            return `<div class="card-action">
                <button class="action-btn btn-primary" data-action="configure" data-ch="${ch.id}">Configure</button>
            </div>`;

        case STATES.DETECTED:
            return `<div class="card-action">
                <button class="action-btn btn-primary" data-action="configure" data-ch="${ch.id}">Configure</button>
                ${clearBtn}
            </div>`;

        case STATES.READY_FOR_TEST_N:
            return `<div class="card-action">
                <button class="action-btn btn-primary btn-full" data-action="start-test-n" data-ch="${ch.id}">Start Test ${ch.currentTestNumber + 1}</button>
                <button class="action-btn btn-secondary" data-action="stop" data-ch="${ch.id}">Abort Flow</button>
            </div>`;

        case STATES.COMPLETE:
            return `<div class="card-action">
                <button class="action-btn btn-secondary" data-action="view-details" data-ch="${ch.id}">View Details</button>
                ${clearBtn}
            </div>`;

        case STATES.ERROR:
            return `<div class="card-action">
                <button class="action-btn btn-primary btn-full" data-action="retry" data-ch="${ch.id}">Retry</button>
                <button class="action-btn btn-secondary" data-action="abort" data-ch="${ch.id}">Abort</button>
                ${clearBtn}
            </div>`;

        default:
            if (!canClearChannel(ch)) return '';
            return `<div class="card-action">${clearBtn}</div>`;
    }
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

    const modeText = deviceSettings.microswitchEnabled ? 'Micro Switch ON' : 'Micro Switch OFF';
    const modeEl = document.getElementById('status-bar-microswitch-mode');
    if (modeEl) modeEl.textContent = modeText;
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

    const subs = SUBSTANCES[ch.cassetteType];

    // Determine line states (mirror the card cassette logic)
    let currentResults = null;
    if (ch.testResults.length > 0 &&
        (ch.state === STATES.RESULT || ch.state === STATES.COMPLETE ||
         ch.state === STATES.AWAITING_CONFIRMATION)) {
        currentResults = ch.testResults[ch.testResults.length - 1].substances;
    }

    linesEl.innerHTML = subs.map((sub, i) => {
        let lineClass = 'cassette-line-mark';
        if (ch.state === STATES.READING) {
            lineClass += ' line-reading';
        } else if (currentResults) {
            lineClass += currentResults[i].result === 'positive' ? ' line-positive' : ' line-negative';
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

function showConfigModal(ch) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('config-modal');
    if (!overlay || !modal) return;

    activeModal = { type: 'config', channelId: ch.id };

    const scenarioOpts = [
        { value: 'test', label: 'Test' },
        { value: 'pos_control', label: 'Pos Control' },
        { value: 'animal_control', label: 'Animal Control' }
    ];

    const qrLocked = deviceSettings.qrScanningEnabled;
    const loadedType = ch.loadedCassetteType || ch.cassetteType || CASSETTE_TYPES[0];
    const selectedType = qrLocked ? loadedType : (ch.cassetteType || loadedType);
    const subtitle = ch.cassettePresent
        ? `${loadedType} loaded`
        : 'Manual mode: configure without cassette detection';

    modal.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-row">
                <div class="modal-channel-badge">${ch.id}</div>
                <div class="header-text">
                    <h2>Configure Test</h2>
                    <span class="modal-subtitle">${subtitle}</span>
                </div>
            </div>
        </div>
        <div class="modal-body">
            <div class="config-grid">
                <div class="form-field">
                    <label>Scenario</label>
                    <div class="segmented-control" id="cfg-scenario">
                        ${scenarioOpts.map(o =>
                            `<button class="seg-option${o.value === 'test' ? ' selected' : ''}" data-value="${o.value}">${o.label}</button>`
                        ).join('')}
                    </div>
                </div>
                <div class="form-field">
                    <label>Test Type</label>
                    <select class="form-select" id="cfg-type" ${qrLocked ? 'disabled' : ''}>
                        ${CASSETTE_TYPES.map(t =>
                            `<option value="${t}"${t === selectedType ? ' selected' : ''}>${t}</option>`
                        ).join('')}
                    </select>
                    ${qrLocked
                        ? `<div class="config-note">Loaded automatically from cassette QR</div>`
                        : `<div class="config-note">Select manually (QR scanning OFF)</div>`}
                </div>
                <div class="form-field">
                    <label>Route / Sample ID</label>
                    <input type="text" class="form-input" id="cfg-route" placeholder="Route or sample ID">
                    <div class="recent-chips" id="cfg-route-chips">
                        ${RECENT_ROUTES.slice(0, 2).map(r => `<span class="recent-chip" data-target="cfg-route" data-value="${r}">${r}</span>`).join('')}
                    </div>
                </div>
                <div class="form-field">
                    <label>Operator ID</label>
                    <input type="text" class="form-input" id="cfg-operator" placeholder="Operator ID">
                    <div class="recent-chips" id="cfg-operator-chips">
                        ${RECENT_OPERATORS.slice(0, 2).map(o => `<span class="recent-chip" data-target="cfg-operator" data-value="${o}">${o}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="cfg-cancel">Cancel</button>
            <button class="modal-btn btn-primary" id="cfg-read-only">Read</button>
            ${deviceSettings.incubationEnabled ? `<button class="modal-btn btn-primary" id="cfg-read-incubate">Read + Incubate</button>` : ''}
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

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

    // Cancel
    document.getElementById('cfg-cancel').addEventListener('click', () => {
        handleConfigCancel(ch.id);
    });

    // Start helpers
    function collectConfigAndStart(processing) {
        const scenario = modal.querySelector('#cfg-scenario .seg-option.selected')?.dataset.value || 'test';
        const testType = document.getElementById('cfg-type').value;
        const route = document.getElementById('cfg-route').value || 'Default Route';
        const operator = document.getElementById('cfg-operator').value || 'OP-000';

        handleConfigStart(ch.id, {
            scenario, testType, route, operatorId: operator, processing
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
}

function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    overlay.classList.remove('active');
    activeModal = null;
}

// ---- Settings Screen ----

function showSettingsScreen() {
    const screen = document.getElementById('settings-screen');
    if (!screen) return;

    activeModal = { type: 'settings' };

    function toggleControl(id, value, onLabel = 'On', offLabel = 'Off') {
        return `
            <div class="segmented-control settings-toggle" id="${id}">
                <button class="seg-option${value ? ' selected' : ''}" data-value="on">${onLabel}</button>
                <button class="seg-option${!value ? ' selected' : ''}" data-value="off">${offLabel}</button>
            </div>`;
    }

    screen.innerHTML = `
        <div class="settings-screen-header">
            <div class="settings-screen-title-wrap">
                <h1>Settings</h1>
                <p>Device behavior controls</p>
            </div>
        </div>
        <div class="settings-screen-body">
            <div class="settings-item">
                <div class="settings-item-copy">
                    <h3>Micro Switch</h3>
                    <p>ON uses cassette insertion detection. OFF enables full manual workflow.</p>
                </div>
                ${toggleControl('set-microswitch', deviceSettings.microswitchEnabled)}
            </div>
            <div class="settings-item">
                <div class="settings-item-copy">
                    <h3>QR Scanning</h3>
                    <p>ON locks test type to cassette QR. OFF allows manual test type selection.</p>
                </div>
                ${toggleControl('set-qr', deviceSettings.qrScanningEnabled)}
            </div>
            <div class="settings-item">
                <div class="settings-item-copy">
                    <h3>Incubation</h3>
                    <p>ON shows Read + Incubate. OFF uses Read only.</p>
                </div>
                ${toggleControl('set-incubation', deviceSettings.incubationEnabled)}
            </div>
        </div>
        <div class="settings-screen-footer">
            <button class="modal-btn btn-secondary" id="settings-screen-cancel">Cancel</button>
            <button class="modal-btn btn-primary" id="settings-screen-save">Save</button>
        </div>`;

    screen.classList.add('active');

    screen.querySelectorAll('.settings-toggle').forEach(sc => {
        sc.querySelectorAll('.seg-option').forEach(opt => {
            opt.addEventListener('click', () => {
                sc.querySelectorAll('.seg-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });
    });

    document.getElementById('settings-screen-cancel').addEventListener('click', () => {
        handleSettingsCancel();
    });

    document.getElementById('settings-screen-save').addEventListener('click', () => {
        const microswitchEnabled = screen.querySelector('#set-microswitch .seg-option.selected')?.dataset.value === 'on';
        const qrScanningEnabled = screen.querySelector('#set-qr .seg-option.selected')?.dataset.value === 'on';
        const incubationEnabled = screen.querySelector('#set-incubation .seg-option.selected')?.dataset.value === 'on';

        handleSettingsApply({
            microswitchEnabled,
            qrScanningEnabled,
            incubationEnabled
        });
    });
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
        messageHtml = `<p>Confirmation required. Insert a new ${ch.cassetteType} cassette, then start Test 2.</p>
                       <p style="font-size:var(--font-sm);color:var(--gray-500);margin-top:4px">Abort &rarr; flow result Inconclusive</p>`;
    } else {
        // After T2 negative (variant b)
        resultLabel = 'Test 2';
        resultValue = 'NEGATIVE';
        messageHtml = `<p>Tiebreaker needed. T1 positive, T2 negative &mdash; insert a new ${ch.cassetteType} cassette, then start Test 3.</p>
                       <p style="font-size:var(--font-sm);color:var(--gray-500);margin-top:4px">Abort &rarr; flow result Inconclusive</p>`;
    }

    const substancesHtml = lastResult.substances.map(s => {
        const resClass = s.result === 'positive' ? 'sub-result-positive' : 'sub-result-negative';
        return `<div class="substance-result-row">
            <span class="sub-name">${s.name}</span>
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
                        <span class="meta-item"><span class="meta-value">${ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.route || 'Test'}</span></span>
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
                        <span class="meta-item"><span class="meta-value">${ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.route || 'Test'}</span></span>
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
                        <span class="meta-item"><span class="meta-value">${ch.cassetteType}</span></span>
                        <span class="meta-item"><span class="meta-value">${ch.route}</span></span>
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
