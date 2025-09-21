# opentaxjs
opentaxjs is a proposed JavaScript library designed to handle tax calculations based on predefined rules. It allows developers to implement tax logic in their applications easily. For now, this is primarily designed for the Philippine tax system, but it can be extended to support other tax systems as well.

## Motivation
Stumbling upon the [tax directory subsite of BetterGov.ph](https://taxdirectory.bettergov.ph/), I saw gaps and inconsistencies in the information provided but also with the tax calculation feature. This is not an isolated problem as other sites in this space do also suffer the same set of problems with each having their own set of controllable knobs in order to calculate the same type of tax. This also poses problems in terms of accuracy and testability.

opentaxjs aims to solve that by providing a unified approach to tax calculations and documentation through the use of rules-based approach that can be easily shared and reused across different applications. This will help ensure consistency in tax calculations and make it easier for developers to implement tax calculation features in their applications.

## Project Goals
The project aims to:

1. **Create a rules format specification** that can be used to define tax rules in a structured way.
2. **Implement a JavaScript library** that can read these rules and perform tax calculations based on the provided data.
3. **Support a library of predefined tax rules** for common tax scenarios intended for the Philippine tax system, with the possibility of extending it to other tax systems in the future.

This project **DOES NOT** aim to:
1. Provide a complete tax filing solution.
2. Replace official tax filing systems or services.
3. Handle complex tax scenarios that require legal or financial advice.

## Project Status
The project is still in its early stages of development. I am currently working on the rules file format specification which can be found in the [RULES_SPEC.md](RULES_SPEC.md) file.

## Proposed API

```typescript
import opentax from 'opentaxjs';

const incomeTax = opentax({ rule: "./bir/income_tax.json" }).calculate({
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
const midYearIncome = opentax({ rule: "./bir/income_tax.json" }).calculate({
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
