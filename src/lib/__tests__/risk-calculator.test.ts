import { describe, test, expect } from 'vitest';
import { calculateRiskLevel } from '@/lib/risk-calculator';

describe('risk-calculator', () => {
  // ── Low Risk ───────────────────────────────────────────────────────────────

  describe('LOW risk', () => {
    test('empty questionnaire → LOW', () => {
      expect(calculateRiskLevel({})).toBe('LOW');
    });

    test('only DATA_NONE → LOW', () => {
      expect(calculateRiskLevel({ q_data_classes: ['DATA_NONE'] })).toBe('LOW');
    });

    test('internal population only → LOW', () => {
      expect(calculateRiskLevel({ q_target_population: ['POP_INTERNAL'] })).toBe('LOW');
    });

    test('weight-1 selections only → LOW', () => {
      expect(calculateRiskLevel({
        q_data_classes: ['DATA_DEVICE_LOGS'],
        q_consent_mechanism: 'CONSENT_TOS',
        q_retention_ttl: 'TTL_30_DAYS',
      })).toBe('LOW');
    });
  });

  // ── Medium Risk ────────────────────────────────────────────────────────────

  describe('MEDIUM risk', () => {
    test('account IDs → MEDIUM', () => {
      expect(calculateRiskLevel({ q_data_classes: ['DATA_ACCOUNT_IDS'] })).toBe('MEDIUM');
    });

    test('enterprise population → MEDIUM', () => {
      expect(calculateRiskLevel({ q_target_population: ['POP_ENTERPRISE'] })).toBe('MEDIUM');
    });

    test('personalization purpose → MEDIUM', () => {
      expect(calculateRiskLevel({ q_processing_purpose: ['PURP_PERSONALIZATION'] })).toBe('MEDIUM');
    });

    test('opt-out consent → MEDIUM', () => {
      expect(calculateRiskLevel({ q_consent_mechanism: 'CONSENT_OPT_OUT' })).toBe('MEDIUM');
    });

    test('180-day retention → MEDIUM', () => {
      expect(calculateRiskLevel({ q_retention_ttl: 'TTL_180_DAYS' })).toBe('MEDIUM');
    });
  });

  // ── High Risk ──────────────────────────────────────────────────────────────

  describe('HIGH risk', () => {
    test('financial data → HIGH', () => {
      expect(calculateRiskLevel({ q_data_classes: ['DATA_FINANCIAL'] })).toBe('HIGH');
    });

    test('biometric data → HIGH', () => {
      expect(calculateRiskLevel({ q_data_classes: ['DATA_BIOMETRICS'] })).toBe('HIGH');
    });

    test('ads monetization → HIGH', () => {
      expect(calculateRiskLevel({ q_processing_purpose: ['PURP_ADS_MONETIZATION'] })).toBe('HIGH');
    });

    test('indefinite retention → HIGH', () => {
      expect(calculateRiskLevel({ q_retention_ttl: 'TTL_INDEFINITE' })).toBe('HIGH');
    });

    test('public API exposure → HIGH', () => {
      expect(calculateRiskLevel({ q_network_exposure: ['NET_PUBLIC_API'] })).toBe('HIGH');
    });

    test('file upload parsing → HIGH', () => {
      expect(calculateRiskLevel({ q_input_parsing: ['INPUT_FILE_UPLOAD'] })).toBe('HIGH');
    });
  });

  // ── Hard Overrides ─────────────────────────────────────────────────────────

  describe('hard overrides', () => {
    test('kids population → always HIGH regardless of other answers', () => {
      expect(calculateRiskLevel({
        q_target_population: ['POP_KIDS'],
        q_data_classes: ['DATA_NONE'],
      })).toBe('HIGH');
    });

    test('automated decisions → always HIGH', () => {
      expect(calculateRiskLevel({
        q_automated_decisions: true,
        q_data_classes: ['DATA_DEVICE_LOGS'],
      })).toBe('HIGH');
    });
  });

  // ── Mixed Selections ──────────────────────────────────────────────────────

  describe('mixed selections (max-weight wins)', () => {
    test('low + medium → MEDIUM', () => {
      expect(calculateRiskLevel({
        q_data_classes: ['DATA_DEVICE_LOGS', 'DATA_ACCOUNT_IDS'],
      })).toBe('MEDIUM');
    });

    test('low + high → HIGH', () => {
      expect(calculateRiskLevel({
        q_data_classes: ['DATA_DEVICE_LOGS', 'DATA_FINANCIAL'],
      })).toBe('HIGH');
    });
  });
});
