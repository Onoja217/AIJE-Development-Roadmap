# 🏢🧠 Enterprise CCTV AI System — Alert Engine (Frontend)

A real-time AI-powered CCTV monitoring frontend designed for enterprise-grade security dashboards.

This system processes AI-generated sensor events and converts them into:
- Live security alerts 🚨
- Risk scoring intelligence 🧠
- Multi-camera monitoring 📹
- Offline + online hybrid tracking 🌐
- Cloud logging (Firebase-ready) ☁️

---

# 🚀 SYSTEM OVERVIEW

The Alert Engine is the **frontend intelligence layer** of a larger CCTV AI platform.

It receives structured AI events from:
- Object detection models (YOLO)
- Motion sensors
- Camera analytics systems
- WebSocket streaming servers

Then it transforms them into real-time security insights.

---

# 🧠 CORE FEATURES

## ⚡ Real-Time AI Alert Processing
- Live event ingestion
- Instant UI updates
- Streaming-ready architecture

## 🧠 AI Risk Scoring Engine
- Converts sensor inputs into a 0–100 risk score
- Night-time risk amplification
- Pattern-based anomaly detection

## 🔐 Smart Rule Engine
- Filters normal movement
- Detects repeated suspicious activity
- Identifies high-risk anomalies

## 📡 Offline + Online Mode
- Works without internet (offline mode)
- Syncs automatically when online
- Prevents data loss using local buffering

## ☁️ Cloud Integration
- Firebase Firestore logging
- Real-time multi-device sync
- Scalable event storage

## 🔊 Alert System
- Browser notifications
- Audio alerts for critical events
- Severity-based UI highlighting

## 🧾 Anti-Spam Protection
- Duplicate alert cooldown system
- Event deduplication engine

---

# 🏗️ ARCHITECTURE

```txt
AI Sensors / Detection Models
        ↓
AlertFeed Engine (Frontend)
        ↓
Risk Scoring + Rule Engine
        ↓
Firebase / Cloud Storage
        ↓
Real-time Dashboard UI
```
```
src/
 └── components/
      └── AlertFeed.tsx   (MAIN ENGINE)
```
HOW IT WORKS
1. Sensor Input

The system receives structured AI sensor data:
```
SensorData 
  motion: "alert" | "normal",
  vibration: "alert" | "normal",
  access: "alert" | "normal",
  movement: "alert" | "normal",
  cameras: "warning" | "normal"
```
2. AI Risk Scoring

The system calculates a dynamic risk score:

Motion detection increases score
Vibration events increase risk
Access violations raise severity
Night-time amplifies risk levels
Historical patterns influence anomalies

3. Rule Engine

Alerts are triggered when:

Motion is detected at night
Repeated suspicious activity occurs
Risk score exceeds threshold (>70)
Anomalous behavior patterns are detected

4. Alert Generation

Each alert contains:

Unique ID
Camera zone
Timestamp
Severity level
Risk score
Event message

5. Data Persistence

Alerts are stored in Firebase:
```
collection(db, "alerts")
```

Each record includes:

Full alert metadata
Server timestamp
Severity classification
🚨 SEVERITY SYSTEM
Level	Meaning	Color
INFO	Low activity	Blue
WARNING	Suspicious	Yellow
DANGER	Critical event	Red
🔊 ALERT BEHAVIOR
🔴 DANGER → sound + notification + UI highlight
🟡 WARNING → UI alert only
🔵 INFO → passive logging
📴 OFFLINE MODE

When offline:

Alerts still generated locally
Stored in memory/local buffer
No Firebase dependency required
Auto-syncs when connection returns
🌐 ONLINE MODE

When online:

Real-time Firestore sync
Multi-device dashboard updates
Centralized event tracking
🧠 AI INTELLIGENCE LAYER

The system includes:

Moving average anomaly detection
Pattern recognition memory
Time-based risk adjustment
Spike detection engine
🔥 USE CASES
Smart building security systems
Industrial monitoring dashboards
Campus surveillance systems
Retail security analytics
Research AI CCTV prototypes
⚠️ IMPORTANT NOTE

This system is intended for:

Educational purposes
Authorized surveillance environments
Smart infrastructure monitoring
AI research and development

It must be used in compliance with local privacy and security laws.

🚀 FUTURE UPGRADES

This frontend is designed to integrate with:

🧠 AI Backend
YOLOv8 object detection
Face recognition system
Behavior prediction models
📹 Video Streaming Layer
RTSP camera feeds
MediaMTX integration
Multi-camera synchronization
📼 Replay System
Incident timeline playback
Event-based forensic analysis
☁️ Scalable Backend
WebSocket event streaming
Kafka / message queue pipelines
Kubernetes deployment
📌 STATUS

✔ Production-grade frontend architecture
✔ Real-time AI alert system
✔ Offline + online hybrid mode
✔ Cloud sync ready
✔ Multi-camera compatible

🏢 SUMMARY

This is a production-ready enterprise CCTV AI alert engine frontend designed to act as the intelligence layer of a full surveillance platform.

It is modular, scalable, and ready to connect to real AI detection systems and cloud infrastructure.