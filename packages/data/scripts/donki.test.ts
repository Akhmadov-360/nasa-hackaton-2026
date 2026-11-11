import { describe, expect, it } from 'vitest';
import { flaresFromNotifications } from './donki';

const body = (lines: string[]) => `## Community Coordinated Modeling Center Database Of Notifications, Knowledge, Information ( CCMC DONKI )\n## Message Type: Auto-generated Space Weather Notification\n\n## Summary:\n\nSignificant flare detected by GOES.\n${lines.join('\n')}\n`;

describe('flaresFromNotifications', () => {
  it('turns "Flare start / peak / intensity" notifications into flare events', () => {
    const msgs = [
      { messageID: '20240514-AL-007', messageURL: 'https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/1/1', messageBody: body(['Flare start time: 2024-05-14T16:46Z.', 'Flare peak time: 2024-05-14T16:51Z.', 'Flare intensity: X8.7 class.']) },
    ];
    expect(flaresFromNotifications(msgs)).toEqual([
      { flrID: '20240514-AL-007', classType: 'X8.7', beginTime: '2024-05-14T16:46Z', peakTime: '2024-05-14T16:51Z', endTime: null, sourceLocation: null, link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/1/1' },
    ]);
  });

  it('ignores threshold-crossing alerts and anything it cannot read completely', () => {
    const msgs = [
      { messageID: 'a', messageURL: 'u', messageBody: body(['Flare intensity has crossed the threshold of M5.0.', 'Flare M5.0 crossing time: 2024-05-10T06:41Z.']) },
      { messageID: 'b', messageURL: 'u', messageBody: body(['Flare start time: 2024-05-10T06:27Z.', 'Flare intensity: X3.9 class.']) },
      { messageID: 'c', messageURL: 'u', messageBody: undefined as unknown as string },
    ];
    expect(flaresFromNotifications(msgs)).toEqual([]);
  });
});
