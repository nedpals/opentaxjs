# opentaxjs Rules Specification

> This document is still a work in progress.

This specification defines a standardized, human-readable format for expressing tax calculation rules that can be consistently implemented across different programming languages and applications.

### Target Audience

This specification is primarily intended for **implementers and contributors** to the opentaxjs ecosystem:
- **Library implementers** building opentaxjs rule engines in various programming languages
- **Rule authors** creating and maintaining tax calculation rules for specific jurisdictions
- **Contributors** developing tooling, validation, and supporting infrastructure for the opentaxjs format
- **Developers** integrating opentaxjs into their applications

## Table of Contents

1. [Overview](#1-overview)
2. [Features and Goals](#2-features-and-goals)
3. [Disclaimer](#3-disclaimer)
4. [Core Concepts](#4-core-concepts)
   - 4.1. [Rules](#41-rules)
   - 4.2. [Variables](#42-variables)
   - 4.3. [Constants](#43-constants)
   - 4.4. [Tables](#44-tables)
5. [Rules Format Structure](#5-rules-format-structure)
6. [Variable System](#6-variable-system)
   - 6.1. [Variable Declaration](#61-variable-declaration)
   - 6.2. [Variable Referencing System](#62-variable-referencing-system)
7. [Filing Schedules](#7-filing-schedules)
8. [Conditional Rules](#8-conditional-rules)
   - 8.1. [Operators](#81-operators)
   - 8.1.1. [Comparison Value Evaluation](#811-comparison-value-evaluation)
   - 8.1.2. [Logical Operator Syntax](#812-logical-operator-syntax)
   - 8.2. [Default Cases](#82-default-cases)
9. [Expressions](#9-expressions)
10. [Operations](#10-operations)
    - 10.1. [Defining an Operation](#101-defining-an-operation)
    - 10.2. [Operation Types](#102-operation-types)
    - 10.3. [Using Expressions in Operations](#103-using-expressions-in-operations)
    - 10.4. [Operations vs Functions](#104-operations-vs-functions)
    - 10.5. [Operation Best Practices](#105-operation-best-practices)
11. [Standard Library](#11-standard-library)
    - 11.1. [Predefined Constants](#111-predefined-constants)
    - 11.2. [Predefined Variables](#112-predefined-variables)
    - 11.3. [Built-in Functions](#113-built-in-functions)
12. [Implementation Guidelines](#12-implementation-guidelines)
    - 12.1. [Grammar](#121-grammar)
    - 12.2. [Implementation Philosophy](#122-implementation-philosophy)

## 1. Overview

The opentaxjs rules format is a JSON-based specification for expressing tax calculations in a standardized, declarative manner. This specification covers the complete structure and syntax needed to create tax calculation rules that are portable across different implementations and programming languages.

This document is organized into conceptual sections that build upon each other:
- **Core concepts** introduce the fundamental building blocks (rules, variables, constants, tables)
- **Structural sections** detail the JSON format and organization
- **Operational sections** explain how calculations flow through conditions, expressions, and operations
- **Practical sections** cover filing schedules and implementation best practices

## 2. Features and Goals

1. **Human-readable while still machine-readable**: It should be designed to be easily understandable and modifiable by humans, while also being structured in a way that machines can easily parse and execute the rules.
2. **Auditable**: The rules should be structured in a way that allows for easy auditing and verification of the tax calculations, ensuring transparency and compliance with tax regulations.
3. **Extensible**: It should handle the different rules and scenarios that may arise in tax calculations, allowing for future extensions and modifications.
4. **Language and application-agnostic**: While the initial implementation is in JavaScript, it should be able to be adapted for use in other programming languages and applications beyond tax calculations (eg. generating tax documentations, automated tax filings, etc.)

## 3. Disclaimer

### It is NOT a perfect tax calculation format.

- It is designed to use existing infrastructure as much as possible such as the use of JSON, which is built into JavaScript and is available in many other programming languages.
- It does not cover all possible tax scenarios and rules, but it provides a foundation that can be extended to cover more complex cases.
- While we try to make it as human-readable as possible, it does not guarantee that non-technical users will be able to grasp and modify the rules without assistance. It is still recommended to have a basic understanding of the JSON data language to effectively work with this format.

In short, the opentaxjs rules format is designed to cover as many tax scenarios as possible in the most accessible way we can.

## 4. Core Concepts

### 4.1. Rules

Rules are complete, self-contained JSON documents that define how to calculate taxes for a specific jurisdiction, taxpayer type, and tax category. Each rule encompasses the entire tax calculation workflow—from input validation and constant definitions to mathematical operations, conditional logic, progressive tax brackets, and filing requirements. Rules serve as the authoritative source of tax calculation logic, separate from application code.

### 4.2. Variables

Variables are containers that hold values for calculations. They can be categorized into three types based on their source/authority:

1. **Inputs** (`$` Prefix): These are user-provided values that the taxpayer supplies when calculating tax. They represent data from the taxpayer's domain and are defined in the `inputs` section (e.g., `$gross_income`).

2. **Constants** (`$$` Prefix): These are law-defined fixed values that come from tax regulations and remain the same across calculations. They represent data from the legal/regulatory domain and are defined in the `constants` section (e.g., `$$tax_exempt_threshold`).

3. **Calculated Values** (No Prefix): These are values computed during the calculation flow, including both user-defined outputs and system-defined special variables. They represent data from the rule calculation domain (e.g., `taxable_income`, `liability`).

### 4.3. Constants

Constants are fixed values that are used throughout the rule set. They are defined once in the `constants` object and can be referenced in operations and conditions. Constants make rules more maintainable by centralizing values that may change when laws are updated.

### 4.4. Tables

Tables define structured data used for calculations, primarily progressive tax brackets and lookup tables. They provide a way to organize complex data structures that can be referenced in operations.

## 5. Rules Format Structure

A complete rule is a JSON object containing all the components needed for tax calculation. The following example demonstrates the key structure and features:

> **Example Note**: This is a demonstration of the format's capabilities, not actual calculation logic.

```json
{
  "$version": "1.0.0",
  "name": "Income Tax",
  "references": [
    "Republic Act No. 8424 (Tax Reform Act of 1997)",
    "https://www.bir.gov.ph/index.php/tax-information/individual-income-tax.html",
    "BIR Revenue Regulations No. 2-98"
  ],
  "effective_from": "2024-01-01",
  "jurisdiction": "PH",
  "taxpayer_type": "INDIVIDUAL",
  "author": "Bureau of Internal Revenue",
  "constants": {
    "tax_exempt_threshold": 250000,
    "freelance_tax_rate": 0.08,
    "standard_deduction": 50000,
    "quarterly_filing_day": 15
  },
  "tables": [
    {
      "name": "income_tax_brackets",
      "brackets": [
        {
          "min": 0,
          "max": 250000,
          "rate": 0,
          "base_tax": 0
        },
        {
          "min": 250000,
          "max": 400000,
          "rate": 0.20,
          "base_tax": 0
        },
        {
          "min": 400000,
          "max": 800000,
          "rate": 0.25,
          "base_tax": 30000
        },
        {
          "min": 800000,
          "max": "$$MAX_TAXABLE_INCOME",
          "rate": 0.32,
          "base_tax": 130000
        }
      ]
    }
  ],
  "inputs": {
    "gross_income": {
      "type": "number",
      "description": "The total income for the period"
    },
    "income_type": {
      "type": "string",
      "enum": ["EMPLOYEE", "FREELANCE", "BUSINESS"],
      "description": "Type of income source"
    },
    "deductions": {
      "type": "number",
      "description": "Total deductions applicable to the income"
    },
    "business_receipts": {
      "type": "number",
      "description": "Gross business receipts for the period",
      "when": {
        "income_type": { "eq": "BUSINESS" }
      }
    },
    "is_freelance": {
      "type": "boolean",
      "description": "Indicates if the income is from freelance work",
      "when": {
        "income_type": { "eq": "FREELANCE" }
      }
    }
  },
  "outputs": {
    "cumulative_gross_income": {
      "type": "number",
      "description": "Cumulative gross income for the period"
    },
    "adjusted_income": {
      "type": "number",
      "description": "Income adjusted for the calculation period"
    },
    "total_deductions": {
      "type": "number",
      "description": "Total of all applicable deductions"
    },
    "taxable_income": {
      "type": "number",
      "description": "Income subject to tax after deductions"
    }
  },
  "validate": [
    {
      "when": {
        "and": [
          { "$income_type": { "eq": "BUSINESS" } },
          { "$business_receipts": { "lte": 0 } }
        ]
      },
      "error": "Business income type requires business receipts to be greater than zero."
    },
    {
      "when": {
        "$deductions": { "gt": "$gross_income" }
      },
      "error": "Total deductions cannot exceed gross income."
    }
  ],
  "filing_schedules": [
    {
      "name": "Quarterly Income Tax Filing",
      "frequency": "quarterly",
      "filing_day": "$$quarterly_filing_day",
      "forms": [
        {
          "when": { "income_type": { "eq": "EMPLOYEE" } },
          "form": "1700Q",
          "attachments": ["BIR Form 2316"]
        },
        {
          "when": { "income_type": { "eq": "FREELANCE" } },
          "form": "1701Q",
          "attachments": ["Schedule 1 (Quarterly Income Statement)"]
        },
        {
          "form": "1701Q",
          "attachments": ["Schedule 1 (Quarterly Income Statement)", "Business Records"]
        }
      ]
    },
    {
      "name": "Annual Income Tax Filing",
      "frequency": "annual",
      "filing_day": 15,
      "when": {
        "diff(liability, $gross_income)": {
          "gt": 0
        }
      },
      "forms": [
        {
          "form": "1701",
          "attachments": [
            "Schedule 1 (Background Information)",
            "Schedule 2 (Itemized Deductions)"
          ]
        }
      ]
    }
  ],
  "flow": [
    {
      "name": "Calculate annual gross income",
      "operations": [
        {
          "type": "set",
          "target": "cumulative_gross_income",
          "value": "$gross_income"
        },
        {
          "type": "multiply",
          "target": "cumulative_gross_income",
          "value": 12
        }
      ]
    },
    {
      "name": "Calculate taxable income",
      "operations": [
        {
          "type": "set",
          "target": "adjusted_income",
          "value": "cumulative_gross_income"
        },
        {
          "type": "set",
          "target": "total_deductions",
          "value": "$deductions"
        },
        {
          "type": "add",
          "target": "total_deductions",
          "value": "$$standard_deduction"
        },
        {
          "type": "set",
          "target": "taxable_income",
          "value": "adjusted_income"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "total_deductions"
        },
        {
          "type": "set",
          "target": "taxable_income",
          "value": "max(taxable_income, 0)"
        }
      ]
    },
    {
      "name": "Apply tax calculation",
      "cases": [
        {
          "when": {
            "income_type": {
              "eq": "FREELANCE"
            }
          },
          "operations": [
            {
              "type": "set",
              "target": "liability",
              "value": "cumulative_gross_income"
            },
            {
              "type": "multiply",
              "target": "liability",
              "value": "$$freelance_tax_rate"
            }
          ],
          "effects": [
            {
              "type": "excludes",
              "target": "QUARTERLY_PAYMENT_VOUCHERS",
              "description": "Freelancers using flat rate are exempt from quarterly payment vouchers",
              "reference": "Revenue Memorandum Circular No. 84-2020"
            }
          ]
        },
        {
          "when": {
            "income_type": {
              "ne": "FREELANCE"
            }
          },
          "operations": [
            {
              "type": "set",
              "target": "liability",
              "value": "lookup(income_tax_brackets, taxable_income)"
            }
          ]
        }
      ]
    },
    {
      "name": "Ensure non-negative liability",
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": "max(liability, 0)"
        }
      ]
    }
  ]
}
```

### 5.1. Rule Structure Overview

A rule file contains these main sections:

#### Metadata Properties
- **`$version`**: Format version for compatibility checking
- **`name`**: Human-readable rule identifier
- **`references`**: Array of legal citations and references (statutes, regulations, URLs, etc.)
- **`effective_from`/`effective_to`**: Date validity range (ISO format)
- **`jurisdiction`**: Geographic scope using ISO 3166 country code (e.g., "PH")
- **`taxpayer_type`**: Applicable taxpayer category. Must be one of: `"INDIVIDUAL"`, `"CORPORATION"`, `"PARTNERSHIP"`, `"SOLE_PROPRIETORSHIP"`. Jurisdictions may extend this list for additional entity types (e.g., `"TRUST"`, `"ESTATE"`) as needed for their specific legal frameworks.
- **`category`**: Tax type (e.g., "INCOME_TAX", "VAT", "WITHHOLDING_TAX") - optional
- **`author`**: Rule maintainer (optional)

#### Calculation Components
- **`constants`**: Law-defined fixed values (detailed in [Constants](#43-constants))
- **`tables`**: Progressive brackets and lookup data (detailed in [Tables](#44-tables))
- **`inputs`**: Required taxpayer data (detailed in [Variables](#42-variables))
- **`outputs`**: Calculated results (detailed in [Variables](#42-variables))
- **`validate`**: Input validation and preconditions (detailed in [Validation](#55-validation))
- **`filing_schedules`**: Due dates and forms (detailed in [Filing Schedules](#7-filing-schedules))
- **`flow`**: Calculation sequence (detailed in [Operations](#10-operations))

## 6. Variable System

For the basic concepts of variables, constants, and tables, see [Core Concepts](#4-core-concepts). This section covers implementation details for working with variables.

### 6.1. Variable Declaration

Variables declared in the `inputs` and `outputs` sections use [JSON Schema](https://json-schema.org/) format for validation and documentation. This allows you to specify constraints and structure:

```json
{
  "type": "number",
  "description": "The total income for the period",
  "minimum": 0,
  "maximum": 1000000
}
```

**Common JSON Schema properties for variables:**
- `type`: Data type ("number", "string", "boolean", "array", "object")
- `description`: Human-readable explanation
- `minimum`/`maximum`: Numeric bounds
- `enum`: List of allowed values
- `pattern`: Regular expression for string validation
- `when`: Optional condition that determines when the input is relevant (inputs only)

#### Conditional Input Variables

Input variables can include a `when` property to specify when they are relevant based on other inputs. This enables dynamic forms that only collect necessary information:

```json
{
  "inputs": {
    "income_type": {
      "type": "string",
      "enum": ["COMPENSATION", "BUSINESS", "MIXED"],
      "description": "Type of income earned by the taxpayer"
    },
    "tax_rate_option": {
      "type": "string",
      "enum": ["GRADUATED", "FLAT_8_PERCENT"],
      "description": "Tax rate option for business income",
      "when": {
        "or": [
          { "$income_type": { "eq": "BUSINESS" } },
          { "income_type": { "eq": "MIXED" } }
        ]
      }
    },
    "deduction_method": {
      "type": "string",
      "enum": ["OSD", "ITEMIZED"],
      "description": "Method for calculating allowable deductions",
      "when": {
        "and": [
          { "or": [
              { "$income_type": { "eq": "BUSINESS" } },
              { "income_type": { "eq": "MIXED" } }
          ]},
          { "tax_rate_option": { "eq": "GRADUATED" } }
        ]
      }
    }
  }
}
```

**Conditional Input Rules:**
- The `when` condition follows the same syntax as other conditional logic in the specification
- Conditions can reference other input variables using the `$` prefix (e.g., `$income_type`)
- Variables with unsatisfied `when` conditions are **not required** and may be omitted from input
- Variables with satisfied `when` conditions become **required** and must be provided
- Circular dependencies between input conditions are not allowed
- The evaluation order should be determined by dependency analysis

**Implementation Behavior:**
- Input validation occurs before rule processing begins
- Conditional inputs are evaluated using a temporary context with provided inputs
- If a `when` condition cannot be evaluated (e.g., references missing inputs), the input is assumed **required** for safety
- Validation rules that reference conditional inputs will be skipped if those inputs are not available
- This allows complex validation scenarios without breaking when optional inputs are omitted

**Declaration Rules:**
- Variable names must not include prefixes (`$` or `$$`) in declarations
- Names should use lowercase with underscores (`tax_exempt_threshold`)
- Names must be unique within their section (inputs, outputs, constants)

## 6.2. Validation and Preconditions {#55-validation}

The `validate` section defines a set of conditions that must be satisfied for the rule to be applicable and execute correctly. These validations check input combinations against legal constraints and business rules before calculations begin.

### 6.2.1. Validation Structure

The `validate` section contains an array of validation rules, each with a condition and an associated error message:

```json
{
  "validate": [
    {
      "when": {
        "and": [
          { "$tax_rate_option": { "eq": "FLAT_8_PERCENT" } },
          { "$gross_business_receipts": { "gt": "$$vat_threshold" } }
        ]
      },
      "error": "The 8% flat tax rate option is not available for taxpayers whose gross sales/receipts exceed the PHP 3,000,000 VAT threshold."
    },
    {
      "when": {
        "and": [
          { "$income_type": { "eq": "BUSINESS" } },
          { "$gross_business_receipts": { "lte": 0 } }
        ]
      },
      "error": "Business income type requires gross business receipts to be greater than zero."
    }
  ]
}
```

### 6.2.2. Validation Rules

**Condition Structure:**
- The `when` property defines the condition that triggers the validation error
- Uses the same conditional logic syntax as other parts of the specification
- Can reference input variables, constants, and even calculated values from previous validations
- Complex conditions can be built using `and`, `or`, and `not` operators

**Error Messages:**
- The `error` property provides a human-readable explanation of why the validation failed
- Should clearly describe the legal or business constraint that was violated
- Should provide actionable guidance when possible
- Error messages are shown to users when validation fails

### 6.2.3. Validation Execution

**Timing:**
- Validations are executed after inputs are collected but before the calculation flow begins
- They run in the order defined in the `validate` array
- If any validation fails, the entire rule execution stops with an error

**Validation Processing:**
- Each validation condition is evaluated as a boolean expression
- If the condition evaluates to `true`, the validation fails and the error is raised
- If the condition evaluates to `false`, the validation passes and execution continues
- **Conditional Input Handling:** Validations that reference conditional inputs that are not available (due to unsatisfied `when` conditions) are automatically skipped
- This prevents validation errors when optional inputs are legitimately omitted
- If a validation condition cannot be evaluated for any reason, that validation is skipped to prevent false failures

**Implementation Notes:**
- Validation conditions use the literal-first comparison behavior (see [8.1.1](#811-comparison-value-evaluation))
- Variables in validation conditions must use appropriate prefixes (`$` for inputs, `$$` for constants)
- Validation errors are distinguished from other rule evaluation errors and are always propagated to the caller

### 6.2.4. Common Validation Patterns

**Threshold Constraints:**
```json
{
  "when": {
    "and": [
      { "tax_option": { "eq": "SIMPLIFIED" } },
      { "$annual_revenue": { "gt": "$$simplified_tax_threshold" } }
    ]
  },
  "error": "Simplified tax option is only available for businesses with annual revenue not exceeding $$simplified_tax_threshold."
}
```

**Mutual Exclusivity:**
```json
{
  "when": {
    "and": [
      { "filing_status": { "eq": "MARRIED_FILING_SEPARATELY" } },
      { "$spouse_income": { "gt": 0 } },
      { "itemize_deductions": { "eq": true } }
    ]
  },
  "error": "Married filing separately with spouse income cannot use itemized deductions unless both spouses itemize."
}
```

**Required Field Dependencies:**
```json
{
  "when": {
    "and": [
      { "has_dependents": { "eq": true } },
      { "or": [
          { "$number_of_dependents": { "lte": 0 } },
          { "$dependent_exemption_amount": { "lte": 0 } }
      ]}
    ]
  },
  "error": "When claiming dependents, both number of dependents and exemption amount must be specified and greater than zero."
}
```

### 6.2.5. Advanced Validation Features

**Cross-Input Validation:**
Validations can check relationships between multiple input fields:

```json
{
  "when": {
    "$total_deductions": { "gt": "$gross_income" }
  },
  "error": "Total deductions cannot exceed gross income."
}
```

**Conditional Validations:**
Validations can be applied only when certain conditions are met:

```json
{
  "when": {
    "and": [
      { "income_type": { "eq": "RENTAL" } },
      { "$rental_expenses": { "gt": "$rental_income" } },
      { "$net_rental_loss": { "gt": "$$max_rental_loss_deduction" } }
    ]
  },
  "error": "Rental loss deduction cannot exceed the maximum allowed limit of $$max_rental_loss_deduction."
}
```

**Date and Period Validations:**
```json
{
  "when": {
    "and": [
      { "$filing_period": { "eq": "Q1" } },
      { "$payment_date": { "gt": "2024-04-15" } }
    ]
  },
  "error": "Q1 payments must be made by April 15, 2024."
}
```

### 6.2.6. Benefits of Explicit Validation

**Legal Compliance:**
- Ensures calculations only proceed with valid input combinations
- Prevents incorrect tax calculations based on invalid assumptions
- Provides clear documentation of legal constraints and eligibility requirements

**User Experience:**
- Provides immediate feedback on input errors before calculation
- Clear error messages help users understand and correct mistakes
- Reduces confusion about why certain options aren't available

**System Integrity:**
- Prevents runtime errors during calculation due to invalid inputs
- Makes business rules explicit and enforceable
- Enables better testing and quality assurance of tax rules

**Auditability:**
- Documents the constraints and requirements explicitly in the rule
- Makes it clear what conditions must be met for the rule to apply
- Provides a trail of validation decisions for audit purposes

## 7. Filing Schedules

Filing schedules define when tax filings are due and specify the required forms and documentation.

### 7.1. Schedule Properties

Each filing schedule contains the following properties:

- **`name`**: The name of the filing schedule
- **`frequency`**: The frequency of the filing:
  - `quarterly`: Filing is due every quarter (every 3 months)
  - `annual`: Filing is due once a year
- **`filing_day`**: The day of the month when the filing is due (1-31). If the day exceeds the number of days in the month, it will be adjusted to the last day of the month
- **`when`**: Optional condition that determines when the filing schedule applies. This is an expression that can reference rule outputs. If this condition is not met, the filing schedule will not be applied
- **`forms`**: Object specifying required tax forms and supporting documents:
  - `primary`: The main form number required for the filing (e.g., "1701Q" for quarterly individual income tax)
  - `attachments`: Array of supporting documents or additional forms that must be submitted with the primary form

### Example Filing Schedule
```json
{
  "name": "Quarterly Income Tax Filing",
  "frequency": "quarterly",
  "filing_day": 15,
  "when": {
    "diff(liability, $gross_income)": {
      "gt": 0
    }
  },
  "forms": {
    "primary": "1701Q",
    "attachments": [
      "Schedule 1 (Income Statement)",
      "Schedule 2 (Deductions)",
      "Supporting receipts"
    ]
  }
}
```

### Forms Object

The `forms` property is an array of form objects that specify the required documentation for tax filings. Each form object can include an optional `when` clause for conditional form selection.

#### Simple Forms
For cases where only one form is required:

```json
"forms": [
  {
    "form": "1701Q",
    "attachments": ["Schedule 1 (Income Statement)"]
  }
]
```

#### Conditional Forms
For cases where form selection depends on taxpayer data, use `when` clauses:

```json
"forms": [
  {
    "when": { "income_type": { "eq": "COMPENSATION" } },
    "form": "1700",
    "attachments": ["BIR Form 2316 (Certificate of Compensation Payment/Tax Withheld)"]
  },
  {
    "when": {
      "and": [
        { "$income_type": { "eq": "BUSINESS" } },
        { "or": [
            { "tax_rate_option": { "eq": "FLAT_8_PERCENT" } },
            { "deduction_method": { "eq": "OSD" } }
        ]}
      ]
    },
    "form": "1701A",
    "attachments": ["Schedule of Itemized Deductions"]
  },
  {
    "form": "1701",
    "attachments": ["Complete Income Tax Return with all schedules"]
  }
]
```

**Conditional Forms Rules:**
- Forms are evaluated in order, with the first matching condition determining the required forms
- Forms without a `when` clause serve as the default and will always match
- Default forms (without `when`) should typically be placed last in the array
- Both `form` and `attachments` can be specified for each form object
- Conditions follow the same syntax as other conditional logic in the specification

#### Form Field
The `form` field specifies the main tax form that must be filed. This is typically a government-issued form number that taxpayers need to complete and submit.

**Examples:**
- `"1700"`: Individual Income Tax Return for purely compensation income (Philippines)
- `"1701Q"`: Quarterly Individual Income Tax Return (Philippines)
- `"1701"`: Annual Individual Income Tax Return (Philippines)
- `"1701A"`: Annual Individual Income Tax Return for specific taxpayer categories (Philippines)
- `"1702Q"`: Quarterly Corporate Income Tax Return (Philippines)

#### Attachments
The `attachments` field is an array of supporting documents, schedules, or additional forms that must accompany the main form. This can include:

- **Supporting schedules**: Additional computation sheets or detailed breakdowns
- **Documentation requirements**: Receipts, certificates, or other supporting evidence
- **Additional forms**: Supplementary tax forms required for specific situations

**Example with multiple filing schedules:**
```json
"filing_schedules": [
  {
    "name": "Quarterly Income Tax Filing",
    "frequency": "quarterly",
    "filing_day": 15,
    "forms": [
      {
        "when": { "income_type": { "eq": "EMPLOYEE" } },
        "form": "1700Q",
        "attachments": ["BIR Form 2316"]
      },
      {
        "form": "1701Q",
        "attachments": [
          "Schedule 1 (Quarterly Income Statement)",
          "Schedule 7A (Creditable Withholding Tax)"
        ]
      }
    ]
  },
  {
    "name": "Annual Income Tax Filing",
    "frequency": "annual",
    "filing_day": 15,
    "when": {
      "diff(liability, $gross_income)": {
        "gt": 0
      }
    },
    "forms": [
      {
        "when": { "income_type": { "eq": "EMPLOYEE" } },
        "form": "1700",
        "attachments": ["Certificate of Compensation Payment (BIR Form 2316)"]
      },
      {
        "form": "1701",
        "attachments": [
          "Schedule 1 (Background Information)",
          "Schedule 2 (Itemized Deductions)",
          "Schedule 7A (Creditable Withholding Tax)",
          "Supporting receipts for deductions"
        ]
      }
    ]
  }
]
```

## 8. Conditional Rules

Conditional rules allows you to run specific operations or schedules based on certain conditions. This is useful for handling different scenarios in tax calculations, such as different tax rates for different income levels or requirement-specific cases.

At its core, a conditional rule is an `object` that contains the expression to be evaluated and the expected value to compare against, by explicitly telling the operator to use and the value to compare. For example:

```json
"cumulative_gross_income": {
  "lt": 250000
}
```

In this case `cumulative_gross_income` is the variable being evaluated, `lt` is the operator (less than), and `250000` is the value to compare against.

### 8.1. Operators

Each rule must have an operator that defines how the condition is evaluated. The operator is a string that specifies the type of comparison to be made. They are case-sensitive and the value can be a number, string, or boolean depending on the context of the variable being evaluated.

The following operators can be used in conditional rules:

#### Comparison Operators
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal to
- `lte`: Less than or equal to

### 8.1.1. Comparison Value Evaluation

**Important:** Comparison values in conditional expressions default to **literal values** rather than variable references or expressions. This prevents common errors and makes conditions more predictable.

#### Literal Values (Default Behavior)

Most comparison values are treated as literals:

```json
{
  "when": {
    "$income_type": {
      "eq": "BUSINESS"  // Literal string "BUSINESS", not a variable
    }
  }
}
```

```json
{
  "when": {
    "$age": {
      "gte": 18  // Literal number 18
    }
  }
}
```

#### Expression Evaluation (Explicit)

To evaluate a comparison value as an expression or variable reference, prefix it with `$` (for variables) or `=` (for explicit expressions):

```json
{
  "when": {
    "$income": {
      "gt": "$$tax_threshold"  // Evaluates constant $$tax_threshold
    }
  }
}
```

```json
{
  "when": {
    "$total_income": {
      "gt": "=$base_income"  // Evaluates calculated variable base_income
    }
  }
}
```

#### Why Literal-First?

This design prevents common mistakes where rule authors expect literal comparisons but accidentally reference variables:

```json
// ❌ Common mistake (old behavior):
{
  "when": {
    "$filing_status": {
      "eq": "MARRIED"  // Would try to find variable named "MARRIED"
    }
  }
}

// ✅ Correct (new behavior):
{
  "when": {
    "$filing_status": {
      "eq": "MARRIED"  // Correctly compares to literal "MARRIED"
    }
  }
}
```

#### Logical Operators
- `and`: Logical AND - all conditions must be true
- `or`: Logical OR - at least one condition must be true
- `not`: Logical NOT - negates the condition

### 8.1.2. Logical Operator Syntax

Logical operators allow you to combine multiple conditions to create complex conditional logic.

#### AND Operator

The `and` operator requires all conditions in an array to be true:

```json
{
  "when": {
    "and": [
      {
        "age": {
          "gte": 60
        }
      },
      {
        "annual_income": {
          "lte": 500000
        }
      }
    ]
  }
}
```

#### OR Operator

The `or` operator requires at least one condition in an array to be true:

```json
{
  "when": {
    "or": [
      {
        "filing_status": {
          "eq": "single"
        }
      },
      {
        "filing_status": {
          "eq": "head_of_household"
        }
      }
    ]
  }
}
```

#### NOT Operator

The `not` operator negates a condition:

```json
{
  "when": {
    "not": {
      "taxpayer_type": {
        "eq": "tax_exempt_organization"
      }
    }
  }
}
```

#### Nested Logical Operators

Logical operators can be nested to create complex conditions:

```json
{
  "when": {
    "and": [
      {
        "or": [
          {
            "filing_status": {
              "eq": "single"
            }
          },
          {
            "filing_status": {
              "eq": "married_separate"
            }
          }
        ]
      },
      {
        "not": {
          "is_senior_citizen": {
            "eq": true
          }
        }
      },
      {
        "taxable_income": {
          "gt": 250000
        }
      }
    ]
  }
}
```

### 8.2. Default Cases

Cases in a `cases` array are evaluated in order. A case without a `when` clause serves as the default (else) case and will be executed if no previous conditions match.

**Example with default case:**
```json
{
  "name": "Apply tax rate based on income level",
  "cases": [
    {
      "when": {
        "taxable_income": {
          "lte": "$$tax_exempt_threshold"
        }
      },
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": 0
        }
      ]
    },
    {
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": "taxable_income"
        },
        {
          "type": "deduct",
          "target": "liability",
          "value": "$$tax_exempt_threshold"
        },
        {
          "type": "multiply",
          "target": "liability",
          "value": "$$basic_tax_rate"
        }
      ]
    }
  ]
}
```

**Rules:**
- Default cases (without `when`) must be the last case in the array
- Only one default case is allowed per `cases` array
- If no conditions match and no default case exists, no operations are performed

### 8.3. Case Effects and Tax Interactions

Cases can include an optional `effects` property to document how selecting a particular calculation path affects other tax obligations or interacts with different parts of the tax system. This metadata is valuable for comprehensive tax compliance systems that need to understand cross-tax relationships.

#### 8.3.1. Effects Declaration

The `effects` property is an array of effect objects that describe the broader implications of a case:

```json
{
  "when": { "tax_rate_option": { "eq": "FLAT_8_PERCENT" } },
  "operations": [
    {
      "type": "set",
      "target": "liability",
      "value": "$gross_business_receipts"
    },
    {
      "type": "multiply",
      "target": "liability",
      "value": 0.08
    }
  ],
  "effects": [
    {
      "type": "replaces",
      "target": "PERCENTAGE_TAX",
      "description": "The 8% flat rate is in lieu of the 3% business percentage tax",
      "reference": "Section 116 of the NIRC"
    },
    {
      "type": "excludes",
      "target": "VAT_REGISTRATION",
      "description": "Taxpayers using 8% flat rate are not required to register for VAT",
      "reference": "Revenue Regulations No. 16-2005"
    }
  ]
}
```

#### 8.3.2. Effect Types

The specification defines several standard effect types:

**`replaces`**: Indicates this calculation replaces another tax obligation
- Used when one tax is paid "in lieu of" another
- Prevents double taxation in comprehensive systems
- Common with alternative minimum tax scenarios

**`excludes`**: Indicates this choice excludes the taxpayer from certain obligations
- Used when selecting an option removes other requirements
- Helps systems determine which forms/filings are not needed
- Common with simplified tax regimes

**`requires`**: Indicates this choice creates additional obligations
- Used when selecting an option triggers other requirements
- Helps systems identify all necessary compliance steps
- Common with elections that have ongoing obligations

**`affects`**: General effect type for other relationships
- Used for effects that don't fit other categories
- Provides a flexible mechanism for documenting interactions

#### 8.3.3. Effect Properties

**Required Properties:**
- **`type`**: The type of effect (`replaces`, `excludes`, `requires`, `affects`)
- **`target`**: Identifier for what is affected (tax type, obligation, etc.)

**Optional Properties:**
- **`jurisdiction`**: Geographic scope of the effect when different from the rule's jurisdiction (e.g., "federal", "state", "local")
- **`description`**: Human-readable explanation of the effect
- **`reference`**: Legal citation or regulatory reference
- **`conditions`**: Additional conditions that must be met for the effect to apply
- **`duration`**: How long the effect lasts (e.g., "CURRENT_YEAR", "INDEFINITE")

#### 8.3.4. Advanced Effect Examples

**Complex Replacement with Conditions:**
```json
{
  "effects": [
    {
      "type": "replaces",
      "target": "REGULAR_INCOME_TAX",
      "description": "Alternative Minimum Tax replaces regular income tax when AMT is higher",
      "reference": "Section 59-A of the NIRC",
      "conditions": {
        "amt_liability": { "gt": "regular_tax_liability" }
      },
      "duration": "CURRENT_YEAR"
    }
  ]
}
```

**Multiple Related Effects:**
```json
{
  "effects": [
    {
      "type": "requires",
      "target": "QUARTERLY_PAYMENT",
      "description": "Self-employed individuals must make quarterly payments",
      "reference": "Section 75 of the NIRC"
    },
    {
      "type": "requires",
      "target": "ANNUAL_INFORMATION_RETURN",
      "description": "Must file additional information return with supporting schedules"
    },
    {
      "type": "excludes",
      "target": "SIMPLIFIED_BOOKKEEPING",
      "description": "Cannot use simplified bookkeeping methods"
    }
  ]
}
```

#### 8.3.5. Implementation Guidelines

**Usage in Tax Systems:**
- Effects are metadata and do not participate in calculations
- Systems can use effects to:
  - Determine which other tax calculations to skip or require
  - Generate comprehensive compliance checklists
  - Validate that all related obligations are addressed
  - Provide explanations to users about tax interactions

**Documentation Benefits:**
- Makes tax law relationships explicit and searchable
- Helps tax professionals understand full compliance requirements
- Provides audit trail for why certain taxes were or weren't calculated
- Enables better integration between different tax systems

**Cross-Jurisdictional Effects:**
When an effect applies to a different jurisdiction than the rule itself, include the optional `jurisdiction` property:

```json
{
  "effects": [
    {
      "type": "affects",
      "target": "STATE_TAXABLE_INCOME",
      "jurisdiction": "state",
      "description": "Federal charitable deduction reduces state taxable income calculation",
      "reference": "State Revenue Code Section 12.3"
    }
  ]
}
```

**Standardization:**
- Jurisdictions should develop standardized target identifiers (e.g., "PERCENTAGE_TAX", "VAT_REGISTRATION")
- Effect types can be extended by specific implementations
- References should follow consistent citation formats within a jurisdiction
- Use jurisdiction only when the effect crosses jurisdictional boundaries

#### 8.3.6. Benefits of Effect Documentation

**Comprehensive Compliance:**
- Ensures no tax obligations are overlooked
- Helps identify when elections affect multiple tax types
- Provides clear guidance on what's required vs. what's excluded

**System Integration:**
- Enables automated coordination between different tax calculation engines
- Supports building complete tax compliance platforms
- Facilitates validation that all obligations are properly handled

**Legal Clarity:**
- Documents complex "in lieu of" relationships that are common in tax law
- Provides clear references to relevant legal authorities
- Makes implicit tax law relationships explicit and machine-readable

**User Education:**
- Helps taxpayers understand the full implications of their choices
- Provides context for why certain forms or payments are required
- Reduces confusion about complex tax interactions

## 9. Expressions

Expressions are strings used in conditional rules and operations to reference variables, call functions, or provide literal values. They are the primary mechanism for dynamic computation within a rule.

An expression can be one of the following:

-   A **Variable Reference**, which uses prefixes to denote the variable's domain (e.g., `$gross_income`, `$$tax_rate`, `taxable_income`). For the formal syntax, see [Variable References (12.1.2)](#1212-variable-references).

-   A **Function Call**, which executes a built-in calculation (e.g., `max(taxable_income, 0)`). For a complete list of available functions, see the **[Standard Library (11.3)](#113-built-in-functions)**.

-   A **Literal Value**, such as a number (`250000`) or a boolean (`true`).

**Examples:**

The following `when` block uses an expression with a function call to determine if a condition is met:
```json
{
  "when": {
    "sum($gross_income, $additional_income)": {
      "gt": "$$tax_exempt_threshold"
    }
  }
}
```

The following operation uses an expression with a variable reference as its value:
```json
{
  "type": "set",
  "target": "taxable_income",
  "value": "$gross_income"
}
```

## 10. Operations

Operations define the actions that can be performed on variables during tax calculations. They are the building blocks of the calculation flow and allow you to manipulate values, perform arithmetic, and store results.

### 10.1. Defining an Operation

Each operation is a JSON object that specifies the action to be performed. All operations have a `type` property that defines the kind of operation, and most have a `target` property that specifies which variable to modify.

Basic operation structure:
```json
{
  "type": "operation_type",
  "target": "variable_name",
  "value": "value_or_expression"
}
```

### 10.2. Operation Types

The following operation types are supported:

#### `set`
Sets a variable to a specific value. This completely replaces the current value of the target variable.

```json
{
  "type": "set",
  "target": "taxable_income",
  "value": "$gross_income"
}
```

```json
{
  "type": "set",
  "target": "liability",
  "value": 0
}
```

#### `add`
Adds a value to the target variable. The target variable must already have a numeric value.

```json
{
  "type": "add",
  "target": "total_deductions",
  "value": 50000
}
```

#### `subtract` / `deduct`
Subtracts a value from the target variable. Both `subtract` and `deduct` perform the same operation.

```json
{
  "type": "deduct",
  "target": "taxable_income",
  "value": "$total_deductions"
}
```

```json
{
  "type": "subtract",
  "target": "liability",
  "value": "withholding_tax"
}
```

#### `multiply`
Multiplies the target variable by a value. Commonly used for applying tax rates.

```json
{
  "type": "multiply",
  "target": "liability",
  "value": "$$tax_rate"
}
```

#### `divide`
Divides the target variable by a value.

```json
{
  "type": "divide",
  "target": "monthly_income",
  "value": "$$months_per_year"
}
```






### 10.3. Using Expressions in Operations

Operations can use expressions and function calls in their `value` property. The following expression types are supported:

**Variable References:**
```json
{
  "type": "set",
  "target": "taxable_income",
  "value": "$gross_income"
}
```

**Function Calls:**
```json
{
  "type": "set",
  "target": "liability",
  "value": "max(taxable_income, 0)"
}
```

**Literal Values:**
```json
{
  "type": "multiply",
  "target": "liability",
  "value": 0.25
}
```

**Expression Scope Limitations:**
- Complex arithmetic expressions (e.g., `"($gross_income - $$deduction) * $$rate"`) are **not supported**
- Only single variable references, single function calls, or literal values are allowed
- This maintains auditability by keeping each operation atomic and traceable
- Multi-step calculations must be broken into separate operations with intermediate variables

### 10.4. Operations vs Functions

The specification distinguishes between **operations** and **functions** to balance auditability with composability:

- **Operations** mutate variables and create audit trails by showing explicit state changes step-by-step. They are the building blocks for clear, traceable tax calculations.
- **Functions** return calculated values and can be composed within expressions. They handle mathematical utilities and complex calculations.

This separation ensures that core tax logic remains auditable while enabling flexible expression of mathematical operations.

**Operations include:**
- `set`, `add`, `subtract`/`deduct`, `multiply`, `divide`

**Functions include:**
- `min`, `max`, `lookup`, `diff`, `sum`, `round`

**Usage pattern:** Use functions within `set` operations to maintain audit trails:
```json
{
  "type": "set",
  "target": "taxable_income", 
  "value": "max(gross_income, 0)"
}
```

### 10.5. Operation Best Practices

When writing operations, follow these best practices to ensure clarity and maintainability:

#### 10.5.1. Use Descriptive Variable Names
Choose variable names that clearly describe what they represent:

```json
// Good
{
  "type": "set",
  "target": "taxable_income",
  "value": "gross_income"
}

// Avoid
{
  "type": "set",
  "target": "temp_var",
  "value": "gross_income"
}
```

#### 10.5.2. Group Related Operations
Organize operations into logical steps within the flow:

```json
{
  "name": "Calculate taxable income",
  "operations": [
    {
      "type": "set",
      "target": "taxable_income",
      "value": "$gross_income"
    },
    {
      "type": "deduct",
      "target": "taxable_income",
      "value": "$$standard_deduction"
    },
    {
      "type": "set",
      "target": "taxable_income",
      "value": "max(taxable_income, 0)"
    }
  ]
}
```


#### 10.5.3. Use Meaningful Step Names
Give each step in the flow a clear, descriptive name:

```json
{
  "name": "Apply progressive tax brackets",
  "operations": [...]
},
{
  "name": "Calculate withholding tax credit",
  "operations": [...]
}
```

#### 10.5.4. Handle Edge Cases
Use conditional cases to handle different scenarios:

```json
{
  "name": "Apply tax rate based on income level",
  "cases": [
    {
      "when": {
        "taxable_income": {
          "lte": "$$tax_exempt_threshold"
        }
      },
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": 0
        }
      ]
    },
    {
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": "taxable_income"
        },
        {
          "type": "deduct",
          "target": "liability",
          "value": "$$tax_exempt_threshold"
        },
        {
          "type": "multiply",
          "target": "liability",
          "value": "$$basic_tax_rate"
        }
      ]
    }
  ]
}
```

**Note:** This example demonstrates best practices by using a default case (without `when`) for the else condition instead of explicitly checking the opposite condition (`gt`). This makes the rule more maintainable and easier to understand.


## 11. Standard Library

The opentaxjs specification defines a standard library of predefined constants, variables, and functions that are available in all rule implementations without explicit declaration. These built-in elements provide essential functionality and ensure consistency across different implementations.

### 11.1. Predefined Constants

The specification defines the following predefined constants that are available in all rules:

| Name | Value | Description |
|------|-------|-------------|
| `$$MAX_TAXABLE_INCOME` | `9007199254740991` | IEEE 754 maximum safe integer. Used as the upper bound for unlimited tax brackets, ensuring explicit and auditable maximum values. |

### 11.2. Predefined Variables

The specification defines the following predefined variables that are available in all rules:

| Name | Type | Description |
|------|------|-------------|
| `liability` | Number | The current tax liability being calculated. This variable holds the result of tax calculations at any point in the flow and serves as the primary output for most tax rules. |

**Important Notes:**
- Predefined variables cannot be redeclared in rule files
- They have no prefix (part of the calculation domain)
- Attempting to declare them will result in validation errors

### 11.3. Built-in Functions

The following built-in functions are available for use in expressions and operations:

| Function | Parameters | Description |
|----------|------------|-------------|
| `diff(a, b)` | `a`, `b`: Numbers | Returns the absolute difference between two values `|a - b|` |
| `sum(a, b, ...)` | `...`: Numbers | Returns the sum of all provided values |
| `max(a, b, ...)` | `...`: Numbers | Returns the maximum value among the provided values |
| `min(a, b, ...)` | `...`: Numbers | Returns the minimum value among the provided values |
| `round(value, decimals?)` | `value`: Number, `decimals?`: Number (default: 0) | Rounds a value to the specified number of decimal places |
| `lookup(table, value)` | `table`: String, `value`: Number | Calculates a value based on a progressive tax bracket lookup. Finds the bracket where `value` falls between `min` and `max`, calculates tax using the bracket's `rate`, and adds `base_tax` from lower brackets. |

**Lookup Function Details:**

The `lookup(table, value)` function works by:
1. Finding the bracket where `value` falls between `min` and `max`
2. Calculating the tax for the amount within that bracket using the bracket's `rate`
3. Adding the `base_tax` from lower brackets
4. Returning the calculated result

**Note:** For unlimited tax brackets, use the predefined constant `$$MAX_TAXABLE_INCOME` as the `max` value.

**Example calculation:**
- If `taxable_income` is 500,000 and falls in the 400,000+ bracket (25% rate, 30,000 base tax)
- Tax = 30,000 + (500,000 - 400,000) × 0.25 = 55,000

**Usage:**
```json
{
  "type": "set",
  "target": "liability",
  "value": "lookup(income_tax_brackets, taxable_income)"
}
```

These functions can be used in conditional expressions and operation values to perform common calculations needed in tax computations.

## 12. Implementation Guidelines

This section provides guidance for implementers, covering both technical specifications and philosophical principles for building opentaxjs rule engines.

### 12.1. Grammar

This subsection defines the formal grammar and syntax rules for opentaxjs-specific elements. Implementations must enforce these rules to ensure consistency and interoperability.

#### 12.1.1. Identifiers

All identifiers (variable names, constant names, table names, etc.) must follow these rules:

**Syntax Pattern:**
```
identifier = [a-z][a-z0-9_]*
```

**Rules:**
- Must start with a lowercase letter (`a-z`)
- Can contain lowercase letters, digits, and underscores
- Cannot start with digits or underscores
- Cannot contain uppercase letters, spaces, or special characters (except underscores)

**Valid Examples:**
- `gross_income`
- `tax_rate_2024`
- `liability`

**Invalid Examples:**
- `GrossIncome` (contains uppercase letters)
- `_private` (starts with underscore)
- `2024_rate` (starts with digit)
- `tax-rate` (contains hyphen)

**Note:** Predefined constants like `MAX_TAXABLE_INCOME` are exceptions and use ALL_CAPS naming, but user-defined identifiers must follow lowercase conventions.

#### 12.1.2. Variable References

Variable references use prefixes to indicate their domain:

**Syntax Patterns:**
```
input_variable = "$" identifier
constant_variable = "$$" identifier
calculated_variable = identifier
```

**Examples:**
- `$gross_income`, `$deductions` (inputs)
- `$$tax_rate`, `$$MAX_TAXABLE_INCOME` (constants)
- `taxable_income`, `liability` (calculated)

**Rules:**
- Prefixes (`$`, `$$`) are only used in references, never in declarations
- Variable references are case-sensitive
- Must reference declared or predefined variables

#### 12.1.3. Function Calls

Function calls are used in expressions and conditional rules:

**Syntax Pattern:**
```
function_call = function_name "(" [parameter_list] ")"
parameter_list = parameter ("," parameter)*
parameter = variable_reference | function_call | number | boolean | string_literal
number = [0-9]+ ("." [0-9]+)?
boolean = "true" | "false"
string_literal = "'" string_content "'"
```

**Examples:**
```
diff(liability, $gross_income)
sum($income1, $income2, $income3)
max(taxable_income, 0)
round(liability, 2)
min(tax_rate, 0.25)
lookup('income_tax_brackets', taxable_income)
lookup('tax_table_2024', $gross_income)
```

**Rules:**
- Function names must conform to the `identifier` syntax defined in section 12.1.1
- Parameters can be variable references, nested function calls, numbers, booleans, or string literals
- Numbers can be integers or decimals
- Booleans are the literals `true` or `false`
- String literals must be enclosed in single quotes (see section 12.1.4 for details)
- Nested function calls are allowed
- Whitespace around commas and parentheses is optional

#### 12.1.4. String Literals

String literals are used in function parameters where string values are required (e.g., table names in lookup functions):

**Syntax Pattern:**
```
string_literal = "'" string_content "'"
string_content = (escaped_char | [^'\\])*
escaped_char = "\\" ("'" | "\\" | "n" | "t" | "r" | any_char)
```

**Rules:**
- Must be enclosed in single quotes (`'...'`)
- Single quotes are used instead of double quotes to avoid conflicts within JSON strings
- Escape sequences are supported:
  - `\'` for literal single quote
  - `\\` for literal backslash
  - `\n` for newline
  - `\t` for tab
  - `\r` for carriage return
  - Any other character following `\` is treated literally

**Valid Examples:**
```
'income_tax_brackets'
'tax_table_2024'
'don\'t include this'
'file\\path\\name'
'line1\nline2'
```

**Invalid Examples:**
- `"double_quotes"` (double quotes not allowed)
- `'unterminated` (missing closing quote)
- `missing_quotes` (unquoted strings not allowed)

**Usage Context:**
- String literals are primarily used as parameters to functions that require string arguments
- They cannot be used in mathematical operations or conditional expressions
- Most commonly used with the `lookup(table_name, value)` function

**Implementation Note:**
String literals should only be accepted where explicitly required by function signatures. They are not valid in mathematical operations, variable assignments, or conditional logic to maintain type safety.

#### 12.1.5. Validation Rules

Implementations must validate:

1. **Identifier conformance** - All names follow the identifier pattern
2. **Variable reference validity** - All referenced variables exist or are predefined
3. **Function call syntax** - Proper parentheses, comma separation, valid parameters
4. **Prefix consistency** - Prefixes used only in references, not declarations

### 12.2. Implementation Philosophy

This subsection outlines the philosophical approach for implementing opentaxjs rule engines. These principles reflect the pragmatic spirit of the specification—prioritizing accessibility and real-world usability over theoretical purity.

#### 12.2.1. Be Forgiving by Default

**Warn First, Error Only When Asked**

The default mode of operation should be helpful rather than strict. When encountering ambiguous or potentially incorrect rule definitions:

- **Log warnings** for issues that might indicate mistakes but don't prevent meaningful calculation
- **Continue execution** whenever a reasonable interpretation exists
- **Only throw errors** when explicitly operating in strict mode or when the rule is genuinely uninterpretable

This philosophy recognizes that tax rules are often written by domain experts who are not necessarily JSON experts, and that minor formatting inconsistencies shouldn't prevent useful calculations.

Examples of forgiving behavior:
- Accept both `"deduct"` and `"subtract"` operation types interchangeably
- Allow trailing commas in JSON where the parser supports it
- Warn about unused variables rather than failing
- Auto-correct obvious typos in operation names when unambiguous
- Warn but interpret correctly when variable prefixes are misused (e.g., `$gross_income` in declarations or missing `$` in references)

#### 12.2.2. Embrace Pragmatic Imperfection

**Good Enough is Better Than Perfect**

This specification deliberately chooses practical solutions over theoretically optimal ones. Implementations should embrace this same pragmatism:

- **Use existing tooling**: Build on JSON parsing, validation, and tooling rather than inventing new formats
- **Favor simplicity**: When choosing between elegant and simple, choose simple and well-documented
- **Accept limitations**: Don't try to solve every possible tax scenario—focus on covering the most common cases well
- **Optimize for readability**: Code that tax professionals can understand is more valuable than code that computer scientists find beautiful

#### 12.2.3. Design for Human Understanding

**Humans Working with Tax Logic Are Your Primary Users**

While the rules are executed by machines, they are written, reviewed, and audited by humans—whether that's rule authors, developers implementing systems, or anyone else working with tax logic. Implementation decisions should prioritize human comprehension:

- **Error messages should be tax-domain-relevant**: Instead of "JSON parse error at line 47", provide "Invalid tax bracket definition in income_tax_brackets table"
- **Preserve rule context in execution**: When displaying calculated values, show which rule section produced them
- **Make debugging accessible**: Provide execution traces that tax professionals can follow without understanding the implementation
- **Document with tax examples**: Show how implementation features relate to real tax scenarios

#### 12.2.4. Let Rules Define Their Own Variables

**Implicit Initialization is More Natural Than Explicit Setup**

Variables in opentaxjs should emerge naturally from the rule logic rather than requiring separate initialization steps. When a rule first operates on a variable, that operation serves as its initialization:

- **Trust the rule author's intent**: If they set `liability` to 0, that's the initialization—don't require a separate "declare liability" step
- **Fail clearly on undefined references**: When a rule references a variable that hasn't been set, provide clear error messages in tax terms
- **Default sensibly for arithmetic**: Numeric operations on undefined variables should assume 0, making calculations more forgiving
- **Keep the focus on tax logic**: Rule authors should think about tax calculations, not variable management

#### 12.2.5. Build Bridges, Not Walls

**Enable Integration Rather Than Replacement**

opentaxjs is designed to work alongside existing systems, not replace them entirely. Implementations should facilitate integration:

- **Provide multiple interfaces**: Support both programmatic APIs and human-readable outputs
- **Export calculations transparently**: Make it easy to understand and verify how results were calculated
- **Accept data from various sources**: Be flexible about input formats while maintaining rule consistency
- **Enable gradual adoption**: Allow organizations to migrate one calculation at a time rather than requiring full system replacement

#### 12.2.6. Evolve Thoughtfully

**Change Should Enhance Accessibility**

As tax laws and implementation needs evolve, changes should maintain the specification's core commitment to accessibility:

- **Maintain backward compatibility** whenever possible to protect existing rule investments
- **Add complexity only when it solves real problems** that are frequently encountered in practice
- **Document the reasoning** behind implementation choices so future maintainers understand the trade-offs
- **Consider the full ecosystem**: Changes should benefit rule authors, auditors, and system integrators

#### 12.2.7. Trust but Verify

**Enable Confidence Through Transparency**

Tax calculations require high confidence, but this doesn't mean implementations should be rigid:

- **Make verification easy**: Provide clear audit trails and calculation breakdowns
- **Support multiple validation levels**: From basic syntax checking to deep semantic validation
- **Enable testing**: Make it straightforward to test rules with various inputs and verify expected outputs
- **Facilitate review**: Generate human-readable summaries of rule behavior for non-technical stakeholders

#### 12.2.8. Eliminate Null Values in Calculations

**Explicit is Better Than Implicit**

Null values are prohibited in calculation-related sections of opentaxjs rules because they violate the core principle of auditability and explicitness. This applies to:

- **Operations**: `value`, `target` fields must never be null
- **Expressions**: All variable references and function parameters must have explicit values
- **Tables**: `min`, `max`, `rate`, `base_tax` and other calculation fields must be explicit
- **Constants**: All defined constants must have concrete values
- **Conditional logic**: All comparison values must be explicit

**Why nulls break calculations:**
- **Nulls hide intent**: When a calculation value is null, it's unclear whether this represents "unlimited," "not applicable," "zero," or an error
- **Nulls break auditability**: Tax auditors cannot verify what null means in a tax calculation context
- **Nulls create implementation inconsistencies**: Different programming languages handle null arithmetic differently

**Instead of nulls in calculations, use:**
- **Predefined constants**: Use `$$MAX_TAXABLE_INCOME` for unlimited values
- **Explicit zeros**: Use `0` for amounts that should be zero
- **Explicit defaults**: Use meaningful default values appropriate to the calculation context

**Note:** Null values are acceptable in metadata fields (`author`, `effective_to`, `category`, etc.) since they don't participate in calculations.

This philosophical approach ensures that opentaxjs implementations remain accessible, practical, and aligned with the real-world needs of tax professionals while maintaining the technical rigor needed for accurate calculations.
