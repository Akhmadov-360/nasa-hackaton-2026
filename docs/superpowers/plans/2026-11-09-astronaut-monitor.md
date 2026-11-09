# Astronaut Health Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дашборд Mission Control для мониторинга здоровья четырёх астронавтов на реальных данных NASA/PhysioNet, устойчивый к потере сети.

**Architecture:** pnpm-монорепо. `packages/engine` (чистый TS, Zod) вычисляет кадры телеметрии как детерминированную функцию от времени и журнала событий. `apps/api` (NestJS) стримит кадры по WebSocket, `apps/web` (Next.js) показывает их и при потере связи запускает тот же движок в браузере.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vitest, Zod, NestJS (+ ws), Next.js App Router, Tailwind v4, shadcn/ui, Zustand, TanStack Query, motion, Sileo, Anime.js, `@number-flow/react`, lucide-react, next-intl, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-astronaut-monitor-design.md`

## Global Constraints

- Пакеты называются `@astro/engine`, `@astro/data`, `@astro/api`, `@astro/web`. Версии зависимостей: последние стабильные на момент установки, фиксируются lock-файлом.
- TypeScript `strict: true`. `packages/engine` не импортирует React, Nest и DOM-API.
- Без БД и ORM. Данные статикой в `packages/data`; журнал событий в памяти сервера и в `persist` (localStorage) на клиенте.
- Движок детерминирован: `Math.random` запрещён; шум через seeded-PRNG от `(crewId, t)`.
- Все числовые параметры (пороги, дозы, модификаторы) лежат в JSON в `packages/data`, не в коде. Пока математики не заполнили Приложение A спецификации, файлы содержат поле `"provisional": true` с иллюстративными значениями, и UI показывает метку `PROVISIONAL`.
- ЭКГ: чанки 10 раз в секунду (~36 сэмплов при 360 Гц). Остальные показатели 1–2 раза в секунду. Кольцевой буфер: 500 тиков на астронавта.
- SourceManager: heartbeat 3 с, STALE не дольше 5 с, затем SIM. Баннер ровно: `SIGNAL LOST — USING ESTIMATED TELEMETRY`.
- Hold-to-confirm: 800 мс. Голос и звук включаются только после экрана `Enter Mission Control`.
- Палитра: Ink `#0B1220`, Slate `#141C2E`/`#1C2740`, Mist `#9FB0C9`, Bone `#E8EDF5`, Signal teal `#4FB6A8`, Amber `#D9A441`, Coral `#D9645A`, Deep red `#B8323F`. Шрифты: Hanken Grotesk (интерфейс), Martian Mono (показания). Только тёмная тема; `prefers-reduced-motion` отключает декоративные анимации.
- Статус всегда дублируется текстом или иконкой, не только цветом. Контраст WCAG AA.
- Gooey SVG-фильтр только на малых элементах (рейл экипажа, island-плашка).
- Каждый коммит оканчивается строкой `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Поле кадра `NaN`, `Infinity`, `null` или строка `"null"` → кадр помечен `degraded`, используется последнее валидное значение, ничего не падает (Task 1).
- WebSocket дублирует или присылает кадры с `t` назад → устаревшие кадры игнорируются, график не рвётся (Task 8).
- Ползунок Time Travel за пределами журнала (раньше старта, дальше «сейчас») → значение зажимается в допустимый диапазон (Task 4, Task 13).
- Кнопка hold-to-confirm отпущена раньше срока, `pointercancel`, двойное срабатывание → команда выполняется ровно один раз и только после полного удержания (Task 11).
- `speechSynthesis`/`AudioContext` недоступны или заблокированы → тост и запись в журнал всё равно появляются, исключений нет (Task 11).

---

### Task 0: Каркас монорепо

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.npmrc`
- Create: `packages/engine/{package.json,tsconfig.json,src/index.ts}`, `packages/data/{package.json,tsconfig.json,src/index.ts}`
- Test: `packages/engine/src/smoke.test.ts`

**Interfaces:**
- Produces: workspace-скрипты `pnpm -r test`, `pnpm -r typecheck`; `@astro/engine` экспортирует `ENGINE_VERSION: string`.

- [ ] **Step 1: Написать падающий тест** `smoke.test.ts`: `expect(ENGINE_VERSION).toBe('0.1.0')`.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/engine test` → FAIL (нет экспорта).
- [ ] **Step 3: Реализовать** workspace, Vitest в каждом пакете, `export const ENGINE_VERSION = '0.1.0'`. В `.gitignore`: `node_modules`, `.next`, `dist`, `data-raw/`.
- [ ] **Step 4: Запустить** тот же тест → PASS; `pnpm -r typecheck` → без ошибок.
- [ ] **Step 5: Commit** `chore: scaffold pnpm monorepo`.

### Task 1: Схемы и безопасный парсинг (engine)

**Files:**
- Create: `packages/engine/src/schemas.ts`
- Test: `packages/engine/src/schemas.test.ts`

**Interfaces:**
- Produces: типы `Status = 'NOMINAL'|'CAUTION'|'WARNING'|'CRITICAL'`, `Vitals`, `TelemetryFrame`, `Alert`, `EngineEvent`, `Track`, `ScenarioPack`, `Thresholds`; `parseFrame(input: unknown, last?: TelemetryFrame): TelemetryFrame` (никогда не бросает).
- `Vitals = { hr, hrv, spo2, bpSys, bpDia, respRate, temp, stress, eeg }` (все `number`). `TelemetryFrame` как в спецификации §3, включая `degraded: boolean`.
- `EngineEvent = { t: number; type: 'flare'|'exertion'|'o2fault'|'normalize'; crewId: string; params?: Record<string, number> }` (`crewId: 'ALL'` допустим).
- `Track = { ecgHz: number; vitalsHz: number; ecg: number[]; hr: number[]; spo2: number[]; resp: number[] }`.

- [ ] **Step 1: Тесты**: `parseFrame` на валидном кадре возвращает его без `degraded`; для `{vitals:{hr:"null"}}` с `last` → `hr === last.vitals.hr`, `degraded === true`; для `NaN`, `Infinity` и `null` в любом числовом поле — то же; для `undefined`/`42`/`"x"` как всего ввода → кадр с дефолтами и `degraded: true`; ни один вход не бросает.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/engine test schemas` → FAIL.
- [ ] **Step 3: Реализовать** Zod-схемы; числа через `z.number().finite().catch(NaN)`, затем подстановка из `last` или нейтральных дефолтов и выставление `degraded`.
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat(engine): zod schemas with safe parsing`.

### Task 2: Синтетический baseline и модификаторы (engine + data)

**Files:**
- Create: `packages/engine/src/prng.ts`, `packages/engine/src/baseline.ts`, `packages/engine/src/modifiers.ts`, `packages/engine/src/frame.ts`
- Create: `packages/data/modifiers.json`, `packages/data/radiation-model.json`, `packages/data/scripts/make-synth-pack.ts`, `packages/data/packs/synth.pack.json`
- Test: `packages/engine/src/frame.test.ts`

**Interfaces:**
- Consumes: типы Task 1.
- Produces: `mulberry32(seed: number): () => number`; `sampleTrack(track: Track, t: number): { vitals: Partial<Vitals>; ecgChunk: number[] }` (зацикливание по модулю, цикл ≤ 60 с); `envelope(t: number, start: number, riseSec: number, holdSec: number, decaySec: number): number` в диапазоне 0..1; `computeFrame(ctx: { pack: ScenarioPack; thresholds: Thresholds; log: EngineEvent[] }, crewId: string, t: number): TelemetryFrame`.
- `modifiers.json`: `{ provisional, exertion:{hrGain,hrvDrop,riseSec,holdSec,decaySec}, o2fault:{spo2Drop,...} }`. `radiation-model.json`: `{ provisional, backgroundUSvH, classes:{C,M,X:{peakMultiplier,riseSec,decaySec}} }`.

- [ ] **Step 1: Тесты**: `computeFrame` дважды с теми же аргументами даёт deep-equal кадр; без событий `vitals.hr` совпадает с `sampleTrack`; после события `exertion` в момент пика `hr` выше baseline, `hrv` ниже; после `o2fault` `spo2` ниже; после `normalize` значения возвращаются к baseline; `flare` класса X увеличивает `doseRateUSvH` и `cumulativeMSv` монотонно не убывает; `envelope` равна 0 до старта, 1 на плато, 0 после спада.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/engine test frame` → FAIL.
- [ ] **Step 3: Реализовать** перечисленные функции; `make-synth-pack.ts` генерирует 4 синтетических трека по 60 с (ЭКГ-подобная форма, HR 58–74) только как временную замену реальных, запись в `synth.pack.json` с `meta.sources: ['synthetic']`. Накопленная доза интегрируется по журналу, а не по состоянию.
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat(engine): deterministic frame computation with modifiers`.

### Task 3: Пороги, гистерезис, алерты (engine)

**Files:**
- Create: `packages/engine/src/status.ts`, `packages/data/thresholds.json`
- Test: `packages/engine/src/status.test.ts`

**Interfaces:**
- Consumes: `Thresholds`, `TelemetryFrame`, `Alert`.
- Produces: `evaluateMetric(metric: string, value: number, th: Thresholds, prev: Status): Status`; `worstStatus(statuses: Status[]): Status`; `diffAlerts(prev: TelemetryFrame | undefined, next: TelemetryFrame): Alert[]`.
- `thresholds.json`: для каждой метрики `{ unit, caution, warning, critical, hysteresis, direction: 'high'|'low'|'both' }`, плюс `provisional: true`, пока математики не заполнили A1.

- [ ] **Step 1: Тесты**: SpO₂ спускается через порог warning → статус `WARNING`; возврат на 0,5 ниже порога выхода статус не снимает (гистерезис), выше — снимает; `worstStatus(['NOMINAL','CRITICAL','CAUTION']) === 'CRITICAL'`; `diffAlerts` возвращает алерт только при смене статуса метрики вверх и не возвращает при повторном том же статусе; один астронавт в `CRITICAL` не меняет `overall` другого кадра.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/engine test status` → FAIL.
- [ ] **Step 3: Реализовать**; вычисление `status` встроить в `computeFrame` (вызывает `evaluateMetric` без состояния через `prev` из `frameAt` предыдущего тика — см. Task 4).
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat(engine): thresholds with hysteresis and alerts`.

### Task 4: Журнал событий и Time Travel (engine)

**Files:**
- Create: `packages/engine/src/log.ts`
- Test: `packages/engine/src/log.test.ts`

**Interfaces:**
- Produces: `appendEvent(log: EngineEvent[], ev: EngineEvent): EngineEvent[]` (сортировка по `t`, не мутирует вход); `frameAt(ctx, crewId: string, t: number, opts?: { minT: number; maxT: number }): TelemetryFrame` (зажимает `t` в `[minT, maxT]`, статус считается прогоном от `minT` с шагом 1 с для гистерезиса).

- [ ] **Step 1: Тесты**: `appendEvent` сохраняет порядок и не меняет исходный массив; `frameAt` с `t < minT` равен `frameAt(minT)`, с `t > maxT` равен `frameAt(maxT)`; один и тот же `(log, t)` всегда даёт один кадр; событие на `t=100` не влияет на `frameAt(50)`.
- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать**; кэшировать прогон статуса по `(crewId, t)` в `Map`, чтобы Time Travel не пересчитывал 24 ч при каждом движении ползунка.
- [ ] **Step 4: Запустить** → PASS. **Step 5: Commit** `feat(engine): event log and time travel`.

### Task 5: Ингест реальных данных (data)

**Files:**
- Create: `packages/data/scripts/ingest-bidmc.ts`, `packages/data/scripts/wfdb212.ts`, `packages/data/scripts/ingest-mitbih.ts`, `packages/data/scripts/fetch-donki.ts`, `packages/data/scripts/build-pack.ts`
- Create: `packages/data/data-raw/` (в `.gitignore`), выход: `packages/data/packs/demo.pack.json`, `packages/data/events/donki-flares.json`
- Test: `packages/data/scripts/wfdb212.test.ts`

**Interfaces:**
- Produces: `readHeader(text: string): { fs: number; nsig: number; signals: Array<{ file: string; format: number; gain: number; baseline: number }> }`; `decode212(buf: Uint8Array, nsig: number): number[][]`; `buildPack(opts): ScenarioPack` с `meta.sources` и `meta.licenses`, заполненными из каждого датасета; DONKI запрашивается с `api.nasa.gov/DONKI/FLR` и `/SEP` за 2023–2024, ключ `DEMO_KEY` или из `NASA_API_KEY`.

- [ ] **Step 1: Тест `decode212`**: на байтах `[0x12,0x34,0x56]` при двух сигналах возвращает один кадр `[0x412, 0x356]` по правилу формата 212 (первый отсчёт: `(b1 & 0x0F) << 8 | b0`, второй: `(b1 & 0xF0) << 4 | b2`; затем знак по дополнительному коду в 12 битах); `readHeader` на минимальном `.hea` из 360 Гц возвращает `fs === 360`.
- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать** парсер и скрипты; BIDMC читается из CSV (`csv-parse`); `build-pack.ts` выбирает 4 записи, нарезает цикл ≤ 60 с, прореживает до `vitalsHz` 1–2, записывает `demo.pack.json`. Если в BIDMC CSV нет ожидаемых колонок — остановиться и сообщить, не угадывать.
- [ ] **Step 4: Запустить** тесты → PASS; затем `pnpm --filter @astro/data build:pack` → файл создан; `parseFrame`/`computeFrame` на нём без `degraded`.
- [ ] **Step 5: Commit** `feat(data): ingest PhysioNet and DONKI into scenario pack` (сырые файлы не коммитить).

### Task 6: NestJS gateway и REST (api)

**Files:**
- Create: `apps/api/{package.json,tsconfig.json,src/main.ts,src/app.module.ts,src/telemetry/telemetry.gateway.ts,src/telemetry/telemetry.service.ts,src/telemetry/telemetry.controller.ts}`
- Test: `apps/api/src/telemetry/telemetry.service.test.ts`

**Interfaces:**
- Consumes: `computeFrame`, `appendEvent`, `parseFrame`, пак и пороги из `@astro/data`.
- Produces: `TelemetryService.tick(): TelemetryFrame[]` (по кадру на астронавта для текущего `t`), `TelemetryService.command(ev: EngineEvent): void`; WebSocket `/ws`: сообщения `{ type: 'frame', frame }`, `{ type: 'hello', t, log }`, `{ type: 'heartbeat', t }` каждую секунду; REST `GET /telemetry/latest`, `GET /scenarios`, `POST /events` (тело `EngineEvent`, ответ `{ ok: true }`).

- [ ] **Step 1: Тесты сервиса**: `tick()` возвращает 4 кадра; после `command({type:'o2fault', crewId:'A2', ...})` кадр A2 имеет меньший SpO₂, кадры остальных не изменились; невалидная команда отклоняется без исключения и без записи в журнал.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/api test` → FAIL.
- [ ] **Step 3: Реализовать**: тик 10 Гц для ЭКГ-чанков и 1 Гц для vitals; журнал в памяти; CORS для `localhost:3000`.
- [ ] **Step 4: Запустить** → PASS; вручную `wscat -c ws://localhost:3001/ws` получает `hello` и `frame`.
- [ ] **Step 5: Commit** `feat(api): telemetry websocket gateway and rest`.

### Task 7: Каркас web, токены дизайна, раскладка

**Files:**
- Create: `apps/web/` (Next.js App Router), `src/app/layout.tsx`, `src/app/globals.css`, `src/components/shell/{TopBar,CrewRail,ControlDeck,TimeTravelBar}.tsx` (пока заглушки), `src/i18n/{en,ru,uz}.json`
- Test: `apps/web/src/components/shell/shell.test.tsx`

**Interfaces:**
- Produces: CSS-переменные палитры из Global Constraints; компоненты оболочки принимают `children`; `layout.tsx` монтирует `<Toaster>` Sileo и подключает шрифты.

- [ ] **Step 1: Тест**: рендер страницы содержит четыре региона с `role` (`banner`, `navigation` для CrewRail, `main`, `complementary` для ControlDeck).
- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать** сетку из спецификации §6, glass-панели (blur, полупрозрачный Slate), градиентный фон, управляемый атрибутом `data-mission-status`; словарь `en` с ключами для TopBar.
- [ ] **Step 4: Запустить** тест → PASS; открыть в браузере и проверить: раскладка не ломается на 1440×900 и 1920×1080, контраст текста проходит AA.
- [ ] **Step 5: Commit** `feat(web): app shell and design tokens`.

### Task 8: Store и SourceManager

**Files:**
- Create: `apps/web/src/lib/store/missionStore.ts`, `apps/web/src/lib/sources/{types.ts,WebSocketSource.ts,PollSource.ts,SimSource.ts,SourceManager.ts}`, `apps/web/src/lib/buffers.ts`
- Test: `apps/web/src/lib/sources/SourceManager.test.ts`, `apps/web/src/lib/buffers.test.ts`

**Interfaces:**
- Produces: `type SourceMode = 'LIVE'|'POLL'|'STALE'|'SIM'`; `interface TelemetrySource { start(): void; stop(): void; onFrame(cb: (f: TelemetryFrame) => void): () => void; onHealth(cb: (h: { ok: boolean }) => void): () => void; send(ev: EngineEvent): void }`; `class SourceManager { constructor(sources: { live: TelemetrySource; poll?: TelemetrySource; sim: TelemetrySource }, clock?: { now(): number }); mode: SourceMode; subscribe(cb): () => void; command(ev: EngineEvent): void }`; `class RingBuffer<T> { constructor(cap: number); push(x: T): void; toArray(): T[] }`; `useMissionStore` с `selectedCrewId`, `mode`, `alarms`, `degradedByCrew`, `frames` (ссылки на буферы вне React-состояния).

- [ ] **Step 1: Тесты** (с фейковыми часами): нет heartbeat 3 с → `LIVE → POLL`, если `poll` задан, иначе → `STALE`; `STALE` через 5 с → `SIM`; возобновление heartbeat в `SIM` возвращает `LIVE`; команды, отправленные в `SIM`, ставятся в очередь и уходят в live после реконнекта; кадр с `t` меньше последнего принятого для этого `crewId` игнорируется; дубликат `(crewId, t)` игнорируется; `RingBuffer(500)` после 600 `push` хранит ровно последние 500; ошибка парсинга кадра одного `crewId` выставляет `degradedByCrew[crewId]` и не влияет на остальных.
- [ ] **Step 2: Запустить** `pnpm --filter @astro/web test` → FAIL.
- [ ] **Step 3: Реализовать**; `SimSource` вызывает `computeFrame` из `@astro/engine` с паком из `@astro/data` по таймеру; `persist` Zustand с `try/catch` вокруг чтения localStorage и сбросом на дефолты при повреждённых данных.
- [ ] **Step 4: Запустить** → PASS.
- [ ] **Step 5: Commit** `feat(web): mission store and source manager with fallback`.

### Task 9: Виджеты телеметрии с изоляцией сбоев

**Files:**
- Create: `apps/web/src/components/WidgetBoundary.tsx`, `apps/web/src/components/telemetry/{EcgChart.tsx,VitalCard.tsx,RadiationCard.tsx,TelemetryGrid.tsx}`, `apps/web/src/app/error.tsx`
- Test: `apps/web/src/components/WidgetBoundary.test.tsx`, `apps/web/src/components/telemetry/VitalCard.test.tsx`

**Interfaces:**
- Consumes: `useMissionStore`, `RingBuffer`.
- Produces: `<WidgetBoundary name: string>` (fallback `Telemetry channel offline` + кнопка `Reconnect`, сбрасывающая ошибку); `<VitalCard label unit value status />` (число через NumberFlow, статус как текст и иконка); `<EcgChart crewId />` рисует через `canvas` и `requestAnimationFrame`, читая буфер напрямую; Anime.js отвечает за прорисовку линии при смене астронавта.

- [ ] **Step 1: Тесты**: ребёнок бросает ошибку → виден `Telemetry channel offline`, соседний `WidgetBoundary` продолжает рендериться, нажатие `Reconnect` перерисовывает ребёнка; `VitalCard` со статусом `CRITICAL` содержит слово `CRITICAL` в тексте, не только класс цвета; `VitalCard` с `NaN` отображает `—`, не падает.
- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать**; числовые карточки подписываются на 2–4 Гц селекторами, ЭКГ не вызывает ререндер React.
- [ ] **Step 4: Запустить** → PASS; в браузере: поток идёт, при `NaN` в одном виджете остальные живы; частота кадров ЭКГ ≥ 50 FPS в DevTools Performance.
- [ ] **Step 5: Commit** `feat(web): telemetry widgets with error boundaries`.

### Task 10: Рейл экипажа, пульс и gooey-переключатель

**Files:**
- Create: `apps/web/src/components/crew/{CrewRail.tsx,CrewAvatar.tsx,PulseDot.tsx,GooeyFilter.tsx}`
- Test: `apps/web/src/components/crew/CrewRail.test.tsx`

**Interfaces:**
- Produces: `<PulseDot hr: number status: Status />` (период пульсации = 60/hr, цвет от teal к coral/deep red по статусу); `<CrewRail />` с общей каплей-индикатором на `motion` `layoutId="crew-active"`, фильтр `GooeyFilter` определён один раз и применён только к контейнеру рейла.

- [ ] **Step 1: Тесты**: клик по второму аватару ставит `selectedCrewId` в store; `PulseDot` с `hr=120` имеет период анимации 500 мс; аватар со статусом `WARNING` содержит текст `WARNING` (доступное имя).
- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать**. При `prefers-reduced-motion` капля переключается без перетекания.
- [ ] **Step 4: Запустить** → PASS; в браузере: капля перетекает между аватарами без артефактов, FPS остаётся ≥ 50.
- [ ] **Step 5: Commit** `feat(web): crew rail with gooey selector`.

### Task 11: Control Deck, журнал, алерты, голос

**Files:**
- Create: `apps/web/src/lib/useHoldToConfirm.ts`, `apps/web/src/components/deck/{ControlDeck.tsx,HoldButton.tsx,AuditLog.tsx}`, `apps/web/src/lib/alerts/{alertCenter.ts,voice.ts}`, `apps/web/src/components/EnterMissionControl.tsx`
- Test: `apps/web/src/lib/useHoldToConfirm.test.ts`, `apps/web/src/lib/alerts/alertCenter.test.ts`

**Interfaces:**
- Produces: `useHoldToConfirm(onConfirm: () => void, ms = 800): { progress: number; handlers: {...} }`; `notifyAlert(a: Alert, deps?: { toast; speak; log }): void` (всегда вызывает `toast` и `log`, `speak` обёрнут в `try/catch`); `speak(text: string): void` (no-op, если нет `speechSynthesis` или аудио не разрешено); `AuditLog` показывает записи с MET-метками.

- [ ] **Step 1: Тесты** (фейковые таймеры): удержание 799 мс → `onConfirm` не вызван; 800 мс → вызван один раз; отпускание на 400 мс сбрасывает прогресс; `pointercancel` сбрасывает прогресс; удержание 2000 мс не вызывает `onConfirm` дважды; `notifyAlert` с `speak`, бросающим исключение, всё равно вызывает `toast` и `log` ровно по одному разу.
- [ ] **Step 2: Запустить** → FAIL.
- [ ] **Step 3: Реализовать**; `severity` → `sileo.warning()` для `WARNING`, `sileo.error()` для `CRITICAL`; текст голоса `Warning: Crew Member 2 oxygen level critical` формируется из алерта; кнопки Control Deck: `Solar flare`, `Exertion`, `O₂ fault`, `Normalize` отправляют `EngineEvent` через `SourceManager.command`. `EnterMissionControl` создаёт `AudioContext` и «прогревает» `speechSynthesis` по клику.
- [ ] **Step 4: Запустить** → PASS; в браузере: каждая кнопка удерживается, вызывает изменение показаний и запись в журнал.
- [ ] **Step 5: Commit** `feat(web): control deck, audit log, alerts and voice`.

### Task 12: Body Scan

**Files:**
- Create: `apps/web/src/components/bodyscan/{BodyScan.tsx,silhouette.svg.tsx,organs.ts}`
- Test: `apps/web/src/components/bodyscan/BodyScan.test.tsx`

**Interfaces:**
- Produces: `organs: Array<{ id: 'brain'|'heart'|'lungs'|'muscle'; path: string; metrics: Array<keyof Vitals> }>`; `<BodyScan />` — клик или hover по органу ставит `focusedOrgan` в store; `TelemetryGrid` подсвечивает связанные карточки по `organs[].metrics`; Sileo-плашка показывает микро-метрики органа.

- [ ] **Step 1: Тесты**: клик по `heart` ставит `focusedOrgan = 'heart'`; в DOM карточка `hr` помечена `aria-current`, карточка `eeg` — нет; орган со статусом `WARNING` содержит доступный текст статуса; клавиатура: `Tab`+`Enter` активирует орган.
- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать** (линия сканирования через Anime.js по `strokeDashoffset`).
- [ ] **Step 4: Запустить** → PASS; визуальная проверка силуэта в браузере.
- [ ] **Step 5: Commit** `feat(web): interactive body scan`.

### Task 13: Time Travel и Island-плашка

**Files:**
- Create: `apps/web/src/components/time/{TimeTravelBar.tsx,useTimeTravel.ts}`, `apps/web/src/components/island/IslandPill.tsx`
- Test: `apps/web/src/components/time/useTimeTravel.test.ts`

**Interfaces:**
- Consumes: `frameAt`, `appendEvent`.
- Produces: `useTimeTravel(): { t: number | 'live'; setT(t: number): void; goLive(): void; frame(crewId): TelemetryFrame }`; `<IslandPill />` расширяется капелькой при новом `Alert` и сворачивается через 6 с.

- [ ] **Step 1: Тесты**: `setT(-10)` зажимается в `minT`; `setT(Infinity)` и значение больше «сейчас» → `'live'`; в режиме истории новые кадры не меняют отображаемый кадр; `goLive()` возвращает поток; `IslandPill` показывает последний алерт и сворачивается по таймеру.
- [ ] **Step 2: Запустить** → FAIL. **Step 3: Реализовать**.
- [ ] **Step 4: Запустить** → PASS; в браузере: ползунок назад показывает момент вспышки и ответ системы.
- [ ] **Step 5: Commit** `feat(web): time travel and island pill`.

### Task 14: Учения на отказ и смоук-тест демо

**Files:**
- Create: `apps/web/e2e/demo.spec.ts`, `apps/web/e2e/resilience.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: все предыдущие задачи.

- [ ] **Step 1: Написать e2e `demo.spec.ts`**: вход через `Enter Mission Control`, смена астронавта, удержание `Solar flare` → в журнале запись, у карточки радиации статус растёт, виден тост.
- [ ] **Step 2: Написать `resilience.spec.ts`**: остановить API → в течение 8 с виден баннер `SIGNAL LOST — USING ESTIMATED TELEMETRY`, график продолжает двигаться; запустить API → режим возвращается в `LIVE`; через `page.route` подать в WS-ответ `heartRate: "null"` → приложение не падает, карточка помечена `degraded`.
- [ ] **Step 3: Запустить** `pnpm --filter @astro/web e2e` → всё PASS; исправить найденные проблемы с отдельными коммитами.
- [ ] **Step 4: Прогнать вручную** на выключенном Wi-Fi: приложение стартует и работает полностью. Commit `test(web): demo and resilience e2e`.

### Task 15: i18n и документация

**Files:**
- Modify: `apps/web/src/i18n/{en,ru,uz}.json`; все компоненты с текстом используют `useTranslations`
- Create: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: готовое приложение.

- [ ] **Step 1: Тест** `i18n.test.ts`: все ключи из `en.json` присутствуют в `ru.json` и `uz.json`.
- [ ] **Step 2: Запустить** → FAIL, перевести недостающее, → PASS. Проверить макет в браузере на `ru`/`uz` (длинные строки не ломают раскладку).
- [ ] **Step 3: Написать `README.md`** (что это, как запустить `pnpm dev`, структура монорепо, источники данных и атрибуция, честные оговорки о модельной дозе, как работает отказоустойчивость, скрипт демо) **и `CLAUDE.md`** (команды `pnpm -r test`/`typecheck`, границы пакетов, правило «числа только в JSON в `packages/data`», детерминизм движка, как добавить сценарий и модификатор).
- [ ] **Step 4: Commit** `docs: add README and CLAUDE.md, finalize i18n`.
