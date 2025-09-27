export interface PeriodInfo {
  start_date: Date;
  end_date: Date;
  affected_quarters: number[];
  proration_factors: Record<string, number>;
  filing_dates: Record<string, Date>;
  is_full_year: boolean;
  total_days: number;
}

export interface PeriodCalculationOptions {
  start_date?: string;
  end_date?: string;
}

function getQuarterBoundaries(year: number): { start: Date; end: Date }[] {
  return [
    { start: new Date(year, 0, 1), end: new Date(year, 2, 31) }, // Q1: Jan-Mar
    { start: new Date(year, 3, 1), end: new Date(year, 5, 30) }, // Q2: Apr-Jun
    { start: new Date(year, 6, 1), end: new Date(year, 8, 30) }, // Q3: Jul-Sep
    { start: new Date(year, 9, 1), end: new Date(year, 11, 31) }, // Q4: Oct-Dec
  ];
}

function getFilingDate(
  quarter: number,
  year: number,
  filing_day: number = 15
): Date {
  const filingMonth = quarter === 4 ? 0 : quarter * 3; // Q4 files in January of next year
  const filingYear = quarter === 4 ? year + 1 : year;
  return new Date(filingYear, filingMonth, filing_day);
}

function calculateDaysInPeriod(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
}

function calculateQuarterOverlap(
  quarterStart: Date,
  quarterEnd: Date,
  periodStart: Date,
  periodEnd: Date
): number {
  const overlapStart = new Date(
    Math.max(quarterStart.getTime(), periodStart.getTime())
  );
  const overlapEnd = new Date(
    Math.min(quarterEnd.getTime(), periodEnd.getTime())
  );

  if (overlapStart > overlapEnd) {
    return 0; // No overlap
  }

  const overlapDays = calculateDaysInPeriod(overlapStart, overlapEnd);
  const quarterDays = calculateDaysInPeriod(quarterStart, quarterEnd);

  return overlapDays / quarterDays;
}

export function calculatePeriod(options?: PeriodCalculationOptions): PeriodInfo {
  const currentYear = new Date().getFullYear();

  // Default to full calendar year if no dates provided
  let startDate: Date;
  let endDate: Date;

  if (options?.start_date) {
    const parsed = new Date(options.start_date);
    startDate = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  } else {
    startDate = new Date(currentYear, 0, 1);
  }

  if (options?.end_date) {
    const parsed = new Date(options.end_date);
    endDate = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  } else {
    endDate = new Date(currentYear, 11, 31);
  }

  // Ensure start date is not after end date
  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }

  const year = startDate.getFullYear();
  const quarterBoundaries = getQuarterBoundaries(year);

  // Handle cross-year periods (for now, focus on the start year)
  const endYear = endDate.getFullYear();
  if (endYear > year) {
    // For simplicity, we'll focus on the start year quarters
    // This could be enhanced to handle multi-year periods
  }

  const affectedQuarters: number[] = [];
  const prorationFactors: Record<string, number> = {};
  const filingDates: Record<string, Date> = {};

  // Check each quarter for overlap with the period
  quarterBoundaries.forEach((quarter, index) => {
    const quarterNum = index + 1;
    const overlapFactor = calculateQuarterOverlap(
      quarter.start,
      quarter.end,
      startDate,
      endDate
    );

    if (overlapFactor > 0) {
      affectedQuarters.push(quarterNum);
      prorationFactors[`Q${quarterNum}`] = overlapFactor;
      filingDates[`Q${quarterNum}`] = getFilingDate(quarterNum, year);
    }
  });

  filingDates.annual = new Date(year + 1, 3, 15);

  const totalDays = calculateDaysInPeriod(startDate, endDate);
  const fullYearStart = new Date(year, 0, 1);
  const fullYearEnd = new Date(year, 11, 31);
  const isFullYear =
    startDate.getTime() === fullYearStart.getTime() &&
    endDate.getTime() === fullYearEnd.getTime();

  return {
    start_date: startDate,
    end_date: endDate,
    affected_quarters: affectedQuarters,
    proration_factors: prorationFactors,
    filing_dates: filingDates,
    is_full_year: isFullYear,
    total_days: totalDays,
  };
}
