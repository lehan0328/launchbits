import { describe, test, expect } from 'vitest';
import {
  isValidTransition,
  assertValidTransition,
  getValidNextStatuses,
  isTerminalStatus,
  isActiveStatus,
} from '@/lib/state-machine';

describe('state-machine', () => {
  // ── Valid Transitions ──────────────────────────────────────────────────────

  describe('isValidTransition', () => {
    test('DRAFT → IN_REVIEW is valid', () => {
      expect(isValidTransition('DRAFT', 'IN_REVIEW')).toBe(true);
    });

    test('DRAFT → CANCELLED is valid', () => {
      expect(isValidTransition('DRAFT', 'CANCELLED')).toBe(true);
    });

    test('IN_REVIEW → APPROVED is valid', () => {
      expect(isValidTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    });

    test('IN_REVIEW → LAUNCHED_WITH_EXCEPTION is valid', () => {
      expect(isValidTransition('IN_REVIEW', 'LAUNCHED_WITH_EXCEPTION')).toBe(true);
    });

    test('IN_REVIEW → CANCELLED is valid', () => {
      expect(isValidTransition('IN_REVIEW', 'CANCELLED')).toBe(true);
    });

    test('APPROVED → LAUNCHED is valid', () => {
      expect(isValidTransition('APPROVED', 'LAUNCHED')).toBe(true);
    });

    test('APPROVED → IN_REVIEW is valid (re-open)', () => {
      expect(isValidTransition('APPROVED', 'IN_REVIEW')).toBe(true);
    });

    test('LAUNCHED_WITH_EXCEPTION → APPROVED is valid', () => {
      expect(isValidTransition('LAUNCHED_WITH_EXCEPTION', 'APPROVED')).toBe(true);
    });

    test('LAUNCHED_WITH_EXCEPTION → LAUNCHED is valid', () => {
      expect(isValidTransition('LAUNCHED_WITH_EXCEPTION', 'LAUNCHED')).toBe(true);
    });
  });

  // ── Invalid Transitions ────────────────────────────────────────────────────

  describe('invalid transitions', () => {
    test('DRAFT cannot jump to APPROVED', () => {
      expect(isValidTransition('DRAFT', 'APPROVED')).toBe(false);
    });

    test('DRAFT cannot jump to LAUNCHED', () => {
      expect(isValidTransition('DRAFT', 'LAUNCHED')).toBe(false);
    });

    test('IN_REVIEW cannot go back to DRAFT', () => {
      expect(isValidTransition('IN_REVIEW', 'DRAFT')).toBe(false);
    });

    test('APPROVED cannot go to CANCELLED', () => {
      expect(isValidTransition('APPROVED', 'CANCELLED')).toBe(false);
    });

    test('same-status transition is invalid', () => {
      expect(isValidTransition('DRAFT', 'DRAFT')).toBe(false);
    });
  });

  // ── Terminal States ────────────────────────────────────────────────────────

  describe('terminal states', () => {
    test('LAUNCHED is terminal', () => {
      expect(isTerminalStatus('LAUNCHED')).toBe(true);
    });

    test('CANCELLED is terminal', () => {
      expect(isTerminalStatus('CANCELLED')).toBe(true);
    });

    test('DRAFT is not terminal', () => {
      expect(isTerminalStatus('DRAFT')).toBe(false);
    });

    test('IN_REVIEW is not terminal', () => {
      expect(isTerminalStatus('IN_REVIEW')).toBe(false);
    });

    test('terminal states have no valid next statuses', () => {
      expect(getValidNextStatuses('LAUNCHED')).toEqual([]);
      expect(getValidNextStatuses('CANCELLED')).toEqual([]);
    });
  });

  // ── Active Status ──────────────────────────────────────────────────────────

  describe('isActiveStatus', () => {
    test('IN_REVIEW is active', () => {
      expect(isActiveStatus('IN_REVIEW')).toBe(true);
    });

    test('APPROVED is active', () => {
      expect(isActiveStatus('APPROVED')).toBe(true);
    });

    test('LAUNCHED_WITH_EXCEPTION is active', () => {
      expect(isActiveStatus('LAUNCHED_WITH_EXCEPTION')).toBe(true);
    });

    test('DRAFT is not active', () => {
      expect(isActiveStatus('DRAFT')).toBe(false);
    });

    test('LAUNCHED is not active', () => {
      expect(isActiveStatus('LAUNCHED')).toBe(false);
    });
  });

  // ── assertValidTransition ──────────────────────────────────────────────────

  describe('assertValidTransition', () => {
    test('does not throw for valid transition', () => {
      expect(() => assertValidTransition('DRAFT', 'IN_REVIEW')).not.toThrow();
    });

    test('throws descriptive error for invalid transition', () => {
      expect(() => assertValidTransition('DRAFT', 'APPROVED')).toThrow(
        /Invalid status transition.*Draft.*Approved/
      );
    });

    test('error message includes allowed transitions', () => {
      expect(() => assertValidTransition('DRAFT', 'LAUNCHED')).toThrow(
        /In Review.*Cancelled/
      );
    });
  });
});
