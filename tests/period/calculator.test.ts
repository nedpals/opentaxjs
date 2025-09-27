import { describe, it, expect } from 'vitest';
import { calculatePeriod } from '@/period';

describe('calculatePeriod', () => {
  describe('full year period', () => {
    it('should handle full year with no options', () => {
      const period = calculatePeriod();
      
      expect(period.affected_quarters).toEqual([1, 2, 3, 4]);
      expect(period.is_full_year).toBe(true);
      expect(period.proration_factors.Q1).toBe(1);
      expect(period.proration_factors.Q2).toBe(1);
      expect(period.proration_factors.Q3).toBe(1);
      expect(period.proration_factors.Q4).toBe(1);
    });

    it('should handle explicit full year', () => {
      const period = calculatePeriod({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(period.affected_quarters).toEqual([1, 2, 3, 4]);
      expect(period.is_full_year).toBe(true);
      expect(period.total_days).toBe(366); // 2024 is leap year
    });
  });

  describe('partial year periods', () => {
    it('should handle mid-February start', () => {
      const period = calculatePeriod({
        start_date: '2024-02-15',
        end_date: '2024-12-31'
      });
      
      expect(period.affected_quarters).toEqual([1, 2, 3, 4]);
      expect(period.is_full_year).toBe(false);
      expect(period.proration_factors.Q1).toBeLessThan(1); // Partial Q1
      expect(period.proration_factors.Q2).toBe(1); // Full Q2
      expect(period.proration_factors.Q3).toBe(1); // Full Q3  
      expect(period.proration_factors.Q4).toBe(1); // Full Q4
    });

    it('should handle single quarter', () => {
      const period = calculatePeriod({
        start_date: '2024-04-01',
        end_date: '2024-06-30'
      });
      
      expect(period.affected_quarters).toEqual([2]);
      expect(period.proration_factors.Q2).toBe(1); // Full Q2
      expect(period.proration_factors.Q1).toBeUndefined();
      expect(period.proration_factors.Q3).toBeUndefined();
    });

    it('should handle partial quarter', () => {
      const period = calculatePeriod({
        start_date: '2024-05-15',
        end_date: '2024-06-15'
      });
      
      expect(period.affected_quarters).toEqual([2]);
      expect(period.proration_factors.Q2).toBeLessThan(1);
      expect(period.proration_factors.Q2).toBeGreaterThan(0);
    });
  });

  describe('filing dates', () => {
    it('should calculate correct Philippine tax filing dates', () => {
      const period = calculatePeriod({
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(period.filing_dates.Q1).toEqual(new Date(2024, 3, 15)); // Apr 15
      expect(period.filing_dates.Q2).toEqual(new Date(2024, 6, 15)); // Jul 15
      expect(period.filing_dates.Q3).toEqual(new Date(2024, 9, 15)); // Oct 15
      expect(period.filing_dates.Q4).toEqual(new Date(2025, 0, 15)); // Jan 15 next year
      expect(period.filing_dates.annual).toEqual(new Date(2025, 3, 15)); // Apr 15 next year
    });
  });

  describe('edge cases', () => {
    it('should handle single day period', () => {
      const period = calculatePeriod({
        start_date: '2024-03-15',
        end_date: '2024-03-15'
      });
      
      expect(period.affected_quarters).toEqual([1]);
      expect(period.total_days).toBe(1);
    });

    it('should throw error for invalid date range', () => {
      expect(() => {
        calculatePeriod({
          start_date: '2024-06-01',
          end_date: '2024-01-01'
        });
      }).toThrow('Start date cannot be after end date');
    });
  });
});