/**
 * ==============================================================================
 * HORSE SENSOR LOG - Equine Movement Data Collection Interface
 * Research & University Dataset Collection Tool
 *
 * Supported Gait Classes (Exact Strings):
 *   1. "Walking Natural" -> 'walking-natural'
 *   2. "Walking Rider"   -> 'walking-rider'
 *   3. "Trotting Natural"-> 'trotting-natural'
 *   4. "Trotting Rider"  -> 'trotting-rider'
 * ==============================================================================
 */

// Strict Mode for safety and quality
'use strict';

/* ==============================================================================
   1. CONSTANTS & ACTIVITY CLASS DEFINITIONS
   ============================================================================== */
const ACTIVITY_CLASSES = {
  'walking-natural': {
    key: 'walking-natural',
    label: 'Walking Natural',
    badge: 'Class 01',
    color: '#00e5ff',
    baseFrequency: 1.6, // Gait frequency in Hz for simulation
    baseSpeed: 1.5      // Approximate speed in m/s
  },
  'walking-rider': {
    key: 'walking-rider',
    label: 'Walking Rider',
    badge: 'Class 02',
    color: '#3b82f6',
    baseFrequency: 1.5,
    baseSpeed: 1.4
  },
  'trotting-natural': {
    key: 'trotting-natural',
    label: 'Trotting Natural',
    badge: 'Class 03',
    color: '#10b981',
    baseFrequency: 2.8,
    baseSpeed: 3.8
  },
  'trotting-rider': {
    key: 'trotting-rider',
    label: 'Trotting Rider',
    badge: 'Class 04',
    color: '#f59e0b',
    baseFrequency: 2.6,
    baseSpeed: 3.6
  }
};

const SAMPLE_RATE_MS = 50; // 20 Hz collection rate
const MAX_ACC_SCALE = 20.0; // Accelerometer deflection scale (+/- 20 m/s²)
const MAX_GYR_SCALE = 10.0; // Gyroscope deflection scale (+/- 10 rad/s)
const STORAGE_KEY = 'horse_sensor_log_sessions_v1';

/* ==============================================================================
   2. APPLICATION STATE
   ============================================================================== */
const state = {
  selectedActivityKey: null,
  isRecording: false,
  startTime: null,
  timerIntervalId: null,
  collectIntervalId: null,
  displayIntervalId: null,
  samples: [],
  sessions: [],
  hardwareSensorDetected: false,
  simulationEnabled: false,
  gpsWatchId: null,
  sessionCounter: 1
};

// Live sensor buffer
const liveSensors = {
  acc: { x: null, y: null, z: null },
  gyro: { x: null, y: null, z: null },
  gps: {
    latitude: null,
    longitude: null,
    altitude: null,
    speed: null,
    accuracy: null
  }
};

// Simulation physics state
const simState = {
  phase: 0,
  lat: 51.5074,
  lon: -0.1278,
  alt: 45.0,
  speed: 0.0
};

/* ==============================================================================
   3. DOM ELEMENT REFERENCES
   ============================================================================== */
const DOM = {
  // Header & Status
  statusPill: document.getElementById('statusPill'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  simCheckbox: document.getElementById('simCheckbox'),
  simToggleWrap: document.getElementById('simToggleWrap'),

  // Activity Label Elements
  activityGrid: document.getElementById('activityGrid'),
  activityButtons: document.querySelectorAll('.activity-btn'),
  currentLabelValue: document.getElementById('currentLabelValue'),
  currentLabelText: document.getElementById('currentLabelText'),
  internalKeyTag: document.getElementById('internalKeyTag'),

  // Controls
  startBtn: document.getElementById('startBtn'),
  endBtn: document.getElementById('endBtn'),
  recordingBanner: document.getElementById('recordingBanner'),
  bannerStatusText: document.getElementById('bannerStatusText'),
  bannerActivityText: document.getElementById('bannerActivityText'),
  timerDisplay: document.getElementById('timerDisplay'),
  sampleCountDisplay: document.getElementById('sampleCountDisplay'),

  // Live Sensors
  permissionBtn: document.getElementById('permissionBtn'),
  accXFill: document.getElementById('accXFill'),
  accYFill: document.getElementById('accYFill'),
  accZFill: document.getElementById('accZFill'),
  accXVal: document.getElementById('accXVal'),
  accYVal: document.getElementById('accYVal'),
  accZVal: document.getElementById('accZVal'),
  accWarning: document.getElementById('accWarning'),
  accStatus: document.getElementById('accStatus'),

  gyrXFill: document.getElementById('gyrXFill'),
  gyrYFill: document.getElementById('gyrYFill'),
  gyrZFill: document.getElementById('gyrZFill'),
  gyrXVal: document.getElementById('gyrXVal'),
  gyrYVal: document.getElementById('gyrYVal'),
  gyrZVal: document.getElementById('gyrZVal'),
  gyrWarning: document.getElementById('gyrWarning'),
  gyrStatus: document.getElementById('gyrStatus'),

  gpsLat: document.getElementById('gpsLat'),
  gpsLon: document.getElementById('gpsLon'),
  gpsAlt: document.getElementById('gpsAlt'),
  gpsSpd: document.getElementById('gpsSpd'),
  gpsAcc: document.getElementById('gpsAcc'),
  gpsWarning: document.getElementById('gpsWarning'),
  gpsStatus: document.getElementById('gpsStatus'),

  // Sessions History
  sessionCountBadge: document.getElementById('sessionCountBadge'),
  sessionList: document.getElementById('sessionList'),
  sessionEmptyMessage: document.getElementById('sessionEmptyMessage'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),

  // Toast
  toast: document.getElementById('toast')
};

/* ==============================================================================
   4. INITIALIZATION
   ============================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initSensors();
  initEventListeners();
  loadSessions();
  updateControlsUI();
  updateSensorUI();

  // Start continuous live UI refresh loop
  state.displayIntervalId = setInterval(updateSensorUI, SAMPLE_RATE_MS);

  // Auto-detect if sensors are present or suggest demo simulation on desktop
  setTimeout(detectSensorEnvironment, 1200);
});

/**
 * Check if the browser is on desktop/laptop without hardware motion sensors
 */
function detectSensorEnvironment() {
  if (!state.hardwareSensorDetected) {
    // Show non-intrusive warning that sensors are unavailable on this device
    DOM.accWarning.classList.add('visible');
    DOM.gyrWarning.classList.add('visible');
    DOM.accStatus.textContent = 'STANDBY';
    DOM.gyrStatus.textContent = 'STANDBY';

    // If on desktop and hardware sensors aren't active, activate simulation by default
    // so testing/demoing works seamlessly out of the box
    if (!state.simulationEnabled) {
      enableSimulation(true);
      showToast('Demo Sim activated: Generating realistic equine gait physics');
    }
  }
}

/**
 * Initialize event handlers for buttons and user interactions
 */
function initEventListeners() {
  // Activity Selection Buttons
  DOM.activityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      selectActivity(key);
    });
  });

  // START Recording Button
  DOM.startBtn.addEventListener('click', () => {
    startRecording();
  });

  // END Recording Button
  DOM.endBtn.addEventListener('click', () => {
    endRecording();
  });

  // Export All Button
  DOM.exportAllBtn.addEventListener('click', () => {
    exportCSV(state.sessions, `horse_sensor_dataset_all_${Date.now()}.csv`);
  });

  // Clear All Sessions Button
  DOM.clearAllBtn.addEventListener('click', () => {
    if (!state.sessions.length) return;
    const confirmClear = window.confirm('Are you sure you want to clear all recorded sessions? This cannot be undone.');
    if (confirmClear) {
      state.sessions = [];
      saveSessionsToStorage();
      renderSessions();
      showToast('All recorded sessions cleared');
    }
  });

  // Simulation Checkbox Toggle
  DOM.simCheckbox.addEventListener('change', (e) => {
    enableSimulation(e.target.checked);
  });

  // iOS Motion Sensor Permission Button
  if (DOM.permissionBtn) {
    DOM.permissionBtn.addEventListener('click', requestMotionPermission);
  }

  // Safety: Prevent accidental page exit during an active recording session
  window.addEventListener('beforeunload', (e) => {
    if (state.isRecording) {
      e.preventDefault();
      e.returnValue = 'A recording is currently in progress. If you leave now, unsaved sensor samples will be lost.';
      return e.returnValue;
    }
  });
}

/* ==============================================================================
   5. ACTIVITY SELECTION
   ============================================================================== */
/**
 * Select one of the 4 valid equine activity classes
 * @param {string} activityKey - Must be one of the four exact keys
 */
function selectActivity(activityKey) {
  if (!ACTIVITY_CLASSES[activityKey]) {
    console.error('Invalid activity class:', activityKey);
    return;
  }

  state.selectedActivityKey = activityKey;
  const activity = ACTIVITY_CLASSES[activityKey];

  // Update button visual styles
  DOM.activityButtons.forEach((btn) => {
    if (btn.dataset.key === activityKey) {
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  // Update Current Label display card
  DOM.currentLabelValue.classList.add('has-label');
  DOM.currentLabelText.textContent = activity.label;
  DOM.internalKeyTag.textContent = activity.key;
  DOM.internalKeyTag.style.display = 'inline-block';

  // Update recording banner text if idle
  if (!state.isRecording) {
    DOM.bannerActivityText.textContent = `Ready to record: ${activity.label}`;
  } else {
    // If recording was active, label updates for subsequent samples
    DOM.bannerActivityText.textContent = activity.label;
  }

  updateControlsUI();
}

/* ==============================================================================
   6. RECORDING CONTROLS (START & END)
   ============================================================================== */
/**
 * Starts a new data collection session
 */
function startRecording() {
  if (state.isRecording) {
    console.warn('Recording is already in progress.');
    return;
  }

  if (!state.selectedActivityKey) {
    showToast('Please select an activity class before starting');
    return;
  }

  const currentActivity = ACTIVITY_CLASSES[state.selectedActivityKey];

  // Initialize recording state
  state.isRecording = true;
  state.startTime = Date.now();
  state.samples = [];

  // Update Status Pill
  DOM.statusPill.classList.add('recording');
  DOM.statusText.textContent = 'RECORDING';

  // Update Recording Banner
  DOM.recordingBanner.classList.add('active');
  DOM.bannerStatusText.textContent = '● RECORDING';
  DOM.bannerActivityText.textContent = currentActivity.label;

  // Reset Metrics Displays
  DOM.timerDisplay.textContent = '00:00';
  DOM.sampleCountDisplay.textContent = '0 SAMPLES';

  // Update Controls UI (START disabled, END enabled)
  updateControlsUI();

  // Start Real-Time Timer Interval (updates every 500ms)
  state.timerIntervalId = setInterval(() => {
    if (!state.isRecording) return;
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    DOM.timerDisplay.textContent = formatTimer(elapsedSeconds);
  }, 500);

  // Start Data Collection Interval (Fixed 20 Hz / 50ms)
  state.collectIntervalId = setInterval(collectSensorData, SAMPLE_RATE_MS);

  // Provide tactile vibration feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  showToast(`Recording started: ${currentActivity.label}`);
}

/**
 * Stops the recording session, freezes timer, saves data, and resets UI
 */
function endRecording() {
  if (!state.isRecording) {
    console.warn('No active recording to stop.');
    return;
  }

  // Clear Intervals
  clearInterval(state.collectIntervalId);
  clearInterval(state.timerIntervalId);
  state.collectIntervalId = null;
  state.timerIntervalId = null;
  state.isRecording = false;

  // Calculate duration
  const totalDurationSeconds = ((Date.now() - state.startTime) / 1000).toFixed(1);
  const formattedDuration = formatTimer(Math.floor(totalDurationSeconds));

  // Freeze final timer display
  DOM.timerDisplay.textContent = formattedDuration;

  // Update Status Pill back to IDLE
  DOM.statusPill.classList.remove('recording');
  DOM.statusText.textContent = 'IDLE';

  // Update Recording Banner
  DOM.recordingBanner.classList.remove('active');
  DOM.bannerStatusText.textContent = 'COMPLETED';

  const activity = ACTIVITY_CLASSES[state.selectedActivityKey];
  DOM.bannerActivityText.textContent = `Saved session with ${state.samples.length} samples`;

  // Create Completed Session Object
  if (state.samples.length > 0) {
    const sessionObj = {
      id: Date.now(),
      sessionNumber: state.sessionCounter++,
      activityKey: state.selectedActivityKey,
      activityLabel: activity.label,
      durationSeconds: parseFloat(totalDurationSeconds),
      durationFormatted: formattedDuration,
      sampleCount: state.samples.length,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      samples: [...state.samples]
    };

    saveSession(sessionObj);
    showToast(`Session #${sessionObj.sessionNumber} saved (${sessionObj.sampleCount} samples)`);
  } else {
    showToast('Session ended with 0 samples');
  }

  // Update UI Controls
  updateControlsUI();

  // Provide tactile feedback
  if (navigator.vibrate) {
    navigator.vibrate([60, 50, 60]);
  }
}

/**
 * Updates UI control buttons according to the current application state
 */
function updateControlsUI() {
  if (state.isRecording) {
    // While recording: START disabled, END active
    DOM.startBtn.disabled = true;
    DOM.endBtn.disabled = false;
    DOM.startBtn.title = 'Recording in progress';
    DOM.endBtn.title = 'Stop current recording session';
  } else {
    // Idle / Ready: START active only if activity selected; END disabled
    DOM.endBtn.disabled = true;
    DOM.endBtn.title = 'Recording is not active';

    if (state.selectedActivityKey) {
      DOM.startBtn.disabled = false;
      DOM.startBtn.title = 'Begin recording session';
    } else {
      DOM.startBtn.disabled = true;
      DOM.startBtn.title = 'Select an activity class first';
    }
  }

  // Update Export All button state
  DOM.exportAllBtn.disabled = state.sessions.length === 0;
  DOM.clearAllBtn.disabled = state.sessions.length === 0;
}

/* ==============================================================================
   7. DATA COLLECTION & SAMPLING
   ============================================================================== */
/**
 * Collects a single sensor data snapshot and appends to the current session
 * Called continuously at 20 Hz during recording
 */
function collectSensorData() {
  if (!state.isRecording) return;

  // If simulation is enabled, advance equine physics step
  if (state.simulationEnabled) {
    stepEquineSimulation();
  }

  const currentActivityKey = state.selectedActivityKey;

  // Build the standardized sample object
  const sample = {
    session_id: state.sessionCounter,
    timestamp: new Date().toISOString(),
    activity: currentActivityKey, // Exactly one of the 4 internal keys
    acc_x: liveSensors.acc.x !== null ? Number(liveSensors.acc.x.toFixed(6)) : null,
    acc_y: liveSensors.acc.y !== null ? Number(liveSensors.acc.y.toFixed(6)) : null,
    acc_z: liveSensors.acc.z !== null ? Number(liveSensors.acc.z.toFixed(6)) : null,
    gyro_x: liveSensors.gyro.x !== null ? Number(liveSensors.gyro.x.toFixed(6)) : null,
    gyro_y: liveSensors.gyro.y !== null ? Number(liveSensors.gyro.y.toFixed(6)) : null,
    gyro_z: liveSensors.gyro.z !== null ? Number(liveSensors.gyro.z.toFixed(6)) : null,
    latitude: liveSensors.gps.latitude !== null ? Number(liveSensors.gps.latitude.toFixed(6)) : null,
    longitude: liveSensors.gps.longitude !== null ? Number(liveSensors.gps.longitude.toFixed(6)) : null,
    altitude: liveSensors.gps.altitude !== null ? Number(liveSensors.gps.altitude.toFixed(1)) : null,
    speed: liveSensors.gps.speed !== null ? Number(liveSensors.gps.speed.toFixed(2)) : null,
    accuracy: liveSensors.gps.accuracy !== null ? Number(liveSensors.gps.accuracy.toFixed(1)) : null
  };

  state.samples.push(sample);

  // Update Sample Counter Display
  DOM.sampleCountDisplay.textContent = `${state.samples.length} SAMPLES`;
}

/* ==============================================================================
   8. SENSOR HARDWARE LISTENERS & PERMISSIONS
   ============================================================================== */
/**
 * Initialize Hardware Motion and Geolocation sensor listeners
 */
function initSensors() {
  // 1. Device Motion (Accelerometer & Gyroscope)
  if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
    if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+ requires explicit user permission
      DOM.permissionBtn.classList.add('visible');
    } else {
      // Non-iOS standard browsers
      startMotionListener();
    }
  } else {
    DOM.accWarning.classList.add('visible');
    DOM.gyrWarning.classList.add('visible');
  }

  // 2. Geolocation (GPS)
  initGPS();
}

/**
 * Request DeviceMotionEvent permission on iOS devices
 */
async function requestMotionPermission() {
  if (typeof window !== 'undefined' && window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function') {
    try {
      const response = await window.DeviceMotionEvent.requestPermission();
      if (response === 'granted') {
        DOM.permissionBtn.classList.remove('visible');
        startMotionListener();
        showToast('Motion sensors permission granted');
      } else {
        showToast('Motion sensor permission denied');
      }
    } catch (err) {
      console.warn('Error requesting motion permission:', err);
      showToast('Could not access motion sensors');
    }
  }
}

/**
 * Attach the native devicemotion event listener
 */
function startMotionListener() {
  window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
}

/**
 * Event handler for raw hardware motion events
 */
function handleMotionEvent(event) {
  // If simulation is explicitly active and no real motion has occurred, allow sim to take precedence
  const rawAcc = event.accelerationIncludingGravity || event.acceleration;
  const rawRot = event.rotationRate;

  if (rawAcc && (rawAcc.x !== null || rawAcc.y !== null || rawAcc.z !== null)) {
    state.hardwareSensorDetected = true;
    DOM.accWarning.classList.remove('visible');
    DOM.accStatus.textContent = 'ACTIVE';

    if (!state.simulationEnabled) {
      liveSensors.acc.x = rawAcc.x ?? 0.0;
      liveSensors.acc.y = rawAcc.y ?? 0.0;
      liveSensors.acc.z = rawAcc.z ?? 0.0;
    }
  }

  if (rawRot && (rawRot.alpha !== null || rawRot.beta !== null || rawRot.gamma !== null)) {
    state.hardwareSensorDetected = true;
    DOM.gyrWarning.classList.remove('visible');
    DOM.gyrStatus.textContent = 'ACTIVE';

    if (!state.simulationEnabled) {
      // Convert degrees/sec to radians/sec for research standard consistency
      const degToRad = Math.PI / 180;
      liveSensors.gyro.x = rawRot.alpha !== null ? rawRot.alpha * degToRad : 0.0;
      liveSensors.gyro.y = rawRot.beta !== null ? rawRot.beta * degToRad : 0.0;
      liveSensors.gyro.z = rawRot.gamma !== null ? rawRot.gamma * degToRad : 0.0;
    }
  }
}

/**
 * Initialize GPS location monitoring via Geolocation API
 */
function initGPS() {
  if (!navigator.geolocation) {
    DOM.gpsWarning.classList.add('visible');
    DOM.gpsStatus.textContent = 'UNAVAILABLE';
    return;
  }

  try {
    state.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        DOM.gpsWarning.classList.remove('visible');
        DOM.gpsStatus.textContent = 'LOCKED';

        if (!state.simulationEnabled) {
          liveSensors.gps.latitude = coords.latitude;
          liveSensors.gps.longitude = coords.longitude;
          liveSensors.gps.altitude = coords.altitude;
          liveSensors.gps.speed = coords.speed;
          liveSensors.gps.accuracy = coords.accuracy;
        }
      },
      (error) => {
        console.warn('Geolocation warning/error:', error.message);
        DOM.gpsWarning.classList.add('visible');
        DOM.gpsStatus.textContent = 'DENIED/IDLE';
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000
      }
    );
  } catch (e) {
    console.warn('Geolocation failed to initialize:', e);
    DOM.gpsWarning.classList.add('visible');
  }
}

/* ==============================================================================
   9. EQUINE GAIT SIMULATION (FOR LAPTOP / DESKTOP TESTING & DEMOS)
   ============================================================================== */
/**
 * Enables or disables the realistic equine gait physics generator
 */
function enableSimulation(enable) {
  state.simulationEnabled = enable;
  DOM.simCheckbox.checked = enable;

  if (enable) {
    DOM.simToggleWrap.classList.add('active');
    DOM.accWarning.classList.remove('visible');
    DOM.gyrWarning.classList.remove('visible');
    DOM.gpsWarning.classList.remove('visible');
    DOM.accStatus.textContent = 'SIMULATED';
    DOM.gyrStatus.textContent = 'SIMULATED';
    DOM.gpsStatus.textContent = 'SIMULATED';
  } else {
    DOM.simToggleWrap.classList.remove('active');
    if (!state.hardwareSensorDetected) {
      DOM.accWarning.classList.add('visible');
      DOM.gyrWarning.classList.add('visible');
      DOM.accStatus.textContent = 'STANDBY';
      DOM.gyrStatus.textContent = 'STANDBY';
    }
  }
}

/**
 * Generates biomechanically inspired equine sensor dynamics
 * Walking: 4-beat gait, lower acceleration amplitude, ~1.5 m/s
 * Trotting: 2-beat symmetrical gait with suspension phase, sharper vertical Z impact, ~3.8 m/s
 * Rider effect: Higher center of mass tilt and damping
 */
function stepEquineSimulation() {
  const activityKey = state.selectedActivityKey || 'walking-natural';
  const classConfig = ACTIVITY_CLASSES[activityKey] || ACTIVITY_CLASSES['walking-natural'];

  const freq = classConfig.baseFrequency;
  const isTrotting = activityKey.startsWith('trotting');
  const hasRider = activityKey.endsWith('rider');

  // Advance time phase
  simState.phase += 2 * Math.PI * freq * (SAMPLE_RATE_MS / 1000);

  // Equine Kinematics Equation
  const t = simState.phase;
  const jitter = () => (Math.random() - 0.5) * 0.15;

  // Vertical acceleration (Z-axis, dominant in equine locomotion)
  // Earth gravity baseline (~9.81 m/s²) plus stride oscillations
  const zAmp = isTrotting ? 5.8 : 2.2;
  const zBias = 9.81;
  const accZ = zBias + zAmp * Math.sin(t) + (isTrotting ? 1.8 * Math.sin(2 * t) : 0) + jitter();

  // Forward/Backward acceleration (Y-axis surge and braking during hoof strike)
  const yAmp = isTrotting ? 3.4 : 1.4;
  const accY = yAmp * Math.sin(t + 0.5) + (hasRider ? 0.3 : 0.0) + jitter();

  // Lateral acceleration (X-axis side-to-side sway)
  const xAmp = isTrotting ? 1.6 : 1.1;
  const accX = xAmp * Math.sin(t * 0.5) + jitter();

  // Gyroscope angular velocity (roll, pitch, yaw in rad/s)
  const gyrAmp = isTrotting ? 1.4 : 0.6;
  const gyrX = (gyrAmp * Math.sin(t + 0.2) + jitter() * 0.2) * (hasRider ? 1.2 : 1.0);
  const gyrY = (gyrAmp * 0.8 * Math.cos(t) + jitter() * 0.2);
  const gyrZ = (gyrAmp * 0.6 * Math.sin(t * 0.5) + jitter() * 0.1);

  // Update live motion buffer
  liveSensors.acc.x = accX;
  liveSensors.acc.y = accY;
  liveSensors.acc.z = accZ;

  liveSensors.gyro.x = gyrX;
  liveSensors.gyro.y = gyrY;
  liveSensors.gyro.z = gyrZ;

  // GPS Movement simulation (gentle forward traversal)
  simState.speed = classConfig.baseSpeed + (Math.sin(t * 0.2) * 0.2);
  const deltaDistance = (simState.speed * (SAMPLE_RATE_MS / 1000));
  const metersPerDegreeLat = 111320;
  simState.lat += deltaDistance / metersPerDegreeLat;
  simState.lon += (deltaDistance * 0.4) / (metersPerDegreeLat * Math.cos(simState.lat * Math.PI / 180));

  liveSensors.gps.latitude = simState.lat;
  liveSensors.gps.longitude = simState.lon;
  liveSensors.gps.altitude = 45.0 + Math.sin(t * 0.05) * 1.5;
  liveSensors.gps.speed = simState.speed;
  liveSensors.gps.accuracy = 2.4;
}

/* ==============================================================================
   10. LIVE SENSOR UI RENDERING
   ============================================================================== */
/**
 * Updates the visual meters and numeric readouts for Accelerometer, Gyroscope & GPS
 */
function updateSensorUI() {
  // If simulation is running even when idle, step it gently so live readouts animate
  if (state.simulationEnabled && !state.isRecording) {
    stepEquineSimulation();
  }

  // --- Accelerometer ---
  updateDeflectionBar(DOM.accXFill, liveSensors.acc.x, MAX_ACC_SCALE);
  updateDeflectionBar(DOM.accYFill, liveSensors.acc.y, MAX_ACC_SCALE);
  updateDeflectionBar(DOM.accZFill, liveSensors.acc.z, MAX_ACC_SCALE);

  DOM.accXVal.textContent = formatNumeric(liveSensors.acc.x, 6);
  DOM.accYVal.textContent = formatNumeric(liveSensors.acc.y, 6);
  DOM.accZVal.textContent = formatNumeric(liveSensors.acc.z, 6);

  // --- Gyroscope ---
  updateDeflectionBar(DOM.gyrXFill, liveSensors.gyro.x, MAX_GYR_SCALE);
  updateDeflectionBar(DOM.gyrYFill, liveSensors.gyro.y, MAX_GYR_SCALE);
  updateDeflectionBar(DOM.gyrZFill, liveSensors.gyro.z, MAX_GYR_SCALE);

  DOM.gyrXVal.textContent = formatNumeric(liveSensors.gyro.x, 6);
  DOM.gyrYVal.textContent = formatNumeric(liveSensors.gyro.y, 6);
  DOM.gyrZVal.textContent = formatNumeric(liveSensors.gyro.z, 6);

  // --- GPS ---
  DOM.gpsLat.textContent = liveSensors.gps.latitude !== null ? liveSensors.gps.latitude.toFixed(6) : '—';
  DOM.gpsLon.textContent = liveSensors.gps.longitude !== null ? liveSensors.gps.longitude.toFixed(6) : '—';
  DOM.gpsAlt.textContent = liveSensors.gps.altitude !== null ? liveSensors.gps.altitude.toFixed(1) : '—';
  DOM.gpsSpd.textContent = liveSensors.gps.speed !== null ? liveSensors.gps.speed.toFixed(2) : '—';
  DOM.gpsAcc.textContent = liveSensors.gps.accuracy !== null ? `±${liveSensors.gps.accuracy.toFixed(1)}` : '—';
}

/**
 * Updates a bi-directional visual deflection meter bar
 * Center is 0 (50%). Negative extends left, positive extends right.
 */
function updateDeflectionBar(element, value, maxScale) {
  if (!element) return;

  if (value === null || value === undefined || isNaN(value)) {
    element.style.width = '0%';
    element.style.left = '50%';
    return;
  }

  // Normalize between -1.0 and +1.0
  const normalized = Math.max(-1.0, Math.min(1.0, value / maxScale));

  if (normalized >= 0) {
    element.style.left = '50%';
    element.style.width = `${normalized * 50}%`;
  } else {
    const width = Math.abs(normalized) * 50;
    element.style.left = `${50 - width}%`;
    element.style.width = `${width}%`;
  }
}

/**
 * Formats a numeric value with leading sign and fixed decimals
 */
function formatNumeric(val, decimals = 6) {
  if (val === null || val === undefined || isNaN(val)) return '0.000000';
  const prefix = val >= 0 ? '+' : '';
  return prefix + val.toFixed(decimals);
}

/**
 * Formats seconds into MM:SS format
 */
function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ==============================================================================
   11. SESSION MANAGEMENT & LOCALSTORAGE
   ============================================================================== */
/**
 * Saves a completed session object to memory and persistent localStorage
 * @param {Object} session
 */
function saveSession(session) {
  state.sessions.unshift(session);
  saveSessionsToStorage();
  renderSessions();
}

/**
 * Persists the sessions list to localStorage with quota error protection
 */
function saveSessionsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
  } catch (error) {
    console.error('Failed to save sessions to localStorage (quota exceeded?):', error);
    showToast('Storage quota warning: consider exporting your dataset');
  }
}

/**
 * Loads previously stored sessions from localStorage on application start
 */
function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.sessions = parsed;
        // Determine highest session counter
        state.sessionCounter = state.sessions.reduce((max, s) => Math.max(max, (s.sessionNumber || 0)), 0) + 1;
      }
    }
  } catch (err) {
    console.warn('Error reading stored sessions:', err);
    state.sessions = [];
  }

  renderSessions();
}

/**
 * Renders the list of completed sessions in the UI
 */
function renderSessions() {
  DOM.sessionCountBadge.textContent = state.sessions.length;

  if (state.sessions.length === 0) {
    DOM.sessionEmptyMessage.style.display = 'block';
    DOM.exportAllBtn.disabled = true;
    DOM.clearAllBtn.disabled = true;
    // Remove existing rendered session cards
    DOM.sessionList.querySelectorAll('.session-item').forEach((item) => item.remove());
    return;
  }

  DOM.sessionEmptyMessage.style.display = 'none';
  DOM.exportAllBtn.disabled = false;
  DOM.clearAllBtn.disabled = false;

  // Clear existing items and rebuild
  DOM.sessionList.querySelectorAll('.session-item').forEach((item) => item.remove());

  state.sessions.forEach((session) => {
    const item = document.createElement('div');
    item.className = 'session-item';

    const classConfig = ACTIVITY_CLASSES[session.activityKey] || {
      color: '#00e5ff',
      label: session.activityLabel || 'Walking Natural'
    };

    item.innerHTML = `
      <div class="session-badge-bar" style="background: ${classConfig.color};"></div>
      <div class="session-meta-wrap">
        <div class="session-title-line">
          <span class="session-id-tag">Session #${session.sessionNumber || 1}</span>
          <span class="session-label-text">${escapeHTML(classConfig.label)}</span>
          <span class="session-internal-key">${escapeHTML(session.activityKey)}</span>
        </div>
        <div class="session-stats-line">
          <span>🕒 ${session.displayTime || '00:00'}</span>
          <span>⏱ ${session.durationFormatted || '00:00'}</span>
          <span>📊 ${session.sampleCount} samples</span>
        </div>
      </div>
      <div class="session-item-actions">
        <button type="button" class="btn-item-export" data-id="${session.id}" title="Export this session as CSV">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>CSV</span>
        </button>
        <button type="button" class="btn-item-del" data-id="${session.id}" title="Delete this session">
          ✕
        </button>
      </div>
    `;

    // Bind individual session export button
    const exportBtn = item.querySelector('.btn-item-export');
    exportBtn.addEventListener('click', () => {
      const filename = `horse_session_${session.sessionNumber}_${session.activityKey}_${Date.now()}.csv`;
      exportCSV([session], filename);
    });

    // Bind delete button
    const delBtn = item.querySelector('.btn-item-del');
    delBtn.addEventListener('click', () => {
      deleteSession(session.id);
    });

    DOM.sessionList.appendChild(item);
  });
}

/**
 * Removes a single session by unique id
 */
function deleteSession(sessionId) {
  state.sessions = state.sessions.filter((s) => s.id !== sessionId);
  saveSessionsToStorage();
  renderSessions();
  showToast('Session removed');
}

/* ==============================================================================
   12. CSV EXPORT ENGINE
   ============================================================================== */
/**
 * Generates and downloads a standardized CSV file for horse gait research
 * Exact Column Structure:
 * session_id,timestamp,activity,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,latitude,longitude,altitude,speed,accuracy
 *
 * @param {Array<Object>} sessionsList - Sessions to export
 * @param {string} filename - Target download file name
 */
function exportCSV(sessionsList, filename) {
  if (!sessionsList || sessionsList.length === 0) {
    showToast('No session data available to export');
    return;
  }

  // Gather all samples across selected sessions
  const allSamples = [];
  sessionsList.forEach((session) => {
    if (session.samples && Array.isArray(session.samples)) {
      session.samples.forEach((sample) => {
        allSamples.push({
          ...sample,
          session_id: session.sessionNumber || sample.session_id || 1
        });
      });
    }
  });

  if (allSamples.length === 0) {
    showToast('Sessions contain 0 samples');
    return;
  }

  // Define exact CSV header as mandated by dataset specifications
  const csvHeaders = [
    'session_id',
    'timestamp',
    'activity',
    'acc_x',
    'acc_y',
    'acc_z',
    'gyro_x',
    'gyro_y',
    'gyro_z',
    'latitude',
    'longitude',
    'altitude',
    'speed',
    'accuracy'
  ];

  // Helper to format float values or empty string
  const fmt = (val, dec = 6) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return Number(val).toFixed(dec);
  };

  // Build CSV rows
  const csvRows = [csvHeaders.join(',')];

  allSamples.forEach((row) => {
    const rowValues = [
      row.session_id,
      row.timestamp || '',
      row.activity || '', // Exactly walking-natural, walking-rider, trotting-natural, trotting-rider
      fmt(row.acc_x, 6),
      fmt(row.acc_y, 6),
      fmt(row.acc_z, 6),
      fmt(row.gyro_x, 6),
      fmt(row.gyro_y, 6),
      fmt(row.gyro_z, 6),
      fmt(row.latitude, 6),
      fmt(row.longitude, 6),
      fmt(row.altitude, 1),
      fmt(row.speed, 2),
      fmt(row.accuracy, 1)
    ];
    csvRows.push(rowValues.join(','));
  });

  const csvContent = csvRows.join('\r\n');

  // Trigger browser download via Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  downloadLink.setAttribute('href', url);
  downloadLink.setAttribute('download', filename);
  downloadLink.style.display = 'none';

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Revoke object URL after delay
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  showToast(`Exported ${allSamples.length} rows to ${filename}`);
}

/* ==============================================================================
   13. UTILITIES & TOAST FEEDBACK
   ============================================================================== */
let toastTimeoutId = null;

/**
 * Display a non-blocking toast message
 * @param {string} message
 */
function showToast(message) {
  if (!DOM.toast) return;

  DOM.toast.textContent = message;
  DOM.toast.classList.add('show');

  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 3200);
}

/**
 * HTML escaper to protect against injection
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Expose core research API functions to window for interactive testing or extension
window.HorseSensorLog = {
  startRecording,
  endRecording,
  selectActivity,
  collectSensorData,
  updateSensorUI,
  saveSession,
  loadSessions,
  exportCSV,
  enableSimulation,
  getState: () => ({ ...state })
};
