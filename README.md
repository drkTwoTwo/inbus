# inbus

A peer-to-peer parcel delivery prototype built on existing intercity bus routes in hill regions.

Sending a parcel between hill towns normally takes 3+ days by courier. Buses already run those routes daily with empty luggage space. In **inbus**, a sender meets the conductor in person at a bus stop, the parcel rides the bus, and the receiver meets the conductor at another stop to collect it — same day, no courier, no shop in the loop.

## Demo

<video src="https://raw.githubusercontent.com/drkTwoTwo/inbus/main/docs/demo.webm" controls muted playsinline width="100%"></video>

Booking a parcel between two stops, tracking it live, and the conductor collecting/releasing it — end to end, on the real app. If the player above doesn't load, [watch the clip directly](./docs/demo.webm).

## How it works

- **Book**: pick any two bus stops on a route (not just town endpoints — any intermediate stop too), see the buses running that route with price and duration, choose one, pay now or pay at pickup.
- **Hand off**: the sender meets the conductor at the origin stop in person. The conductor scans the parcel aboard.
- **Track**: a live tracking screen animates the bus along an SVG route, with a real-time countdown ETA and a custody trail.
- **Collect**: the receiver meets the conductor at the destination stop and reads out a 4-digit OTP to release the parcel.
- **Missed pickup**: if the receiver isn't at the stop, the parcel doesn't get stuck — it stays on the bus, and the conductor retries the drop (next run, or a different bus covering the same stop), with a return fee added.
- **Offline**: the conductor's scans still work with no signal — they queue locally and sync once back online.

Two roles, one app: **Sender** and **Conductor**, switchable from the header.

## What's real vs. simulated

| Real | Simulated |
|---|---|
| Parcel state machine (`BOOKED → IN_TRANSIT → COLLECTED`) | Bus GPS position (animated along a hand-drawn SVG path, not a map) |
| Custody logging, timestamped per transition | Payment gateway ("Pay now" is a mock screen) |
| QR code generation (real, scannable) | SMS delivery of the OTP |
| OTP verification | |
| Offline scan queueing + sync | |

## Stack

React 19 + Vite + Tailwind CSS v4, `qrcode.react` for QR codes. All state lives in memory (React state) — no backend, no database, no auth, no `localStorage`.

## Getting started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Deploy

This is a static Vite SPA — Vercel's zero-config detection handles it out of the box. Connect the repo at [vercel.com/new](https://vercel.com/new), or from the CLI:

```bash
npx vercel
```

No environment variables are needed.
