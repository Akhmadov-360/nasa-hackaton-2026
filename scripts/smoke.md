# Rehearsal checklist for the presentation laptop

`pnpm smoke` proves the software works. This list covers what only a person on the real machine can check.
Do it once the evening before and once an hour before the presentation.

## 1. Run the production build

```bash
pnpm install && pnpm build:libs
pnpm --filter @astro/api start                    # terminal 1  (:3001)
pnpm --filter @astro/web build && pnpm --filter @astro/web start   # terminal 2  (:3000); stop `dev` first
pnpm smoke                                        # terminal 3, expect 15/15
```

Never present from `pnpm dev`: the first view of each screen compiles on demand and the dev overlay badge covers the corner.

## 2. Screen and projector

- [ ] Set the laptop to the projector's resolution (1366x768 and 1920x1080 are the common ones) and run `pnpm smoke -- --size 1366x768 --shots shots` and again with `1920x1080`; open the screenshots. Nothing is cut off, the Time Travel bar is visible, the Flight log scrolls.
- [ ] Browser zoom is 100 %. Full screen (F11).
- [ ] Windows scaling at 125 % or 150 % changes the effective width: check the layout once at the scaling you will use.

## 3. Sound and voice

- [ ] Press **Enter Mission Control** once (it unlocks audio), the *Sound on* toggle is on.
- [ ] Hold *O2 supply fault* and listen: a voice reads the warning. If it is silent, check Windows Settings, Time and language, Speech, and install an English and a Russian voice.
- [ ] Uzbek has no installed voice on most machines: it speaks Russian. Present in English or Russian.
- [ ] Volume is set and the projector audio output is the one you expect.

## 4. No internet (do this once with Wi-Fi really off)

The browser only talks to `localhost`, the fonts are bundled, so the app must look identical offline. Only the NOAA proton chart needs the internet, and it says "not available" by itself.

- [ ] Wi-Fi off, API and web server running, hard reload (Ctrl+Shift+R). The page loads with its fonts and icons.
- [ ] The Radiation tab shows the NOAA card as unavailable, not a stale number.
- [ ] Run the 3-minute script from the README once, start to end.
- [ ] Wi-Fi back on: the NOAA chart appears within a minute without a reload.

## 4b. Recovery moves during the presentation

- Stuck scenario: **Reset scenario** (hold), or restart the API (`Ctrl+C`, start again) and reload.
- The page looks wrong after a laptop sleep: reload, press Enter Mission Control again.
- Keys: **1 to 4** crew, **T** live, **K** pause or resume a replay, **J** / **L** skip 10 s, **M** mute.

## 5. Backups

- [ ] A screen recording of the full pitch (30 s clip and the 3-minute run) on the laptop and on a USB stick.
- [ ] Self-check: open the Self-check tab, press Record on Glucose, enter 52 and Save. A warning appears in the island and pins in the Flight log with a *Do now* line; the Report lists it as an incident caused by a self-check entry. Add 0.5 L of water, press the pencil on that entry, change it to 0.25 L and Update: the total drops. Export Excel and open the *Self-check* sheet: both entries have a date and time.
- [ ] The Excel workbook exported from a real run, so the Report can be shown even if the app fails.
- [ ] Screenshots from `pnpm smoke --shots` for the slides.
