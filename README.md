# opentaxjs
opentaxjs is a proposed JavaScript library designed to handle tax calculations based on predefined rules. It allows developers to implement tax logic in their applications easily. For now, this is primarily designed for the Philippine tax system, but it can be extended to support other tax systems as well.

## Motivation
Stumbling upon the [tax directory subsite of BetterGov.ph](https://taxdirectory.bettergov.ph/), I noticed significant gaps and inconsistencies in its tax calculation feature. This is not an isolated issue; many similar websites and applications force developers to implement their own custom logic, which leads to problems with accuracy, consistency, and testability.

opentaxjs solves this by providing a unified, rules-based library for Philippine tax calculations. The goal is to provide a single, well-tested, and shareable set of rules so that developers no longer need to reinvent the wheel. This ensures calculations are accurate and makes it easier to implement and maintain tax features in any application.

## Project Goals
The project aims to:

1. **Create a rules format specification** that can be used to define tax rules in a structured way.
2. **Implement a JavaScript library** that can read these rules and perform tax calculations based on the provided data.
3. **Support a library of predefined tax rules** for common tax scenarios intended for the Philippine tax system, with the possibility of extending it to other tax systems in the future.

This project **DOES NOT** aim to:
1. Provide a complete tax filing solution.
2. Replace official tax filing systems or services.
3. Handle complex tax scenarios that require legal or financial advice.

## Current Status
The project has made significant progress beyond the initial specification phase. Currently:
- The [rules specification](RULES_SPEC.md) is complete and comprehensive.
- An accompanying JSON schema ([0.1.0.json](schema/0.1.0.json)) has been created to validate the rules format.
- Infrastructure for the development of the library is complete.
- The expression parser and evaluator have been implemented.
- The core rule evaluation engine is complete and supports all specification features.
- The public API has been implemented with TypeScript types and comprehensive test coverage.
- Period calculation and filing schedule generation are functional.

The library is ready for use with basic tax calculations following the opentaxjs specification.

For more details on the direction of this project, please refer to [ROADMAP.md](ROADMAP.md)

## API Usage

```typescript
import opentax from 'opentaxjs';
import incomeTaxRule from './bir/income_tax.json';

const incomeTax = opentax({ rule: incomeTaxRule }).calculate({
  gross_income: 500000,
  deductions: 100000,
  is_freelance: true
});

console.log(incomeTax.liabilities);
// [
//   { name: "Quarterly Income Tax Filing", type: "quarterly", iter: 1, amount: 12000, target_filing_date: Date },
//   { name: "Quarterly Income Tax Filing", type: "quarterly", iter: 2, amount: 12000, target_filing_date: Date },
//   { name: "Quarterly Income Tax Filing", type: "quarterly", iter: 3, amount: 12000, target_filing_date: Date },
//   { name: "Quarterly Income Tax Filing", type: "quarterly", iter: 4, amount: 12000, target_filing_date: Date },
//   { name: "Annual Income Tax Filing", type: "annual", iter: 1, amount: 48000, target_filing_date: Date }
// ]

// For mid-period employment scenarios
const midYearIncome = opentax({ rule: incomeTaxRule }).calculate({
  gross_income: 500000,
  deductions: 100000,
  is_freelance: true
}, {
  start_date: "2024-02-15",  // Started mid-February
  end_date: "2024-12-31"     // Optional, defaults to current date
});

console.log(midYearIncome.liabilities);
// Automatically calculates pro-rated amounts for partial periods
```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details

---

(c) 2025 Ned Palacios
