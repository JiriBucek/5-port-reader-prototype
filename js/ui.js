/* ==========================================================================
   UI Rendering
   5-Port Milk Testing Device Prototype
   ========================================================================== */

// ---- Render All Cards ----

function renderAllCards() {
    channels.forEach(ch => renderCard(ch));
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

    if (ch.scenario) {
        const scenarioLabels = {
            'test': 'Test',
            'pos_control': 'Pos Control',
            'animal_control': 'Animal Ctrl'
        };
        const isControl = ch.scenario !== 'test';
        badges += `<span class="badge badge-scenario${isControl ? ' scenario-control' : ''}">${scenarioLabels[ch.scenario]}</span>`;
    }

    if (ch.currentTestNumber > 1 && ch.state !== STATES.COMPLETE) {
        badges += `<span class="badge badge-test-num">T${ch.currentTestNumber}/3</span>`;
    }

    return `<div class="card-header">
        <span class="ch-label">CH ${ch.id}</span>
        ${badges}
    </div>`;
}

// ---- Card Cassette Area ----

function renderCardCassette(ch) {
    let content = '';

    const showEmpty = !ch.cassettePresent ||
                      ch.state === STATES.EMPTY ||
                      ch.state === STATES.WAITING_FOR_SWAP ||
                      ch.state === STATES.INCUBATION_ALERT ||
                      ch.state === STATES.ERROR;

    if (showEmpty && ch.state === STATES.EMPTY) {
        content = `<div class="cassette-empty">&#9649;</div>`;
    } else if (showEmpty) {
        // Empty slot but with context (waiting for swap, alert, error)
        content = `<div class="cassette-empty">&#9649;</div>`;
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
        STATES.WAITING_FOR_SWAP, STATES.READY_FOR_TEST_N,
        STATES.ERROR_TYPE_MISMATCH, STATES.ERROR_USED_CONFIRMATION,
        STATES.WAITING_TEMP, STATES.INCUBATING, STATES.READING,
        STATES.INCUBATION_ALERT, STATES.ERROR
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
            statusHtml = `<span class="status-text status-waiting">No cassette</span>`;
            break;

        case STATES.DETECTED:
            statusHtml = `<span class="status-text">Cassette detected</span>`;
            break;

        case STATES.ERROR_USED:
        case STATES.ERROR_USED_CONFIRMATION:
            statusHtml = `<span class="status-text status-error">Already used &mdash; remove cassette</span>`;
            break;

        case STATES.CONFIGURING:
            statusHtml = `<span class="status-text status-processing">Configuring...</span>`;
            break;

        case STATES.WAITING_TEMP:
            statusHtml = `<span class="status-text status-processing">Waiting for temperature...</span>
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

        case STATES.INCUBATION_ALERT:
            statusHtml = `<span class="status-text status-alert">Reinsert cassette!</span>
                          <span class="countdown-text countdown-alert">${ch.alertRemaining}s</span>
                          <div class="progress-bar"><div class="progress-fill progress-alert" style="width:${ch.alertRemaining / TIMING.ALERT_TIMEOUT * 100}%"></div></div>`;
            break;

        case STATES.READING:
            statusHtml = `<div class="spinner"></div>
                          <span class="status-text status-processing">Reading...</span>`;
            break;

        case STATES.RESULT: {
            const lastResult = ch.testResults[ch.testResults.length - 1];
            const isPos = isTestPositive(lastResult.substances);
            const testNum = lastResult.testNumber;
            if (testNum === 1 && isPos) {
                statusHtml = `<span class="status-text status-error">Test 1: Positive &mdash; Confirmation needed</span>`;
            } else if (testNum === 2 && !isPos) {
                statusHtml = `<span class="status-text" style="color:var(--warning)">Test 2: Negative &mdash; Tiebreaker needed</span>`;
            }
            break;
        }

        case STATES.AWAITING_CONFIRMATION: {
            const nextTest = ch.currentTestNumber + 1;
            statusHtml = `<span class="status-text status-waiting">Remove cassette, insert new for Test ${nextTest}</span>`;
            break;
        }

        case STATES.WAITING_FOR_SWAP: {
            const nextTest = ch.currentTestNumber + 1;
            statusHtml = `<span class="status-text status-waiting">Waiting for new cassette...</span>`;
            break;
        }

        case STATES.READY_FOR_TEST_N:
            statusHtml = `<span class="status-text">Ready for Test ${ch.currentTestNumber + 1}</span>`;
            break;

        case STATES.COMPLETE:
            if (ch.groupResult === 'inconclusive') {
                statusHtml = `<span class="status-text" style="color:var(--warning)">Test stopped</span>`;
            } else {
                statusHtml = `<span class="status-text">Test complete</span>`;
            }
            break;

        case STATES.ERROR:
            statusHtml = `<span class="status-text status-error">${ch.errorMessage || 'Test error'}</span>`;
            break;

        case STATES.ERROR_TYPE_MISMATCH: {
            const expected = ch.testResults.length > 0 ? ch.testResults[0].cassetteType : '?';
            statusHtml = `<span class="status-text status-error">Wrong type &mdash; expected ${expected}</span>`;
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
        const controlLabel = ch.scenario === 'pos_control' ? 'Positive Control' : 'Animal Control';
        return `<div class="card-group-result">
            <span class="group-badge group-badge-control">${controlLabel}</span>
            <div class="control-label">${label}</div>
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
    switch (ch.state) {
        case STATES.DETECTED:
            return `<div class="card-action">
                <button class="action-btn btn-primary" data-action="configure" data-ch="${ch.id}">Configure</button>
            </div>`;

        case STATES.WAITING_FOR_SWAP:
            return `<div class="card-action">
                <button class="action-btn btn-secondary" data-action="stop" data-ch="${ch.id}">Stop</button>
            </div>`;

        case STATES.READY_FOR_TEST_N:
            return `<div class="card-action">
                <button class="action-btn btn-primary" data-action="start-test-n" data-ch="${ch.id}">Start Test ${ch.currentTestNumber + 1}</button>
            </div>`;

        case STATES.COMPLETE:
            return `<div class="card-action">
                <button class="action-btn btn-secondary" data-action="view-details" data-ch="${ch.id}">View Details</button>
            </div>`;

        case STATES.ERROR:
            return `<div class="card-action">
                <button class="action-btn btn-primary" data-action="retry" data-ch="${ch.id}">Retry</button>
                <button class="action-btn btn-danger" data-action="abort" data-ch="${ch.id}">Abort</button>
            </div>`;

        default:
            return '';
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
        const stateLabel = panel.querySelector('.sim-state');

        if (posBtn) posBtn.disabled = !insertable;
        if (negBtn) negBtn.disabled = !insertable;
        if (removeBtn) removeBtn.disabled = !removable;
        if (stateLabel) stateLabel.textContent = ch.state.replace(/_/g, ' ');
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

    const processingOpts = [
        { value: 'read_incubate', label: 'Read + Incubate' },
        { value: 'read_only', label: 'Read Only' }
    ];

    modal.innerHTML = `
        <div class="modal-header">
            <h2>Configure Test</h2>
            <span class="config-channel-display">Channel ${ch.id}</span>
        </div>
        <div class="modal-body">
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
                <select class="form-select" id="cfg-type">
                    ${CASSETTE_TYPES.map(t =>
                        `<option value="${t}"${t === ch.cassetteType ? ' selected' : ''}>${t}</option>`
                    ).join('')}
                </select>
                ${ch.cassetteType ? `<div style="font-size:11px;color:var(--gray-400);margin-top:4px">Auto-filled from QR scan</div>` : ''}
            </div>
            <div class="form-field">
                <label>Route</label>
                <input type="text" class="form-input" id="cfg-route" placeholder="Enter route...">
                <div class="recent-chips" id="cfg-route-chips">
                    ${RECENT_ROUTES.map(r => `<span class="recent-chip" data-target="cfg-route" data-value="${r}">${r}</span>`).join('')}
                </div>
            </div>
            <div class="form-field">
                <label>Operator ID</label>
                <input type="text" class="form-input" id="cfg-operator" placeholder="Enter operator ID...">
                <div class="recent-chips" id="cfg-operator-chips">
                    ${RECENT_OPERATORS.map(o => `<span class="recent-chip" data-target="cfg-operator" data-value="${o}">${o}</span>`).join('')}
                </div>
            </div>
            <div class="form-field">
                <label>Processing</label>
                <div class="segmented-control" id="cfg-processing">
                    ${processingOpts.map(o =>
                        `<button class="seg-option${o.value === 'read_incubate' ? ' selected' : ''}" data-value="${o.value}">${o.label}</button>`
                    ).join('')}
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="cfg-cancel">Cancel</button>
            <button class="modal-btn btn-primary" id="cfg-start">Start Test &rarr;</button>
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

    // Start
    document.getElementById('cfg-start').addEventListener('click', () => {
        const scenario = modal.querySelector('#cfg-scenario .seg-option.selected')?.dataset.value || 'test';
        const testType = document.getElementById('cfg-type').value;
        const route = document.getElementById('cfg-route').value || 'Default Route';
        const operator = document.getElementById('cfg-operator').value || 'OP-000';
        const processing = modal.querySelector('#cfg-processing .seg-option.selected')?.dataset.value || 'read_incubate';

        handleConfigStart(ch.id, {
            scenario, testType, route, operatorId: operator, processing
        });
    });
}

function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    overlay.classList.remove('active');
    activeModal = null;
}

// ---- Decision Modal ----

function showDecisionModal(ch, variant) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('decision-modal');
    if (!overlay || !modal) return;

    activeModal = { type: 'decision', channelId: ch.id, variant };

    const lastResult = ch.testResults[ch.testResults.length - 1];
    const isPos = isTestPositive(lastResult.substances);
    const testNum = lastResult.testNumber;

    let resultTitle, resultClass, messageHtml;

    if (variant === 'a') {
        // After T1 positive
        resultTitle = 'Test 1 Result: POSITIVE';
        resultClass = 'result-positive';
        messageHtml = `<p>Confirmation required.</p>
                       <p>Insert a new cassette to confirm this result (Test 2 of 3).</p>`;
    } else {
        // After T2 negative (variant b)
        resultTitle = 'Test 2 Result: NEGATIVE';
        resultClass = 'result-negative';
        messageHtml = `<p>Conflicts with Test 1 (Positive).</p>
                       <p>Tiebreaker Test 3 needed.</p>
                       <div class="prev-results">Previous: Test 1 &mdash; POSITIVE</div>`;
    }

    const substancesHtml = lastResult.substances.map(s => {
        const resClass = s.result === 'positive' ? 'sub-result-positive' : 'sub-result-negative';
        return `<div class="substance-result-row">
            <span class="sub-name">${s.name}</span>
            <span class="sub-result ${resClass}">${s.result.toUpperCase()}</span>
        </div>`;
    }).join('');

    modal.innerHTML = `
        <div class="modal-header">
            <span class="result-title ${resultClass}">${resultTitle}</span>
            <span class="modal-subtitle">Channel ${ch.id} &middot; ${ch.cassetteType} &middot; Test</span>
        </div>
        <div class="modal-body">
            <div class="substance-results">${substancesHtml}</div>
            <div class="decision-message">${messageHtml}</div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="decision-abort">Abort (Inconclusive)</button>
            <button class="modal-btn btn-success" id="decision-continue">Continue &rarr;</button>
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
            <span class="result-title" style="color:var(--warning)">Stop Confirmation?</span>
            <span class="modal-subtitle">Channel ${ch.id} &middot; ${ch.cassetteType} &middot; Test</span>
        </div>
        <div class="modal-body">
            <div class="decision-message">
                <p>Stopping now will end the confirmation flow.</p>
                <p>The group result will be marked as <strong>INCONCLUSIVE</strong>.</p>
                ${completedTests > 0 ? `<div class="prev-results" style="margin-top:8px">Completed: ${testsHtml}</div>` : ''}
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="stop-cancel">Cancel</button>
            <button class="modal-btn btn-warning" id="stop-confirm">Stop &mdash; Inconclusive</button>
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
            <div class="detail-result-label">${scenarioLabels[ch.scenario]}</div>
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
            <div class="detail-result-label">Group Result</div>
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

    modal.innerHTML = `
        <div class="modal-header">
            <div class="header-info">
                <h2>Test Details</h2>
                <span class="modal-subtitle">Channel ${ch.id} &middot; ${ch.cassetteType} &middot; ${scenarioLabels[ch.scenario] || 'Test'}</span>
            </div>
            <button class="close-btn" id="detail-close">&times;</button>
        </div>
        <div class="modal-body">
            ${groupResultHtml}
            <div class="test-history" style="margin-top:16px">
                <h4 style="font-size:var(--font-sm);font-weight:700;color:var(--gray-600);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Test History</h4>
                ${testsHtml}
            </div>
            <div class="config-summary">
                <h4>Configuration</h4>
                <div class="config-summary-grid">
                    <div class="config-summary-item"><span class="cs-label">Route: </span><span class="cs-value">${ch.route}</span></div>
                    <div class="config-summary-item"><span class="cs-label">Operator: </span><span class="cs-value">${ch.operatorId}</span></div>
                    <div class="config-summary-item"><span class="cs-label">Processing: </span><span class="cs-value">${processingLabels[ch.processing] || ch.processing}</span></div>
                    <div class="config-summary-item"><span class="cs-label">Type: </span><span class="cs-value">${ch.cassetteType}</span></div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="modal-btn btn-secondary" id="detail-close-btn">Close</button>
        </div>`;

    overlay.classList.add('active');
    modal.classList.add('active');

    document.getElementById('detail-close').addEventListener('click', () => handleCloseDetail());
    document.getElementById('detail-close-btn').addEventListener('click', () => handleCloseDetail());
}
