import { describe, expect, it } from 'vitest';
import {
  decodeWorkbenchFromHash,
  encodeWorkbenchToHash,
  parseWorkbench,
  serializeWorkbench,
  type WorkbenchSnapshot,
} from '../../lib/share';

const snapshot: WorkbenchSnapshot = {
  targetId: 'h2o',
  atoms: [
    { id: 'a1', element: 'O', position: [0, 0, 0], targetIndex: 0 },
    { id: 'a2', element: 'H', position: [1.18604, 0.91834, 0], targetIndex: 1 },
  ],
  bonds: [{ id: 'b1', a: 'a1', b: 'a2', order: 1 }],
  selectedAtomId: 'a1',
  atomSerial: 3,
  bondSerial: 2,
};

describe('workbench sharing', () => {
  it('round-trips a workbench through encoded hash text', () => {
    const payload = serializeWorkbench(snapshot);
    expect(decodeWorkbenchFromHash(encodeWorkbenchToHash(payload))).toEqual(snapshot);
  });

  it('rejects invalid shared payloads', () => {
    expect(() => parseWorkbench(null)).toThrow('올바르지 않습니다');
    expect(() => parseWorkbench({ ...serializeWorkbench(snapshot), version: '2' })).toThrow(
      '지원하지 않는',
    );
    expect(() =>
      parseWorkbench({
        ...serializeWorkbench(snapshot),
        bonds: [{ id: 'b1', a: 'a1', b: 'missing', order: 1 }],
      }),
    ).toThrow('존재하지 않는 원자');
  });
});
