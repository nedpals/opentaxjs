# opentaxjs
opentaxjs is a JavaScript library designed to handle tax calculations based on predefined rules. It allows developers to implement tax logic in their applications easily. For now, this is primarily designed for the Philippine tax system, but it can be extended to support other tax systems as well.

## Project Status
The project is still in its early stages of development. We are currently working on the rule files specification which can be found in the [RULES_SPEC.md](RULES_SPEC.md) file.

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
