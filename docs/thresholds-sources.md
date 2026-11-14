# Threshold sources: what NASA-STD-3001 says and what it does not

Checked 2026-11-11. The numbers below were read from the text of the NASA documents, not from memory.
Method: the PDFs were downloaded from nasa.gov / standards.nasa.gov, converted to text locally and searched.
NASA's OCHMO technical briefs are *derived from* the standard and say they are "for reference only"; the standard itself
and the program requirements are authoritative. Re-verify against the current revision before any real use.

## Tier A: numbers that come from NASA-STD-3001

| Metric | Value | Where it comes from |
|---|---|---|
| Cabin CO₂ | Average **1-hour** CO₂ partial pressure in the habitable volume **no more than 3 mmHg** | [V2 6004], NASA-STD-3001 Vol 2 (brief says Rev D). Earlier requirement allowed 3.8 to 7.5 mmHg and was lowered. OCHMO-TB-004 Rev D, 10-Mar-26 |
| CO₂ symptoms (anecdotal, not limits) | Headaches 2.8 to 4.5 mmHg; fatigue, malaise, nausea above 4.5 mmHg; 5th cranial nerve dysesthesia 4.5 to 5.0 mmHg | OCHMO-TB-004 Rev D, "Key Historical CO₂ Concentrations" |
| Career radiation | Total career effective dose **less than 600 mSv** | [V1 4030], Vol 1 Rev B (brief cites it; Rev C is current). OCHMO-TB-020 Rev E, 12/27/2022 |
| Solar particle event | Protect crew to **less than 250 mSv effective dose** from the design-reference SPE (sum of the October 1989 events) | [V1 4031], same brief |
| Typical background | About **0.5 mSv/day** (surface-mission analysis in the brief) | OCHMO-TB-020 Rev E. Our model's background of 20 µSv/h is about 0.48 mSv/day |
| Radiation alerting | The system must alert the crew when radiation is *expected to exceed acceptable levels*. **No numeric trigger is given** | [V2 6100] (Vol 2 Rev C), same brief |
| Total cabin pressure | Between 34.5 kPa and 103 kPa (5.0 to 15.0 psia) | [V2 6006] (Vol 2 Rev D), OCHMO-TB-003 Rev A, 11/30/2023 |
| Inert diluent | At least 30 % diluent gas (balance oxygen) | [V2 6002], same brief |
| Normoxia | Inspired O₂ partial pressure **149 mmHg** (about 21 % O₂ at 14.7 psia, typical ISS cabin) | OCHMO-TB-003 Rev A |
| Hypoxia (arterial, not cabin) | Subtle decrements near PaO₂ 80 mmHg; loss of consciousness near 30 mmHg | OCHMO-TB-003 Rev A, citing Barrett et al., Principles of Spaceflight Medicine |

| Cabin temperature / humidity, crew health | **18 to 27 °C** and **25 to 75 % RH** | [V2 6012], OCHMO ECLSS technical brief |
| Cabin temperature / humidity, comfort zone | 20 to 25 °C and 30 to 60 % RH | [V2 6013], same brief |
| Drinking water | Minimum **2.5 L/crewmember/day** (direct use and food rehydration), plus 0.24 L per EVA hour | [V2 6109], OCHMO water brief (Vol 2 Rev C Table 4) |
| Suited hydration | LEA suit at least 2 L per 24 h; EVA suit at least 240 mL per hour | [V2 11029], [V2 11030] |
| Continuous noise, work areas | **NC-50** curve (50 dB at 1.5 kHz) | [V2 6078], OCHMO acoustics brief |
| Continuous noise, crew sleep (missions over 30 days) | **NC-40** curve | [V2 6079], same brief |
| Hazardous noise | Below 85 dBA regardless of duration (off-nominal); impulse below 140 dB peak | [V2 6077], [V2 6083] |
| Atmosphere alerting | Crew must be alerted on pressure, humidity, temperature, ppO₂, ppCO₂ outside safe limits; **no numbers** | [V2 6022] |

CORRECTION (2026-11-11, later): the airflow range **0.05 to 0.2 m/s is real**, but it is an ISS design parameter, not a
NASA-STD-3001 requirement (see "ISS and Handbook sources" below). NC-52 is also real: it is the Orion continuous-noise
requirement; NC-50 is the ISS US-module requirement. Daily hydration
of 2.0 L (3.0 L EVA) does not match the briefs: the minimum is 2.5 L/day. The 1.8 L consumed value of a "Hydration" card
would need a measured or modelled intake signal that we do not have, so that card is not built.

Sources:
- https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
- https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf
- https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf

## ISS and Handbook sources (NTRS, read 2026-11-11)

| Topic | Value | Source |
|---|---|---|
| ISS cabin design parameters at 101.3 kPa | Total pressure 97.9-102.7 kPa; CO₂ 0.7-1 kPa (about 5-7.5 mmHg, our conversion); O₂ 19.5-23.1 kPa; **RH 25-70 %**; temperature 17.8-26.7 °C; **ventilation 0.05-0.2 m/s**; particulates under 0.05 mg/m³ | Perry et al., ISS cabin atmosphere design table, NTRS 20120015343 (Table 1) |
| Note | The older ISS CO₂ design range (5-7.5 mmHg) is far above today's 3 mmHg standard [V2 6004]. Do not mix them | same |
| Hypoxia effects by ppO₂ | 160 mmHg normal; 137 accepted limit of alertness, loss of night vision; 114 performance seriously impaired; 100 coordination impaired, memory loss; 84 eventual irreversible unconsciousness; 0-46 anoxia, death in 90-180 s | Human Integration Design Handbook (NASA/SP-2010-3407 Rev 1) Table 6.2-4. The section is flagged "under evaluation" by NASA |
| ppO₂ limits | Below 126 mmHg (2.50 psia) prevents hypoxia limit; comfortable range 139-178 mmHg; OSHA entry minimum 19.5 % = 148 mmHg; Shuttle donned masks below 121 mmHg | same, 6.2.2.2.3 |
| Alveolar O₂ | PAO₂ = FiO₂(Pb-47) - PCO₂(FiO₂ + (1-FiO₂)/0.85). Degradation of novel tasks from about 85 to 69 mmHg alveolar; consciousness affected near 35 mmHg | same |
| Noise requirements | ISS US modules NC-50 (plus NC-48 for payloads, about NC-52 together); crew quarters NC-40; Orion NC-52 (vehicle incl. payloads); Apollo LM measured 70-82 dBA; Shuttle 68 dBA mid-deck | Allen, ACOUSTICS 2017, NTRS 20170008857 |
| Exercise intensity on ISS | Average in-flight exercise at 66 % (flight day 14) to 75 % (day 105) of peak heart rate; 82 to 158 min/week; prescription: above 75 % peak HR | Downs et al., NTRS 20140003747 (ACSM abstract). Absolute bpm not given |
| Space weather input | GOES integral proton flux (>=1, 5, 10, 30, 50, 100 MeV), 5-minute data, JSON, no key: https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json (also 3-day, 7-day) | NOAA SWPC. Converting flux to dose is a modelling step (OLTARIS or similar), not a published table |

What this changes in our thresholds:
- **Cabin O₂** is now genuinely derived: 19.5 / 18 / 16 % map to 148 / 137 / 122 mmHg, matching the OSHA minimum, the Handbook's "limit of alertness" row and the Shuttle mask-donning value. The O₂-fault scenario ends at 15 % (114 mmHg), the Handbook's "performance seriously impaired" row.
- **Humidity** warning 25 / 75 % is [V2 6012]. The ISS design range is 25-70 %.
- **Airflow** (0.05-0.2 m/s) can be added as a metric with tier `derived` (ISS design range, not a NASA-STD requirement).
- **Exertion** HR can be anchored to "% of peak HR" rather than invented bpm; absolute values stay ours.
- SpO₂ during hypoxia has **no** NASA table in these sources: the 85 % floor stays our assumption.

## Applied later the same day

- **Airflow** card (tier derived): warning at the ISS design range 0.05 / 0.2 m/s (Perry et al.); caution 0.07 / 0.18 and critical 0.03 / 0.3 are ours.
- **Live space weather**: the API serves `/spaceweather` (cached 60 s, last good copy kept when NOAA is unreachable) from the NOAA SWPC GOES integral
  proton JSON. The radiation card shows the >= 10 MeV flux, the NOAA S-scale (S1 at 10 pfu, one step per decade) and 24 h of data.
  It is a real measurement at Earth orbit and is **not** fed into the crew's modelled dose.
- **Exertion HR** is now `targetFracPeak` (0.66, the ISS in-flight average of Downs et al.) x `peakHrBpm` (180, our assumption). `hrAdd` remains only as a fallback.
  Note: 66 % of an assumed peak reads CAUTION on the resting-range HR thresholds, so the thresholds describe rest, not exercise.
- **HR and blood pressure** are tier `clinical` (AHA / 2017 ACC-AHA categories via heart.org, secondary reading of the public pages, not the guideline documents).
  SpO₂, respiration, temperature, HRV and stress stay `provisional`. The 85 % SpO₂ floor of the O₂ fault is our assumption.

## Tier B: what NASA-STD-3001 Vol 1 Rev C does not give

The text of Vol 1 Rev C (87 pages) was searched for heart rate, blood pressure, SpO₂/saturation, respiration, body temperature,
hypoxia and bpm. It contains **no numeric operating limits** for them (only general requirements and training mentions).
The same is true for the technical briefs above. Operational vital-sign limits are set by flight surgeons and are not
published in these documents. Nothing in NASA-STD-3001 defines limits for HRV, stress or EEG either.

So for **HR, BP, SpO₂, respiration rate, temperature, HRV, stress and EEG** the thresholds in this project cannot be
"NASA-STD-3001 values". They have to be labelled as clinical reference ranges (with a primary source chosen by the team)
or as internal indices.

## Tier C: clinical reference values found (secondary sources only, NOT yet verified against a primary source)

| Metric | Commonly cited | Note |
|---|---|---|
| Resting heart rate | 60 to 100 bpm normal; above 100 tachycardia, below 60 bradycardia | Attributed to the American Heart Association by secondary pages. Athletes are often below 60 |
| SpO₂ | About 95 to 100 % normal; below 90 % widely treated as hypoxemia; "severe" cutoffs vary (85 to 90 %) | Search results were mostly low-quality consumer pages. Use a clinical society (BTS, ATS, NICE) as the source |
| Blood pressure | Below 120/80 normal; 130 to 139 or 80 to 89 stage 1; 140 or 90 and above stage 2; above 180 or 120 crisis; below 90/60 hypotension | 2017 ACC/AHA categories; a 2025 AHA/ACC guideline exists and was not checked |
| Respiration rate | 12 to 20 per minute at rest; above 20 tachypnea, below 12 bradypnea | Secondary clinical pages |
| Body temperature | Fever above about 38 °C; hypothermia below 35 °C | Fever cutoffs differ by source |

## How this maps to `packages/data/thresholds.json` (applied 2026-11-11)

Every metric carries `tier` (nasa / derived / engineering / provisional), optional `levelTier` and a `source` string; the vital-card tooltip shows them.

- CO₂ (tier nasa): caution 3 mmHg [V2 6004]; warning 4.5 mmHg (symptom onset in the brief); critical 7.5 mmHg is our choice
  (`levelTier.critical = engineering`). The cabin baseline moved from code into `modifiers.json` (`cabin.co2Baseline` 2.0 mmHg).
- Accumulated dose (derived): critical = 250 mSv (SPE limit); caution 25 and warning 100 are 10 % and 40 % of it (ours).
  The demo X8.7 flare adds roughly 45 mSv, so it reaches caution by dose; its dose rate still reaches critical.
- Dose rate (engineering): no NASA trigger exists; about 3x, 7x and 19x the 0.5 mSv/day background.
- Humidity (tier nasa, critical engineering): warning at the 25 / 75 % RH health range [V2 6012], caution at the 30 / 60 % comfort zone [V2 6013],
  critical 20 / 80 % is ours. Baseline 45 % with a slow simulated drift.
- Noise (tier nasa, caution and critical engineering): warning NC-50 (work areas [V2 6078]); caution NC-45 and critical NC-60 ours. NC-40 is a sleep-area limit [V2 6079] and is not used as an alarm (exercise equipment alone reaches about NC-42).
  Real NC needs an octave-band spectrum; the app shows one simulated NC rating (baseline 36, exercise adds 6 per the ergometer remark in the brief).
- Cabin O₂ (derived): kept at 19.5 / 18 / 16 %, referenced to the 149 mmHg normoxia value; NASA gives no alarm value.
- Everything in Tier B/C is `provisional` until the team chooses and cites primary sources.

## Guidance and "About this indicator" texts (G2, G3)

- `packages/data/guidance.json` (first action) is illustrative and not validated by flight surgeons.
- `packages/data/about.json` (why, in space, how measured, seek help, hazards, risks) is background in plain language. Statements about spaceflight come from the NASA HRP hazards and risks pages (nasa.gov/hrp/hazards, nasa.gov/hrp/risks) and from the rows of this file (CO₂ symptoms, 600 mSv career and 250 mSv SPE limits, humidity [V2 6012] and [V2 6013], noise NC-50 and NC-40, ISS airflow range, hypoxia table). Everything else is general knowledge and marked as such by the "not medical advice" note in the window.

## Self-check metrics (G1, applied 2026-11-14)

All four are entered by hand (provenance "entered by you"), judged only while the entry is current, and a single value is never a diagnosis.

- **Glucose** (tier clinical, warning and critical engineering): low side from the ADA Standards of Care 2026, section 6: hypoglycaemia below 70 mg/dL (caution), level 2 below 54 mg/dL (warning); critical 40 is ours. High side: caution 180 mg/dL is the ADA peak after-meal target (80 to 130 before a meal, under 180 after, read from a secondary summary, not the primary text); warning 250 and critical 350 are ours. The brief's "140 / 180 / 250" was not used: 140 is not an ADA limit we could verify.
- **Sleep** (tier provisional): NASA gives no numeric sleep alarm. "[V2 3006]" quoted in the brief is Human-Centered Task Analysis, not a sleep requirement; the sleep requirement is [V2 7070] Sleep Accommodation. The OCHMO sleep brief reports that ISS and Shuttle crews averaged about 6 to 6.5 h against 8.5 h scheduled (a later NASA sample reports about 7.9 h), so caution below 6.5 h, warning below 5.5 h and critical below 4 h are our placeholders.
- **Mood** (tier provisional): a 1 to 5 self-rating, caution at 3 or less, warning at 2, critical at 1. A rating, not a diagnosis.
- **Water drunk** (no alarm): 2.5 L per crew member per day is the water supplied (NASA-STD-3001 [V2 6109], OCHMO water brief). It is a supply minimum, not a proven intake target, so the card shows a reference bar and never raises a status.
- Validity of an entry: glucose 8 h, mood 12 h, sleep and water 24 h (`MANUAL` in `packages/engine/src/manual.ts`); after that the card says *Due*.

Self-check entries carry an id and the wall-clock time (`at`, ms since 1970) next to the mission time. The time is metadata for the report; the engine only uses the mission time. A removed entry is a `measurement` event with `params.retract` set to the entry id; it removes that entry from the whole history, because it is a correction.

## Mission contexts (G6, G8; `packages/data/missions.json`, applied 2026-11-14)

- **Moon**: 384,400 km mean distance at the speed of light is 1.28 s one way. Gravity 1.62 m/s2 is 0.165 g. Gateway in lunar orbit is weightless.
- **Mars**: 54.6 million km (closest) to 401 million km (farthest) is about 3 to 22 minutes one way (secondary sources agree on 3 and 22; one gives about 24 for the far side; exact values depend on orbital geometry, check JPL ephemeris data for a real mission). Round trip about 6 to 45 minutes. Surface gravity 3.7 m/s2 is about 0.38 g (the brief said 0.376 g). A transit is weightless.
- **Station in low orbit**: NASA states that data via the TDRS relay satellites arrives with under one second of delay. The one-way range 0.25 to 0.5 s is our estimate from the relay path (about 85,000 km is about 0.28 s) and is not a NASA figure. Do not show 1.3 s for the station: that is the Moon.
- The context changes labels and the ground-contact advice only. It never changes a limit or a body reading.
