// Workflow Logic and Test State Management

/**
 * Start a new test
 */
function startTest(event) {
    event.preventDefault();

    const formData = {
        channel: parseInt(document.getElementById('test-channel').value),
        testType: document.getElementById('test-type').value,
        scenario: document.querySelector('input[name="scenario"]:checked').value,
        route: document.getElementById('test-route').value,
        operator: document.getElementById('test-operator').value,
        processing: document.querySelector('input[name="processing"]:checked').value,
        sampleId: document.getElementById('sample-id').value,
        notes: document.getElementById('test-notes').value
    };

    console.log('Starting test with data:', formData);

    // Close modal
    closeModal('start-test-modal');

    // Get the channel and its expected result
    const channel = channelData.find(c => c.id === formData.channel);
    if (!channel) return;

    const expectedResult = channel.expectedResult || 'negative';

    // Generate substance results based on expected result
    const substances = generateSubstances(formData.testType, expectedResult);

    // Update channel to testing state
    channel.status = 'testing';
    channel.currentTest = {
        type: formData.testType,
        scenario: formData.scenario,
        route: formData.route,
        operator: formData.operator,
        result: null, // Will be set after timer
        substances: substances,
        testing: true
    };
    channel.groupResult = channel.groupResult || 'pending';

    renderChannels();

    // Simulate test completion after 2 seconds
    setTimeout(() => {
        completeChannelTest(formData.channel, expectedResult, substances);
    }, 2000);

    return false;
}

/**
 * Generate substances based on test type and expected result
 */
function generateSubstances(testType, expectedResult) {
    const substances = [
        { name: 'Control', status: expectedResult, isControl: true }
    ];

    if (testType === '3BTC' || testType === '4BTCS') {
        substances.push(
            { name: 'Beta-lactams', status: expectedResult },
            { name: 'Cephalexin', status: 'negative' },
            { name: 'Cetiofur', status: 'negative' }
        );
    }

    if (testType === '4BTCS') {
        substances.push({ name: 'Sulfamethazine', status: 'negative' });
    }

    if (testType === '2BC') {
        substances.push(
            { name: 'Beta-lactams', status: expectedResult },
            { name: 'Cephalexin', status: 'negative' }
        );
    }

    return substances;
}

/**
 * Complete the test after timer
 */
function completeChannelTest(channelId, result, substances) {
    const channel = channelData.find(c => c.id === channelId);
    if (!channel) return;

    channel.currentTest.result = result;
    channel.currentTest.substances = substances;
    channel.currentTest.testing = false;

    // Handle confirmation flow logic
    if (result === 'positive' && channel.testSequence.current === 1) {
        // First test positive - needs confirmation
        channel.testSequence.total = 3;
        channel.status = 'awaiting_confirmation';
        channel.groupResult = 'pending';
    } else if (result === 'positive' && channel.testSequence.current < channel.testSequence.total) {
        // Still in confirmation, positive again
        channel.status = 'awaiting_confirmation';
        channel.groupResult = 'pending';
    } else if (result === 'negative' && channel.testSequence.current === channel.testSequence.total) {
        // Last test negative - group is negative
        channel.status = 'complete';
        channel.groupResult = 'negative';
    } else if (result === 'negative' && channel.testSequence.current === 1) {
        // First test negative - done
        channel.status = 'complete';
        channel.groupResult = 'negative';
    } else if (result === 'positive' && channel.testSequence.current === channel.testSequence.total) {
        // Last confirmation positive
        channel.status = 'complete';
        channel.groupResult = 'positive';
    }

    // Check if control needs labeling
    if (channel.currentTest.scenario === 'control' && result === 'positive') {
        channel.status = 'needs_label';
    }

    renderChannels();
}

/**
 * Update channel state
 */
function updateChannelState(channelId, updates) {
    const channel = channelData.find(c => c.id === channelId);
    if (channel) {
        Object.assign(channel, updates);
        renderChannels();
    }
}

/**
 * Confirm control label
 */
function confirmControlLabel() {
    const label = document.querySelector('input[name="control-label"]:checked').value;

    console.log('Control labeled as:', label);

    alert(`Control labeled as: ${label.toUpperCase()}`);

    // Update channel state
    const channel = channelData.find(c => c.status === 'needs_label');
    if (channel) {
        channel.status = 'complete';
        channel.groupResult = 'positive';
        channel.currentTest.controlLabel = label;
    }

    closeModal('control-label-modal');
    renderChannels();
}

/**
 * Continue confirmation flow
 */
function continueConfirmation(channelId) {
    const channel = channelData.find(c => c.id === channelId);
    if (!channel) return;

    // Simulate inserting new cassette
    document.getElementById('test-channel').value = channelId;
    openModal('start-test-modal');
}

/**
 * Mark group as positive (skip remaining confirmation tests)
 */
function markGroupPositive(channelId) {
    const channel = channelData.find(c => c.id === channelId);
    if (channel) {
        channel.groupResult = 'positive';
        channel.status = 'complete';
        closeModal('detail-modal');
        renderChannels();
        alert(`Channel ${channelId} marked as POSITIVE`);
    }
}

/**
 * Complete test (called when timer expires or read completes)
 */
function completeTest(channelId, results) {
    const channel = channelData.find(c => c.id === channelId);
    if (!channel) return;

    channel.currentTest.result = results.result;
    channel.currentTest.substances = results.substances;

    // Determine next steps based on confirmation flow
    if (results.result === 'positive' && channel.testSequence.current < channel.testSequence.total) {
        // Positive result needs confirmation
        channel.status = 'pending_confirmation';
        channel.groupResult = 'pending';
    } else if (results.result === 'negative' && channel.testSequence.current === channel.testSequence.total) {
        // All tests complete, group is negative
        channel.status = 'complete';
        channel.groupResult = 'negative';
    } else if (results.result === 'positive' && channel.testSequence.current === channel.testSequence.total) {
        // Final confirmation test positive
        channel.status = 'complete';
        channel.groupResult = 'positive';
    }

    // Check if control needs labeling
    if (channel.currentTest.scenario === 'control' && results.result === 'positive') {
        channel.status = 'needs_label';
    }

    renderChannels();
}

/**
 * Cancel test
 */
function cancelTest(channelId) {
    const channel = channelData.find(c => c.id === channelId);
    if (channel) {
        if (confirm('Are you sure you want to cancel this test?')) {
            channel.status = 'empty';
            renderChannels();
        }
    }
}

/**
 * Export test results
 */
function exportResults(channelId) {
    const channel = channelData.find(c => c.id === channelId);
    if (!channel) return;

    const data = JSON.stringify(channel, null, 2);
    console.log('Export data:', data);
    alert('Results exported to console (in real app, this would generate PDF/CSV)');
}

// Menu functions
function openMenu() {
    // Simple menu implementation
    const menuItems = [
        'Test History',
        'Settings',
        'Run Verification',
        'Sign In to Cloud',
        'About'
    ];

    alert('Menu:\n' + menuItems.map((item, i) => `${i + 1}. ${item}`).join('\n'));
}
