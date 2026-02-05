// Navigation Management

/**
 * Navigate to a different screen
 * @param {string} screenId - The ID of the screen to navigate to
 */
function navigateTo(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Show the target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error(`Screen with id "${screenId}" not found`);
    }
}

/**
 * Go back to previous screen (simple implementation)
 * Can be enhanced with history tracking if needed
 */
function goBack() {
    navigateTo('home-screen');
}

/**
 * Open a modal
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
        console.error(`Modal with id "${modalId}" not found`);
    }
}

/**
 * Close a modal
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling

        // Reset form if it's the start test modal
        if (modalId === 'start-test-modal') {
            document.getElementById('start-test-form').reset();
            // Reset radio selection styling
            document.querySelectorAll('.radio-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.querySelectorAll('.radio-option input[type="radio"]:checked').forEach(radio => {
                radio.closest('.radio-option').classList.add('selected');
            });
        }
    }
}

/**
 * Close modal when clicking overlay
 */
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay && !overlay.querySelector('.modal.blocking')) {
                const modalId = overlay.id;
                closeModal(modalId);
            }
        });
    });
});

/**
 * Close modal on Escape key (except blocking modals)
 */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        activeModals.forEach(modal => {
            if (!modal.querySelector('.modal.blocking')) {
                closeModal(modal.id);
            }
        });
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Milk Testing Device Prototype Loaded');
    console.log('Device: 5-Port Reader | Display: 1280x800px | Version: 1.0.0');

    // Ensure home screen is visible on load
    navigateTo('home-screen');
});
