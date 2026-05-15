# ARGUS.AI

### Panoptic Surveillance & Intelligent Crisis Response System

> "Turning Chaos into Order."
> An AI-powered command center that synthesizes unstructured real-time data (Social Media, Voice Calls) into actionable intelligence for emergency response.

---

#Architecture 
<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/ba37a55b-4432-46c2-807e-be42e2b15cbe" />


## The Problem

In the critical moments following a disaster (fire, riot, flood), control rooms are overwhelmed with noise.

* **Information Overload:** Thousands of social media posts and panic calls.
* **Unstructured Data:** Images, voice recordings, and text are hard to map.
* **Slow Response:** Manual verification takes too long.

## The Solution

**ARGUS.AI** acts as the central nervous system for city safety. It uses **Google Gemini Multimodal AI** to instantly analyze incoming media, extract geolocation and severity, and visualize it on a real-time map for immediate dispatch.

---

## Key Features

### 1. Live Command Dashboard

* **Real-time Visualization:** Incidents appear instantly on a Leaflet map via WebSockets.
* **Asset Tracking:** Live tracking of Police, Fire, and Medical units.
* **Smart Dispatch:** "Deploy" button calculates distances and assigns the nearest available unit visually.

### 2. Multimodal AI Analysis (Powered by Gemini)

* **Forensic Breakdown:** AI analyzes images and text to identify evidence (e.g., "Visual match: Smoke plume", "Acoustics: Screams").
* **Auto-Geolocation:** Extracts address and coordinates from vague user descriptions.
* **Severity Scoring:** Automatically rates incidents from 1-10 to prioritize response.

### 3. Crowd-Sourced Intelligence Simulators

* **Social Feed Simulator:** A "Twitter-like" interface to inject mock citizen reports (Text + Images) into the system.
* **Emergency Helpline Simulator:** Uses the **Web Speech API** to record voice distress calls, transcribing and analyzing them in real-time.

### 4. Public Advisory System

* **AI-Drafted Alerts:** The dashboard operator can generate authoritative, context-aware public warnings for specific incidents with one click.
* **Instant Broadcast:** Advisories are immediately pushed to the public social feed.

### 5. Secure Architecture

* **Backend-for-Frontend (BFF):** AI keys are secured on the server. Client-side media processing ensures speed without compromising security.

---

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Leaflet Maps, Lucide Icons.
* **Backend:** Node.js, Express.
* **Database:** MongoDB (Atlas).
* **Real-Time:** Socket.io.
* **Artificial Intelligence:** Google Gemini 1.5 Flash (via @google/genai SDK).

---

## Installation & Setup

### Prerequisites

* Node.js (v18+)
* MongoDB Atlas Connection String
* Google Gemini API Key

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/argus-ai.git
cd argus-ai

```
