import {env} from 'env';
import {
    pub,
    sub,
    AXIS_CHANGED,
    KEY_PRESSED,
    KEY_RELEASED,
    GAME_PLAYER_IDX,
    DPAD_TOGGLE,
    MENU_HANDLER_ATTACHED,
    MENU_PRESSED,
    MENU_RELEASED
} from 'event';
import {KEY} from 'input';
import {log} from 'log';
import {phoneKeypad} from './phoneKeypad.js?v=3';

const MAX_DIFF = 20; // radius of circle boundary

// vpad state, use for mouse button down
let vpadState = {[KEY.UP]: false, [KEY.DOWN]: false, [KEY.LEFT]: false, [KEY.RIGHT]: false};
let analogState = [0, 0];

let vpadTouchIdx = null;
let vpadTouchDrag = null;
let vpadHolder = document.getElementById('phone-keypad');
let vpadCircle = null;

const buttons = Array.from(document.querySelectorAll('.phone-key, .key-up, .key-down, .key-left, .key-right, .key-center, .side-button'));
const playerSlider = document.getElementById('playeridx');
const dpad = Array.from(document.querySelectorAll('.key-up, .key-down, .key-left, .key-right'));

const dpadToggle = document.getElementById('dpad-toggle') || { addEventListener: () => {} };
dpadToggle.addEventListener('change', (e) => {
    if (e && e.target) {
        pub(DPAD_TOGGLE, {checked: e.target.checked});
    }
});

const getKey = (el) => el.dataset.key

let dpadMode = true;
const deadZone = 0.1;

let enabled = false;
let phoneKeypadInitialized = false;

function onDpadToggle(checked) {
    if (dpadMode === checked) {
        return //error?
    }
    if (dpadMode) {
        dpadMode = false;
        vpadHolder?.classList.add('dpad-empty');
        // Since we removed the circle pad, we need to skip these operations
        // vpadCircle?.classList.add('bong-full');
        // reset dpad keys pressed before moving to analog stick mode
        resetVpadState()
    } else {
        dpadMode = true;
        vpadHolder?.classList.remove('dpad-empty');
        // vpadCircle?.classList.remove('bong-full');
    }
}

function resetVpadState() {
    if (dpadMode) {
        // trigger up event?
        checkVpadState(KEY.UP, false);
        checkVpadState(KEY.DOWN, false);
        checkVpadState(KEY.LEFT, false);
        checkVpadState(KEY.RIGHT, false);
    } else {
        checkAnalogState(0, 0);
        checkAnalogState(1, 0);
    }

    vpadTouchDrag = null;
    vpadTouchIdx = null;

    dpad.forEach(arrow => arrow.classList.remove('pressed'));
}

function checkVpadState(axis, state) {
    if (state !== vpadState[axis]) {
        vpadState[axis] = state;
        pub(state ? KEY_PRESSED : KEY_RELEASED, {key: axis});
    }
}

function checkAnalogState(axis, value) {
    if (-deadZone < value && value < deadZone) value = 0;
    if (analogState[axis] !== value) {
        analogState[axis] = value;
        pub(AXIS_CHANGED, {id: axis, value: value});
    }
}

function handleVpadJoystickDown(event) {
    // Since we removed the circle pad, we'll skip these operations
    // vpadCircle?.style['transition'] = '0s';

    if (event.changedTouches) {
        resetVpadState();
        vpadTouchIdx = event.changedTouches[0].identifier;
        event.clientX = event.changedTouches[0].clientX;
        event.clientY = event.changedTouches[0].clientY;
    }

    vpadTouchDrag = {x: event.clientX, y: event.clientY};
}

function handleVpadJoystickUp() {
    if (vpadTouchDrag === null) return;

    // Since we removed the circle pad, we'll skip these operations
    // vpadCircle?.style['transition'] = '.2s';
    // vpadCircle?.style['transform'] = 'translate3d(0px, 0px, 0px)';

    resetVpadState();
}

function handleVpadJoystickMove(event) {
    if (vpadTouchDrag === null) return;

    if (event.changedTouches) {
        // check if moving source is from other touch?
        for (let i = 0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier === vpadTouchIdx) {
                event.clientX = event.changedTouches[i].clientX;
                event.clientY = event.changedTouches[i].clientY;
            }
        }
        if (event.clientX === undefined || event.clientY === undefined)
            return;
    }

    let xDiff = event.clientX - vpadTouchDrag.x;
    let yDiff = event.clientY - vpadTouchDrag.y;
    let angle = Math.atan2(yDiff, xDiff);
    let distance = Math.min(MAX_DIFF, Math.hypot(xDiff, yDiff));
    let xNew = distance * Math.cos(angle);
    let yNew = distance * Math.sin(angle);

    if (env.display().isLayoutSwitched) {
        let tmp = xNew;
        xNew = yNew;
        yNew = -tmp;
    }

    // Since we removed the circle pad, we'll skip this operation
    // vpadCircle?.style['transform'] = `translate(${xNew}px, ${yNew}px)`;

    let xRatio = xNew / MAX_DIFF;
    let yRatio = yNew / MAX_DIFF;

    if (dpadMode) {
        checkVpadState(KEY.LEFT, xRatio <= -0.5);
        checkVpadState(KEY.RIGHT, xRatio >= 0.5);
        checkVpadState(KEY.UP, yRatio <= -0.5);
        checkVpadState(KEY.DOWN, yRatio >= 0.5);
    } else {
        checkAnalogState(0, xRatio);
        checkAnalogState(1, yRatio);
    }
}

// right side - control buttons
const _handleButton = (key, state, element) => {
    // Check if this button has an alternate key (for special cases like OK/5)
    const altKey = element ? element.dataset.altKey : null;
    
    // Check if this is a phone keypad key first
    if (phoneKeypad.isPhoneKey(key)) {
        // Handle with our specialized phone keypad handler
        if (!phoneKeypad.handleKey(key, state)) {
            // If phone keypad handler doesn't handle it (returns false), fall back to the default
            checkVpadState(key, state);
        }
        
        // If this button has an alt key, also send that event
        if (altKey && phoneKeypad.isPhoneKey(altKey)) {
            // Handle the alt key with a small delay
            setTimeout(() => {
                phoneKeypad.handleKey(altKey, state);
            }, 10);
        }
    } else {
        // Use the default handler for non-phone keys
        checkVpadState(key, state);
    }
}

function handleButtonDown() {
    _handleButton(getKey(this), true, this);
}

function handleButtonUp() {
    _handleButton(getKey(this), false, this);
}

function handleButtonClick() {
    _handleButton(getKey(this), true, this);
    setTimeout(() => {
        _handleButton(getKey(this), false, this);
    }, 30);
}

function handlePlayerSlider() {
    pub(GAME_PLAYER_IDX, {index: this.value - 1});
}

// Touch menu
let menuTouchIdx = null;
let menuTouchDrag = null;
let menuTouchTime = null;

function handleMenuDown(event) {
    // Identify of touch point
    if (event.changedTouches) {
        menuTouchIdx = event.changedTouches[0].identifier;
        event.clientX = event.changedTouches[0].clientX;
        event.clientY = event.changedTouches[0].clientY;
    }

    menuTouchDrag = {x: event.clientX, y: event.clientY,};
    menuTouchTime = Date.now();
}

function handleMenuMove(evt) {
    if (menuTouchDrag === null) return;

    if (evt.changedTouches) {
        // check if moving source is from other touch?
        for (let i = 0; i < evt.changedTouches.length; i++) {
            if (evt.changedTouches[i].identifier === menuTouchIdx) {
                evt.clientX = evt.changedTouches[i].clientX;
                evt.clientY = evt.changedTouches[i].clientY;
            }
        }
        if (evt.clientX === undefined || evt.clientY === undefined)
            return;
    }

    const pos = env.display().isLayoutSwitched ? evt.clientX - menuTouchDrag.x : menuTouchDrag.y - evt.clientY;
    pub(MENU_PRESSED, pos);
}

function handleMenuUp(evt) {
    if (menuTouchDrag === null) return;
    if (evt.changedTouches) {
        if (evt.changedTouches[0].identifier !== menuTouchIdx)
            return;
        evt.clientX = evt.changedTouches[0].clientX;
        evt.clientY = evt.changedTouches[0].clientY;
    }

    let newY = env.display().isLayoutSwitched ? -menuTouchDrag.x + evt.clientX : menuTouchDrag.y - evt.clientY;

    let interval = Date.now() - menuTouchTime; // 100ms?
    if (interval < 200) {
        // calc velocity
        newY = newY / interval * 250;
    }

    // current item?
    pub(MENU_RELEASED, newY);
    menuTouchDrag = null;
}

// Common events
function handleWindowMove(event) {
    if (!enabled) return

    event.preventDefault();
    handleVpadJoystickMove(event);
    handleMenuMove(event);

    // moving touch
    if (event.changedTouches) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            if (event.changedTouches[i].identifier !== menuTouchIdx && event.changedTouches[i].identifier !== vpadTouchIdx) {
                // check class

                let elem = document.elementFromPoint(event.changedTouches[i].clientX, event.changedTouches[i].clientY);

                if (elem.classList.contains('btn')) {
                    elem.dispatchEvent(new Event('touchstart'));
                } else {
                    elem.dispatchEvent(new Event('touchend'));
                }
            }
        }
    }
}

function handleWindowUp(ev) {
    handleVpadJoystickUp(ev);
    handleMenuUp(ev);
    buttons.forEach((btn) => {
        btn.dispatchEvent(new Event('touchend'));
    });
}

// touch/mouse events for control buttons. mouseup events is bound to window.
buttons.forEach((btn) => {
    btn.addEventListener('mousedown', handleButtonDown);
    btn.addEventListener('touchstart', handleButtonDown, {passive: true});
    btn.addEventListener('touchend', handleButtonUp);
});

dpad.forEach((arrow) => {
    arrow.addEventListener('click', handleButtonClick);
});

// touch/mouse events for player slider.
if (playerSlider) {
    playerSlider.addEventListener('oninput', handlePlayerSlider);
    playerSlider.addEventListener('onchange', handlePlayerSlider);
    playerSlider.addEventListener('click', handlePlayerSlider);
    playerSlider.addEventListener('touchend', handlePlayerSlider);
    playerSlider.onkeydown = (e) => {
        e.preventDefault();
    }
}

/**
 * Touch controls.
 *
 * Virtual Gamepad / Joystick
 * Left panel - Dpad
 *
 * @link https://jsfiddle.net/aa0et7tr/5/
 * @version 1
 */
export const touch = {
    init: (api) => {
        if (enabled) return;
        enabled = true;

        // Try to initialize phone keypad directly from global objects if API not provided
        if (!api || !api.transport) {
            // Try from window.api first
            if (window.api && window.api.transport) {
                log.info('[input] touch using window.api for phoneKeypad initialization');
                phoneKeypad.init(window.api.transport);
                phoneKeypadInitialized = true;
            } 
            // Try from window.webrtc
            else if (window.webrtc) {
                log.info('[input] touch using window.webrtc for phoneKeypad initialization');
                phoneKeypad.init({keyboard: window.webrtc.keyboard, mouse: window.webrtc.mouse});
                phoneKeypadInitialized = true;
            }
        } else {
            // Initialize the phone keypad handler with the provided API transport
            phoneKeypad.init(api.transport);
            phoneKeypadInitialized = true;
            log.info('[input] phone keypad initialized with provided transport');
        }

        // Add event listeners for buttons
        buttons.forEach(button => {
            button.addEventListener('touchstart', handleButtonDown, {passive: true});
            button.addEventListener('touchend', handleButtonUp);
            button.addEventListener('mousedown', handleButtonDown);
            button.addEventListener('mouseup', handleButtonUp);
            button.addEventListener('click', handleButtonClick);
        });

        // Player slider
        playerSlider && playerSlider.addEventListener('input', handlePlayerSlider);

        // Bind vpad events
        /*
        vpadCircleContainer?.addEventListener('touchstart', handleVpadJoystickDown, {passive: true});
        vpadCircleContainer?.addEventListener('touchend', handleVpadJoystickUp);
        vpadCircleContainer?.addEventListener('touchcancel', handleVpadJoystickUp);
        vpadCircleContainer?.addEventListener('touchmove', handleVpadJoystickMove, {passive: true});
        */

        // Make sure we initialize the phone keypad even if the API wasn't available during initial init
        sub(MENU_HANDLER_ATTACHED, (data) => {
            if (data && data.handler && data.handler.transport && !phoneKeypadInitialized) {
                phoneKeypad.init(data.handler.transport);
                phoneKeypadInitialized = true;
                log.info('[input] phone keypad initialized with transport (from menu handler)');
            }
        });

        // Attempt API initialization in a few seconds if it failed initially
        // This allows time for WebRTC connection to be established
        setTimeout(() => {
            if (!phoneKeypadInitialized && window.api && window.api.transport) {
                phoneKeypad.init(window.api.transport);
                phoneKeypadInitialized = true;
                log.info('[input] phone keypad initialized with delayed global api');
            }
        }, 3000);

        // Also expose a global helper function to initialize from anywhere
        window.initPhoneKeypad = (api) => {
            if (!phoneKeypadInitialized && api && api.transport) {
                phoneKeypad.init(api.transport);
                phoneKeypadInitialized = true;
                log.info('[input] phone keypad initialized via global helper');
            }
        };

        // Setup window events
        window.addEventListener('touchmove', handleWindowMove, {passive: false});
        window.addEventListener('mousemove', handleWindowMove, {passive: false});
        window.addEventListener('wheel', handleWindowMove, {passive: false});

        log.info('[input] touch has been initialized');
    },
    toggle: (v) => v === undefined ? (enabled = !enabled) : (enabled = v)
}
