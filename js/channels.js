// Channel Management and Rendering

// Channel data - all start empty
const channelData = [
    { id: 1, status: 'empty' },
    { id: 2, status: 'empty' },
    { id: 3, status: 'empty' },
    { id: 4, status: 'empty' },
    { id: 5, status: 'empty' }
];

// Render all channel cards
function renderChannels() {
    const grid = document.getElementById('channels-grid');
    grid.innerHTML = '';

    channelData.forEach(channel => {
        const card = createChannelCard(channel);
        grid.appendChild(card);
    });

    // Show verification alert if needed
    const testCount = 248; // Simulated
    if (testCount > 250) {
        document.getElementById('verification-alert').style.display = 'flex';
    }
}

// Create a channel card element
function createChannelCard(channel) {
    const card = document.createElement('div');
    card.className = `channel-card ${channel.status}`;

    if (channel.status === 'empty') {
        card.innerHTML = createEmptyCardHTML(channel);
    } else {
        card.innerHTML = createActiveCardHTML(channel);
        card.onclick = () => openChannelDetail(channel);
    }

    return card;
}

// Create HTML for empty channel
function createEmptyCardHTML(channel) {
    return `
        <div class="card-header">
            <span class="channel-number">CH ${channel.id}</span>
            <span class="test-sequence">---</span>
        </div>

        <div class="sequence-dots">
            <span class="sequence-dot"></span>
            <span class="sequence-dot"></span>
            <span class="sequence-dot"></span>
        </div>

        <div class="cassette-container">
            <div class="empty-state">
                <div class="icon">📋</div>
                <div>Empty Slot</div>
            </div>
        </div>
    `;
}

// Create HTML for active channel
function createActiveCardHTML(channel) {
    const { testSequence, currentTest, groupResult, previousTests, status } = channel;

    // Generate sequence dots
    const dots = Array.from({ length: 3 }, (_, i) => {
        let dotClass = 'sequence-dot';
        if (i < testSequence.current - 1) dotClass += ' completed';
        if (i === testSequence.current - 1) dotClass += ' current';
        return `<span class="${dotClass}"></span>`;
    }).join('');

    // Generate cassette lines
    const lines = currentTest.substances.map(sub => {
        const lineClass = `cassette-line ${sub.isControl ? 'control' : ''} ${sub.status}`;
        return `<div class="${lineClass}"></div>`;
    }).join('');

    // Result section - show spinner if testing, otherwise show result
    let resultHTML;
    if (currentTest.testing || status === 'testing') {
        resultHTML = `
            <div class="current-result">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div class="spinner"></div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Testing...</div>
                </div>
            </div>
        `;
    } else if (currentTest.result) {
        const resultIcon = currentTest.result === 'positive' ? '✗' : '✓';
        const resultText = currentTest.result === 'positive' ? 'POS' : 'NEG';
        resultHTML = `
            <div class="current-result">
                <div class="result-badge ${currentTest.result}">
                    <span class="icon">${resultIcon}</span>
                    <span>${resultText}</span>
                </div>
            </div>
        `;
    } else {
        resultHTML = '';
    }

    // Previous results
    const prevResultsHTML = previousTests && previousTests.length > 0
        ? `<div class="previous-results">
             ${previousTests.map((test, i) =>
                 `<span class="prev-result ${test.result}">${i + 1}:${test.result === 'positive' ? '✗' : '✓'}</span>`
             ).join(' ')}
           </div>`
        : '';

    // Group status
    const groupEmoji = groupResult === 'negative' ? '🟢' : groupResult === 'positive' ? '🔴' : '🟠';
    const groupText = groupResult === 'negative' ? 'NEG' : groupResult === 'positive' ? 'POS' : 'PENDING';

    // Action required indicator
    let actionHTML = '';
    if (status === 'needs_label') {
        actionHTML = '<div class="action-required">Label Control!</div>';
    } else if (status === 'awaiting_confirmation' && currentTest.result === 'positive') {
        actionHTML = `
            <div style="font-size: 11px; color: var(--status-pending); text-align: center; margin-top: auto;">
                Insert Test ${testSequence.current + 1}
            </div>
        `;
    }

    return `
        <div class="card-header">
            <div>
                <div class="channel-number">CH ${channel.id}</div>
                <div class="test-type">${currentTest.type} ${testSequence.current}/${testSequence.total}</div>
            </div>
        </div>

        <div class="sequence-dots">
            ${dots}
        </div>

        <div class="cassette-container">
            <div class="cassette-visual ${status === 'empty' ? 'empty' : ''}">
                ${lines}
            </div>
        </div>

        ${resultHTML}

        ${prevResultsHTML}

        <div class="group-status">
            <div class="group-label">Group</div>
            <div class="group-result ${groupResult}">
                <span class="emoji">${groupEmoji}</span>
                <span>${groupText}</span>
            </div>
        </div>

        ${actionHTML}
    `;
}

// Open channel detail modal
function openChannelDetail(channel) {
    if (channel.status === 'needs_label') {
        openModal('control-label-modal');
        return;
    }

    const modal = document.getElementById('detail-modal');
    const title = document.getElementById('detail-modal-title');
    const body = document.getElementById('detail-modal-body');

    title.textContent = `Channel ${channel.id} - Test Group`;

    let html = '';

    // Show all tests in group
    if (channel.previousTests.length > 0) {
        channel.previousTests.forEach((test, index) => {
            html += createTestDetailHTML(index + 1, test, channel.currentTest);
        });
    }

    // Current test
    html += createTestDetailHTML(
        channel.testSequence.current,
        channel.currentTest,
        channel.currentTest,
        true
    );

    // Next test placeholder
    if (channel.testSequence.current < channel.testSequence.total) {
        html += `
            <div class="test-detail">
                <div class="test-detail-header">
                    <span class="test-number">● Test ${channel.testSequence.current + 1}: Not started</span>
                </div>
            </div>
        `;
    }

    // Actions for pending confirmation
    if (channel.status === 'awaiting_confirmation' && channel.testSequence.current < channel.testSequence.total) {
        html += `
            <div class="info-box">
                <span class="icon">ℹ️</span>
                Test ${channel.testSequence.current} was POSITIVE. Choose next action:
            </div>
            <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="btn-secondary btn-block" onclick="continueConfirmation(${channel.id}); closeModal('detail-modal');">
                    Continue Confirmation<br/>
                    <small style="font-size: 10px;">(Insert cassette for Test ${channel.testSequence.current + 1})</small>
                </button>
                <button class="btn-primary btn-block" onclick="markGroupPositive(${channel.id})">
                    Mark Group as Positive
                </button>
            </div>
        `;
    }

    // Final group result
    html += `
        <div class="section-divider"></div>
        <div style="text-align: center;">
            <div class="status-badge ${channel.groupResult === 'negative' ? 'success' : channel.groupResult === 'positive' ? 'error' : 'warning'}">
                📊 Group Result: ${channel.groupResult.toUpperCase()}
            </div>
        </div>
    `;

    body.innerHTML = html;
    openModal('detail-modal');
}

// Create test detail HTML
function createTestDetailHTML(testNumber, testData, currentTest, isCurrent = false) {
    const resultClass = testData.result === 'positive' ? 'positive' : 'negative';
    const resultIcon = testData.result === 'positive' ? '✗' : '✓';

    const substances = (testData.substances || currentTest.substances).map(sub => `
        <div class="substance-line">
            <div class="line-visual ${sub.isControl ? 'control' : ''} ${sub.status}"></div>
            <span class="substance-name">${sub.name}:</span>
            <span class="substance-result ${sub.status}">${sub.status.toUpperCase()}</span>
        </div>
    `).join('');

    return `
        <div class="test-detail">
            <div class="test-detail-header">
                <span class="test-number">● Test ${testNumber}: ${currentTest.type}${isCurrent ? ' (Current)' : ''}</span>
                <span class="test-result-badge ${resultClass}">
                    ${testData.result ? testData.result.toUpperCase() : ''} ${resultIcon}
                </span>
            </div>
            <div class="test-metadata">
                Route: ${currentTest.route} | Operator: ${currentTest.operator}
            </div>
            <div class="substance-results">
                ${substances}
            </div>
        </div>
    `;
}

// Insert cassette with specified result type (for demo)
function insertCassette(channelId, resultType) {
    const channel = channelData.find(c => c.id === channelId);
    if (!channel) return;

    // Only allow insertion if empty or awaiting confirmation
    if (channel.status !== 'empty' && channel.status !== 'awaiting_confirmation') return;

    // Store the expected result for this test
    channel.expectedResult = resultType;

    // Determine if this is a new test or part of confirmation flow
    if (!channel.testSequence || channel.status === 'empty') {
        // New test group
        channel.testSequence = { current: 1, total: 1 };
        channel.previousTests = [];
    } else if (channel.status === 'awaiting_confirmation') {
        // Continuing confirmation flow - add previous test to history
        if (channel.currentTest) {
            channel.previousTests = channel.previousTests || [];
            channel.previousTests.push({
                number: channel.testSequence.current,
                result: channel.currentTest.result
            });
        }
        channel.testSequence.current++;
    }

    // Set channel to the modal and open it
    document.getElementById('test-channel').value = channelId;

    // Pre-fill test type (simulating QR scan or use same type for confirmation)
    if (channel.currentTest && channel.currentTest.type) {
        document.getElementById('test-type').value = channel.currentTest.type;
    } else {
        const testTypes = ['3BTC', '4BTCS', '2BC'];
        const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
        document.getElementById('test-type').value = randomType;
    }

    // Pre-fill route and operator with last used values or defaults
    document.getElementById('test-route').value = channel.currentTest?.route || 'Daws';
    document.getElementById('test-operator').value = channel.currentTest?.operator || 'KAYU';

    openModal('start-test-modal');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    renderChannels();

    // Update time every second
    updateTime();
    setInterval(updateTime, 1000);
});

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}`;
}

// Helper functions for form
function fillRoute(value) {
    document.getElementById('test-route').value = value;
}

function fillOperator(value) {
    document.getElementById('test-operator').value = value;
}

// Radio option selection styling
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.radio-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const container = this.closest('.radio-group');
            container.querySelectorAll('.radio-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            if (this.checked) {
                this.closest('.radio-option').classList.add('selected');
            }
        });
    });
});
