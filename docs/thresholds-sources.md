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

Not confirmed in any document read: an airflow range of 0.05 to 0.2 m/s ([V2 6107] on ventilation is qualitative: it must
prevent CO₂ and thermal pockets). NC-52 is not a NASA value (NC-50 is the current work-area curve). Daily hydration
of 2.0 L (3.0 L EVA) does not match the briefs: the minimum is 2.5 L/day. The 1.8 L consumed value of a "Hydration" card
would need a measured or modelled intake signal that we do not have, so that card is not built.

Sources:
- https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
- https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf
- https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf

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
- Noise (tier nasa, critical engineering): caution NC-40 (sleep areas [V2 6079]), warning NC-50 (work areas [V2 6078]), critical NC-60 ours.
  Real NC needs an octave-band spectrum; the app shows one simulated NC rating (baseline 36, exercise adds 6 per the ergometer remark in the brief).
  The sleep limit only applies in crew quarters, so caution is a conservative simplification.
- Cabin O₂ (derived): kept at 19.5 / 18 / 16 %, referenced to the 149 mmHg normoxia value; NASA gives no alarm value.
- Everything in Tier B/C is `provisional` until the team chooses and cites primary sources.
