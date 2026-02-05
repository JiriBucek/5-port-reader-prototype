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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Milk Testing Device Prototype Loaded');

    // Ensure home screen is visible on load
    navigateTo('home-screen');
});
