# Project Submission pack (NASA Space Apps 2026)

Everything in this file is written in English because the form, the README and the slides must be.
The rules below are **as quoted from the Project Submission Guide by the team**; I could not open the guide myself (it needs a
login). Re-check each one on the portal before submitting.

## 1. Hard rules (quoted by the team)

| Rule | What to do |
|---|---|
| Deadline: **Sunday 15 November, 23:59 Tashkent time (UTC+5)** for "Submit for Judging"; edits and re-submission allowed until then | Submit early, then improve. Ask the volunteers when local judging starts: it may be earlier on Sunday |
| Everything in **English**: portal form, GitHub README, slides | README and docs are English only (checked). A video in another language needs English subtitles |
| Demo = a video of **at most 30 s** (31 s disqualifies from Global Judging) **or** a presentation of **at most 7 slides** including title and final slide (8 disqualifies) | Plan: 7 slides, exported as PDF or Google Slides, "anyone with the link can view", no login. Do not exceed 7 |
| **No NASA logos, flags or insignia** in the project, slides or repository | Audited: no image files are tracked in the repository, the app has no logo, the header uses a generic orbit icon. Keep it that way in the slides (use text "NASA data", not the worm or meatball) |
| Acknowledge AI / SI generation in the descriptive text and metadata | README section "Use of AI (SI) disclosure", `package.json` description, `Co-Authored-By: Claude` trailers in `git log`. Say the same in the form |
| NASA data must be listed for the Global Award | README section "NASA data and other references" |

## 2. Form fields (paste-ready)

**Project Name**
Astronaut Health Monitor

**High-Level Project Summary**
Astronaut Health Monitor is a Mission Control style dashboard that lets a four-person crew see, forecast and act on the state of their health when the ground is far away. It combines real physiological recordings (PhysioNet), real solar flares (NASA DONKI), live space weather (NOAA GOES) and cabin and radiation limits taken from NASA-STD-3001 and related NASA documents, and every number says whether it is recorded, modelled or an engineering choice. A Time-to-Threshold forecast warns before a limit is crossed, and the app keeps working with a browser-side simulation when the connection is lost.

**Link to Project Demo**
`<public link to the 7-slide PDF or Google Slides, view access without login>`

**Link to Final Project**
https://github.com/Akhmadov-360/nasa-hackaton-2026

**Hosted demo** (web only, runs in the browser simulation; the live server and NOAA feed need the local API)
https://astronaut-health-monitor-one.vercel.app

**Detailed Project Description**
Adapt sections 1 to 5 of the README. In short:
- *Problem*: on long missions the crew must spot health changes in themselves, and ground support is delayed (about 1.3 s to the Moon, roughly 3 to 22 minutes one way to Mars). The tool must explain its readings and keep working offline.
- *What it does today*: body scan with clickable organs, ECG and vitals from real recordings, cabin metrics (O₂, CO₂, humidity, noise, airflow), radiation (modelled crew dose plus live GOES proton flux), colour-coded status with icon and word, a Time-to-Threshold forecast in the status island and on each card, hold-to-confirm scenario controls, a prioritised flight log with pinned alarms, Time Travel replay (cards and sparklines follow the cursor), a medical report with a limits-and-sources table, and export to Excel and a validated telemetry package. Beyond the monitor: an *About* window for every indicator (why it matters, what spaceflight does to it, how it is measured, when to seek help, with the NASA HRP hazards and risks, a trend chart with limit bands); a self-check of glucose, sleep, mood and water entered by the astronaut (editable, with routine check-in reminders); a mission-context selector (station, Gateway, Moon base, Mars transit, Mars base) that changes the signal delay and the ground-contact advice; a legend of the five hazards; English, Russian and an Uzbek draft.
- *How it is built*: a deterministic engine `frame(t) = baseline(t) + modifiers(t)` that runs identically on the server and in the browser, Zod-validated contracts, and the source modes `LIVE → POLL → STALE → SIM` for operation without a network.
- *How it maps to the five NASA HRP hazards*: radiation (dose model and GOES), closed environment (cabin metrics), distance from Earth (offline operation and forecasts), gravity (an in-flight exercise load model; bone and muscle indicators are not modelled yet), isolation and confinement (a self-check of sleep and mood, and of glucose and water, entered by the crew member, with routine reminders).
- *Honesty*: each limit carries a tier (`nasa`, `derived`, `clinical`, `engineering`, `provisional`) and a source; the scenario responses are assumptions and are labelled as such.
- *Guidance*: a short "do now" first action for any out-of-range reading, in the pinned alarms and the body-scan organ popover, plus a *Ground* line that depends on the mission context (illustrative, not validated by flight surgeons).
- *Self-check*: the crew member enters glucose, sleep, mood and water drunk; the values become events in the same log as the scenarios, are judged against limits with a stated basis, and appear in the flight log, the report, the exports and Time Travel.
- *Update this paragraph as features land.* Only describe what runs. Not built: bone and muscle models, camera input, a streak counter, a reviewed Uzbek translation.

**Use of Super Intelligence (SI)**
Most of the code, tests, translations and documentation were written by an AI coding assistant (Anthropic Claude, through Claude Code) following requirements, design decisions and reviews given by the team. The team chose the problem framing, the data sources and the rule that every limit must cite its origin, directed each feature, ran and reviewed the application, and decided what to ship. Where a scientific source could not be read in full, the limit is labelled with a weaker tier instead of being presented as a NASA value. AI assistance is also recorded in the README, in `package.json` and in the commit trailers.

**NASA Data**
- NASA DONKI: 12 real solar flares of May 2024 (largest X8.7) used to scale the radiation scenario.
- NASA-STD-3001 Vol 1 and 2 through the OCHMO technical briefs, and the NASA Human Integration Design Handbook (NASA/SP-2010-3407): limits for CO₂, cabin O₂, humidity, noise, drinking water and the 250 mSv solar particle event limit.
- NASA Technical Reports Server papers (Perry et al., Allen, Downs et al.): ISS cabin design table, acoustic requirements, in-flight exercise intensity.
- NASA Human Research Program: the five hazards of human spaceflight and the risk pages.

**Space Agency Partner Data and Other References**
- Canadian Space Agency, "Monitoring Radiation for Astronaut Health" (context for radiation monitoring).
- NOAA SWPC GOES: live integral proton flux (>= 10 MeV and >= 100 MeV).
- PhysioNet: MIT-BIH Arrhythmia Database and BIDMC PPG and Respiration Dataset.
- ADA Standards of Care 2026, AHA, BTS and NICE: clinical limits (read from public summaries).

## 3. The 7 slides (7 maximum, title and final slide included)

| # | Slide | Content |
|---|---|---|
| 1 | Title | Name, one-line promise ("see it, forecast it, act on it, even when the ground is far away"), team name, links. No NASA logo |
| 2 | Why | Long missions: the crew must self-assess; delay to Moon about 1.3 s, to Mars 3 to 22 min; the five HRP hazards as small icons |
| 3 | What you see | Full-dashboard screenshot: body scan, ECG, vitals, cabin tab, island, control deck, the Self-check tab and the header chips |
| 4 | Before it happens and what to do | Island forecast and card capsule screenshots; pinned alarm with the "do now" and *Ground* lines, once at the station and once at Mars; the *About* window with the trend chart and limit bands |
| 5 | Every number states its source | The tier table (`nasa`, `derived`, `clinical`, `engineering`, `provisional`) with 5 to 6 rows, and the NASA data list |
| 6 | It keeps working | Architecture sketch: deterministic engine, API, browser, `LIVE → POLL → STALE → SIM`; replay and Excel report screenshots |
| 7 | Honest limits, team, AI | What is modelled and what is entered by hand, what is next (bone and muscle, a reviewed Uzbek translation), team name and members, repository link, hosted demo link, AI-use statement |

Screenshots: `pnpm smoke -- --url http://localhost:3100 --size 1920x1080 --shots shots` writes one per step.

## 4. Alternative: a demo video of at most 30 seconds

Only if the slides are not used. Total under 30 s, English captions on screen:
0 to 4 s title and problem line; 4 to 9 s body scan hover; 9 to 15 s hold *O₂ supply fault* and the island forecast counting down; 15 to 20 s warning, voice, pinned alarm; 20 to 24 s Radiation tab with the DONKI flare and the live GOES chart; 24 to 28 s Time Travel replay and the Excel export; 28 to 30 s repository link. Check the exported file length is 30 s or less.

## 5. Final checklist before pressing "Submit for Judging"

- [ ] The repository is public, the README renders, the latest `main` is pushed.
- [ ] Slide link opens in a private window without login; slide count is 7 or fewer; no NASA logo anywhere.
- [ ] Form fields above pasted and updated to match what actually runs.
- [ ] AI disclosure present in the form and the README.
- [ ] Submitted before 23:59 on 15 November (UTC+5); a re-submission after edits is still before the deadline.
