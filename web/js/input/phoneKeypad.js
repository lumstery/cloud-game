// phoneKeypad.js - Specialized handler for phone numeric keypad for J2ME games
import {pub, sub, KEY_PRESSED, KEY_RELEASED, MENU_HANDLER_ATTACHED} from 'event';
import {log} from 'log';

// Mapping of UI phone keys to their libretro keyboard codes for freej2me
// These are the codes expected by the freej2me core
const PHONE_KEY_MAPPING = {
    // Numeric keys - using standard keyboard numeric key codes (48-57)
    '0': 48,
    '1': 49,
    '2': 50,
    '3': 51,
    '4': 52,
    '5': 53,
    '6': 54,
    '7': 55,
    '8': 56,
    '9': 57,
    // Special keys
    '*': 42, // Asterisk key
    '#': 35, // Hash key
    // Navigation - these will be handled by the standard mapping
    // but included here for completeness
    'up': 273,    // Standard arrow key
    'down': 274,  // Standard arrow key
    'left': 276,  // Standard arrow key
    'right': 275, // Standard arrow key
    'select': 303, // Left soft key (using ShiftRight as it's often mapped to Q in freej2me)
    'start': 304,  // Right soft key (using ShiftLeft as it's often mapped to W in freej2me)
    'a': 13,       // OK/Fire button (Enter key)
    'center': 13,  // Alternative mapping for center/OK button
    'ok': 13,      // Another alternative for OK button
    '5': 53        // Also maps to OK in many j2me games when in standard phone mode
};

// Create a buffer for sending keyboard events to the libretro core
const createKeyEvent = (() => {
    // Format: [CODE (4 bytes)] [PRESSED (1 byte)] [MODIFIER (2 bytes)]
    const buffer = new ArrayBuffer(7);
    const dv = new DataView(buffer);
    
    return (keyCode, pressed = false) => {
        dv.setUint32(0, keyCode);
        dv.setUint8(4, pressed ? 1 : 0);
        dv.setUint16(5, 0); // No modifiers
        return buffer;
    };
})();

// Transport reference to be set during initialization
let keyboardTransport = null;

// Queue to store button events if they come in before transport is initialized
let pendingEvents = [];
let isInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

// Try to get the transport from the global API
const tryGetTransport = () => {
    try {
        if (window.api && window.api.transport && window.api.transport.keyboard) {
            keyboardTransport = window.api.transport.keyboard;
            isInitialized = true;
            log.info('[input] phoneKeypad initialized from global api');
            return true;
        }
    } catch (e) {
        log.warn('[input] Error trying to access global api:', e);
    }
    return false;
};

// Main handler for phone keypad input
const handlePhoneKeyEvent = (keyName, pressed) => {
    // Get the key code from our mapping
    let keyCode = PHONE_KEY_MAPPING[keyName];
    
    // Get the transport - try multiple sources
    let transport = keyboardTransport;
    
    // Try to get transport directly from window.api if not already set
    if (!transport) {
        try {
            // Try to access from window.api
            if (window.api && window.api.transport && window.api.transport.keyboard) {
                transport = window.api.transport.keyboard;
                keyboardTransport = transport; // Save for future use
                isInitialized = true;
                log.info('[input] phoneKeypad using transport from window.api');
            }
            // Try to access from webrtc global
            else if (window.webrtc && window.webrtc.keyboard) {
                transport = window.webrtc.keyboard;
                keyboardTransport = transport; // Save for future use
                isInitialized = true;
                log.info('[input] phoneKeypad using transport from window.webrtc');
            }
        } catch (e) {
            log.warn('[input] Error trying to access keyboard transport:', e);
        }
    }
    
    // Special handling for center/OK button
    if ((keyName === 'a' || keyName === 'center' || keyName === 'ok') && transport) {
        log.debug(`Handling OK/center button press: ${pressed}`);
        
        // For OK button, we'll send both Enter (13) and 5 key (53) for compatibility
        // with different J2ME games
        
        // Send Enter key (13) - primary OK/Fire button
        const enterBuffer = createKeyEvent(13, pressed);
        transport(enterBuffer);
        
        // Many J2ME games also use '5' as center/select/fire key when in numeric keypad mode
        // Let's send it with a small delay to avoid conflicts
        setTimeout(() => {
            if (transport) {
                const fiveBuffer = createKeyEvent(53, pressed); // Key code for '5'
                transport(fiveBuffer);
            }
        }, 10);
        
        // Also publish the event for other components
        pub(pressed ? KEY_PRESSED : KEY_RELEASED, {key: keyName, phoneKey: true});
        return true;
    }
    
    if (keyCode === undefined) {
        // If we don't have a specific mapping, return false to let the default handler take over
        return false;
    }
    
    // If we still don't have transport, queue the event
    if (!transport) {
        // Store event for later processing
        log.warn(`Phone keypad transport not initialized, queuing event for key: ${keyName}, pressed: ${pressed}`);
        pendingEvents.push({keyName, pressed});
        
        // Only try to initialize a few times to avoid infinite loop
        if (initAttempts < MAX_INIT_ATTEMPTS) {
            initAttempts++;
            setTimeout(() => {
                if (tryGetTransport() && pendingEvents.length > 0) {
                    log.info(`Processing ${pendingEvents.length} queued key events`);
                    pendingEvents.forEach(event => {
                        handlePhoneKeyEvent(event.keyName, event.pressed);
                    });
                    pendingEvents = [];
                }
            }, 500 * initAttempts); // Increasing delay on each attempt
        }
        return true; // Still return true to prevent default handling
    }

    // Create and send the key event
    const buffer = createKeyEvent(keyCode, pressed);
    transport(buffer);
    
    // Also publish the event for other components
    pub(pressed ? KEY_PRESSED : KEY_RELEASED, {key: keyName, phoneKey: true});
    return true;
};

// Process any pending events
const processPendingEvents = () => {
    if (pendingEvents.length > 0 && keyboardTransport) {
        log.info(`Processing ${pendingEvents.length} queued key events`);
        pendingEvents.forEach(event => {
            const keyCode = PHONE_KEY_MAPPING[event.keyName];
            if (keyCode !== undefined) {
                const buffer = createKeyEvent(keyCode, event.pressed);
                keyboardTransport(buffer);
                pub(event.pressed ? KEY_PRESSED : KEY_RELEASED, {key: event.keyName, phoneKey: true});
            }
        });
        pendingEvents = [];
    }
};

// Listen for menu handler attached to try to get transport
sub(MENU_HANDLER_ATTACHED, (data) => {
    if (!isInitialized && data && data.handler && data.handler.transport && data.handler.transport.keyboard) {
        keyboardTransport = data.handler.transport.keyboard;
        isInitialized = true;
        log.info('[input] phoneKeypad initialized from menu handler');
        processPendingEvents();
    }
});

export const phoneKeypad = {
    // Initialize the keypad with the transport
    init: (transport) => {
        if (transport && transport.keyboard) {
            keyboardTransport = transport.keyboard;
            isInitialized = true;
            log.info('[input] phone keypad handler initialized directly');
            processPendingEvents();
        } else if (!keyboardTransport) {
            // Try to get from global api
            if (tryGetTransport()) {
                processPendingEvents();
            } else {
                log.warn('[input] Transport not available yet, will try to initialize later');
                // Store on window for easy access
                if (!window.phoneKeypadHelper) {
                    window.phoneKeypadHelper = {
                        init: (transport) => {
                            if (transport && transport.keyboard) {
                                keyboardTransport = transport.keyboard;
                                isInitialized = true;
                                log.info('[input] phoneKeypad initialized via helper');
                                processPendingEvents();
                            }
                        }
                    };
                }
            }
        }
    },
    
    // Handle a key press or release
    handleKey: (keyName, pressed) => {
        return handlePhoneKeyEvent(keyName, pressed);
    },
    
    // Check if this is a phone key we handle
    isPhoneKey: (keyName) => {
        return PHONE_KEY_MAPPING[keyName] !== undefined;
    }
}; 