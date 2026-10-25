# HORSE SENSOR LOG
### Equine Gait & Activity Sensor Data Collection System

A research-grade web interface for recording, labeling, and exporting multi-modal equine sensor data (Accelerometer, Gyroscope, GPS). Inspired by the UX and interaction workflow of SensorLog, tailored specifically for horse movement classification.

---

## 📋 Project Purpose & Activity Classes

The interface is engineered to collect movement data across **four standardized activity classes**. The human-readable labels and exact internal dataset representations are:

| # | UI Display Label | Internal Dataset Key (CSV) | Description |
|---|---|---|---|
| 1 | **Walking Natural** | `walking-natural` | 4-beat walking gait without rider |
| 2 | **Walking Rider** | `walking-rider` | 4-beat walking gait mounted with rider |
| 3 | **Trotting Natural** | `trotting-natural` | 2-beat diagonal trotting gait without rider |
| 4 | **Trotting Rider** | `trotting-rider` | 2-beat diagonal trotting gait mounted with rider |

---

## 🚀 How to Run

The application is completely self-contained with pure modern HTML5, CSS3, and ES6+ JavaScript. No build step or backend required.

### Option 1: Direct File Access
Simply double-click [`index.html`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/index.html) or open it directly in any modern web browser (Google Chrome, Firefox, Microsoft Edge, Safari).

### Option 2: Local HTTP Server
If serving locally on your network or testing on a mobile device on the same Wi-Fi:
```bash
# Using Node.js
npx serve .

# Or using Python (if available)
python -m http.server 8000
```

> **Note on Mobile & Sensor Access:** Modern mobile browsers require HTTPS or `localhost` to access `DeviceMotionEvent` and Geolocation APIs. When testing on an iPhone or Android phone, host over HTTPS or use Chrome remote debugging / port forwarding.

---

## 🎯 Key UX & Workflow Features

### 1. Dual Control State Architecture (START & END)
- **Separate START and END controls**: START initiates data collection; END terminates, freezes the timer, and packages the session.
- **Safety Interlocks**:
  - START cannot be pressed until an activity class is explicitly selected.
  - While recording, START is disabled and END is highlighted.
  - After pressing END, the session is saved and UI resets to ready.
  - A browser `beforeunload` warning prevents accidental page refresh or loss of recorded data.

### 2. Large Real-Time Metrics
- **Digital Timer**: Displays elapsed time in `MM:SS` format, updating in real time and freezing upon session termination.
- **Sample Counter**: Dynamically tracks accumulated samples at 20 Hz (e.g., `0 SAMPLES` → `128 SAMPLES`).
- **Clear Recording Status**: Distinct pulsing indicator and banner showing `● RECORDING` and active gait class.

### 3. Live Sensor Telemetry
- **Accelerometer (m/s²)**: Live 3-axis $(X, Y, Z)$ values formatted to 6 decimal places with bi-directional deflection visual meters.
- **Gyroscope (rad/s)**: Live angular velocity $(X, Y, Z)$ converted to research-standard radians per second.
- **GPS Location**: Real-time Latitude, Longitude, Altitude (m), Speed (m/s), and Accuracy (m).
- **Graceful Sensor Handling**: Non-breaking warnings if sensors are not accessible on the host machine.
- **Demo Simulation Mode**: Includes a toggleable biomechanical equine physics generator, allowing students and researchers to demonstrate live data collection, realistic waveforms, and export functionality on laptops or desktops without physical sensor hardware.

### 4. Session History & LocalStorage Persistence
- Completed sessions are automatically stored in `localStorage` (`horse_sensor_log_sessions_v1`) so page refreshes never wipe collected data.
- Displays Session number, gait class, duration, timestamp, and sample count.
- Includes single-session deletion and single-session CSV export.

### 5. Research CSV Dataset Export
Clicking **EXPORT ALL** generates a downloadable CSV containing all collected samples across sessions.

#### Standardized CSV Columns:
```csv
session_id,timestamp,activity,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,latitude,longitude,altitude,speed,accuracy
```

**Example Output Row:**
```csv
1,2026-10-25T19:54:25.120Z,walking-natural,-0.124500,0.852100,9.941200,0.015200,-0.042100,0.011800,51.507421,-0.127815,45.2,1.52,2.4
```

---

## 📁 File Structure

- [`index.html`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/index.html): Semantic layout, header, 4 activity buttons, start/end controls, live sensor cards, session history.
- [`style.css`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/style.css): Professional dark-mode theme, responsive grid/flexbox, sensor accent color scheme, and typography.
- [`app.js`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/app.js): Modular, clean JavaScript architecture with designated functions.
- [`test_suite.js`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/test_suite.js): Automated Node.js integration verification suite testing states, data collection, and CSV export.

---

## 🛠 Modular JavaScript Functions

The code in [`app.js`](file:///c:/Users/shahd%20mohamed/Downloads/project%20(1)/app.js) is structured into clear functions:

- `selectActivity(activityKey)`: Handles label selection and enables the START button.
- `startRecording()`: Initializes session buffers, timer interval, and 20 Hz collection cycle.
- `endRecording()`: Stops intervals, formats session metadata, commits to storage, and resets UI.
- `collectSensorData()`: Captures real-time sensor snapshot and creates standardized sample row.
- `updateSensorUI()`: Updates deflection bars and numeric values for live sensors.
- `saveSession(session)`: Saves session to state and localStorage.
- `loadSessions()`: Restores sessions from localStorage on application launch.
- `exportCSV(sessions, filename)`: Formats and downloads standardized research CSV file.
- `enableSimulation(boolean)`: Toggles equine biomechanics simulation for laptop demonstrations.
