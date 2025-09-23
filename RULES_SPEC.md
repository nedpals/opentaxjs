# opentaxjs Rules Specification

This document outlines the rules and structure for the opentaxjs rules file. Rules are a set of instructions that define how tax calculations should be performed.

## Features
1. **Human-readable while still machine-readable**: It should be designed to be easily understandable and modifiable by humans, while also being structured in a way that machines can easily parse and execute the rules.
2. **Auditable**: The rules should be structured in a way that allows for easy auditing and verification of the tax calculations, ensuring transparency and compliance with tax regulations.
3. **Extensible**: It should handle the different rules and scenarios that may arise in tax calculations, allowing for future extensions and modifications.
4. **Language and application-agnostic**: While the initial implementation is in JavaScript, it should be able to be adapted for use in other programming languages and applications beyond tax calculations (eg. generating tax documentations, automated tax filings, etc.)

## Disclaimer: It is NOT a perfect tax calculation format.
- It is designed to use existing infrastructure as much as possible such as the use of JSON, which is built into JavaScript and is available in many other programming languages.
- It does not cover all possible tax scenarios and rules, but it provides a foundation that can be extended to cover more complex cases.
- While we try to make it as human-readable as possible, it does not guarantee that non-technical users will be able to grasp and modify the rules without assistance. It is still recommended to have a basic understanding of the JSON data language to effectively work with this format.

In short, the opentaxjs rules format is designed to cover as many tax scenarios as possible in the most accessible way we can.

## Rules Format
> DISCLAIMER: This is not the actual calculation logic but only to demonstrate the kitchen sink features that is defined in the format.

```json
{
  "$version": "1.0.0",
  "name": "Income Tax",
  "law_basis": "Republic Act No. 8424 (Tax Reform Act of 1997)",
  "effective_from": "2024-01-01",
  "jurisdiction": "PH",
  "taxpayer_type": "INDIVIDUAL",
  "category": "INCOME_TAX",
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
          "max": null,
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
    "deductions": {
      "type": "number",
      "description": "Total deductions applicable to the income"
    },
    "is_freelance": {
      "type": "boolean",
      "description": "Indicates if the income is from freelance work"
    }
  },
  "outputs": {
    "cumulative_gross_income": {
      "type": "number",
      "description": "Cumulative gross income for the period"
    },
    "taxable_income": {
      "type": "number",
      "description": "Income subject to tax after deductions"
    }
  },
  "filing_schedules": [
    {
      "name": "Quarterly Income Tax Filing",
      "frequency": "quarterly",
      "filing_day": "$$quarterly_filing_day",
      "forms": {
        "primary": "1701Q",
        "attachments": [
          "Schedule 1 (Quarterly Income Statement)"
        ]
      }
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
      "forms": {
        "primary": "1701",
        "attachments": [
          "Schedule 1 (Background Information)",
          "Schedule 2 (Itemized Deductions)"
        ]
      }
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
          "target": "taxable_income",
          "value": "cumulative_gross_income"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "$deductions"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "$$standard_deduction"
        },
        {
          "type": "max",
          "target": "taxable_income",
          "value": 0
        }
      ]
    },
    {
      "name": "Apply tax calculation",
      "cases": [
        {
          "when": {
            "is_freelance": {
              "eq": true
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
          ]
        },
        {
          "when": {
            "is_freelance": {
              "eq": false
            }
          },
          "operations": [
            {
              "type": "lookup",
              "target": "liability",
              "table": "income_tax_brackets",
              "value": "taxable_income"
            }
          ]
        }
      ]
    },
    {
      "name": "Apply minimum tax exemption",
      "operations": [
        {
          "type": "min",
          "target": "liability",
          "value": "max(taxable_income, 0)"
        }
      ]
    }
  ]
}
```

A rules file is a JSON object that contains the following properties:
- `$version`: The version of the rules file format. This is used to ensure compatibility with the opentaxjs library.
- `name`: The name of the rule set. This is used to identify the rule set in the opentaxjs library.
- `law_basis`: The legal foundation for the tax rules (e.g., "Republic Act No. 8424 (Tax Reform Act of 1997)").
- `effective_from`: The date when these rules become effective (ISO date format: "YYYY-MM-DD").
- `effective_to`: Optional date when these rules expire or are superseded (ISO date format: "YYYY-MM-DD").
- `jurisdiction`: The jurisdiction where these rules apply (e.g., "PH" for Philippines, "US" for United States).
- `taxpayer_type`: The type of taxpayer these rules apply to (e.g., "INDIVIDUAL", "CORPORATION", "PARTNERSHIP").
- `category`: The category of tax being calculated (e.g., "INCOME_TAX", "VAT", "WITHHOLDING_TAX").
- `author`: Optional field indicating who created or maintains these rules.
- `constants`: An object that defines law-defined fixed values used throughout the rule set (using `$$` prefix). This makes it easy to update values when laws change without modifying the calculation logic.
- `tables`: An array of objects that define data tables, primarily used for progressive tax brackets and lookup tables. Each table has a `name` and structure for bracket-based calculations.
- `inputs`: An object that defines the user-provided inputs required for the rule set (using `$` prefix). They follow the [JSON Schema](https://json-schema.org/) format, which is a standard for describing the structure of JSON data. Each input has a `type` and a `description`.
- `outputs`: An object that defines the calculated outputs of the rule set (using no prefix). This is also in the [JSON Schema](https://json-schema.org/) format. Outputs are typically used to store intermediate results or final results of the calculations.
- `filing_schedules`: An array of objects that define the filing schedules for the rule set. Each object contains:
  - `name`: The name of the filing schedule.
  - `frequency`: The frequency of the filing (e.g., "quarterly", "annual").
  - `filing_day`: The day of the month when the filing is due.
  - `when`: An optional condition that determines when the filing schedule should be applied. This is an expression that can reference the outputs of the rule set.
- `flow`: An array of objects that define the flow of the rule set. Each object contains:
  - `name`: A descriptive name for the step in the flow.
  - `operations`: An array of operations to be performed in this step. Each operation can be one of the following types:
    - `set`: Sets a value to a target variable.
    - `multiply`: Multiplies a target variable by a value.
    - `deduct`: Deducts a value from a target variable.
  - `cases`: An optional array of cases that define conditional operations. Each case has:
    - `when`: A condition that must be met for the case to be applied. This is an expression that can reference the inputs and outputs of the rule set.
    - `operations`: An array of operations to be performed if the condition is met.

## Variables

Variables are containers that hold values for calculations. They can be categorized into three types based on their source/authority:

1. **Inputs** (`$` Prefix): These are user-provided values that the taxpayer supplies when calculating tax. They represent data from the taxpayer's domain and are defined in the `inputs` section (e.g., `$gross_income`).

2. **Constants** (`$$` Prefix): These are law-defined fixed values that come from tax regulations and remain the same across calculations. They represent data from the legal/regulatory domain and are defined in the `constants` section (e.g., `$$tax_exempt_threshold`).

3. **Calculated Values** (No Prefix): These are values computed during the calculation flow, including both user-defined outputs and system-defined special variables. They represent data from the rule calculation domain (e.g., `taxable_income`, `liability`).

### Variable declaration
Variables declared in the `inputs` and `outputs` are using [JSON Schema](https://json-schema.org/) format. This means that properties such as `minimum`, `maximum`, `enum`, and `pattern` can be used to define the constraints and structure of the variables. For example,

```json
{
  "type": "number",
  "description": "The total income for the period",
  "minimum": 0,
  "maximum": 1000000
}
```

Special variables **cannot** be redeclared in the rules file and will be thrown an error if attempted. They are predefined variables that are used in the calculations and flow of the rules file.

## Constants

Constants are fixed values that are used throughout the rule set. They are defined once in the `constants` object and can be referenced in operations and conditions. Constants make rules more maintainable by centralizing values that may change when laws are updated.

### Defining Constants

Constants are defined as key-value pairs in the `constants` object:

```json
{
  "constants": {
    "tax_exempt_threshold": 250000,
    "freelance_tax_rate": 0.08,
    "standard_deduction": 50000,
    "quarterly_filing_day": 15
  }
}
```

### Referencing Constants

Constants can be referenced in operations and conditions using their key name with the `$$` prefix:

```json
{
  "type": "deduct",
  "target": "taxable_income",
  "value": "$$tax_exempt_threshold"
}
```

```json
{
  "when": {
    "taxable_income": {
      "gt": "$$tax_exempt_threshold"
    }
  }
}
```

### Constant Types

Constants can be of any basic JSON type:
- **Numbers**: `"tax_threshold": 250000`, `"rate": 0.08`
- **Strings**: `"frequency": "quarterly"`, `"form_number": "1701Q"`
- **Booleans**: `"is_required": true`

## Tables

Tables define structured data used for calculations, primarily progressive tax brackets and lookup tables. They provide a way to organize complex data structures that can be referenced in operations.

### Defining Tables

Tables are defined as an array of objects, where each table has a `name` and structure:

```json
{
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
          "max": null,
          "rate": 0.25,
          "base_tax": 30000
        }
      ]
    }
  ]
}
```

### Table Structure

#### Tax Bracket Tables

Tax bracket tables define progressive tax rates. Each bracket contains:
- `min`: The minimum value for this bracket (inclusive)
- `max`: The maximum value for this bracket (exclusive), or `null` for the highest bracket
- `rate`: The tax rate to apply to the amount within this bracket
- `base_tax`: The cumulative tax from lower brackets

#### Custom Tables

Tables can be defined with custom structures for other lookup scenarios:

```json
{
  "name": "withholding_rates",
  "rates": [
    {
      "employment_type": "regular",
      "rate": 0.05
    },
    {
      "employment_type": "casual",
      "rate": 0.10
    }
  ]
}
```

### Using Tables in Operations

Tables are referenced in operations using the `lookup` operation type (see Operations section for details).

### Variable Referencing System

Variables are referenced using prefixes that indicate their source/authority domain. This eliminates ambiguity while maintaining readability and aligns with how tax professionals think about data sources.

**Important Distinction:**
- **Declaration**: When defining variables in their respective sections, use clean names without prefixes
- **Reference**: When using variables in operations and conditions, use prefixes to indicate source

**Implementation Note:**
Implementers should validate variable declarations and warn users (or throw errors in strict mode) if prefixes are accidentally used in declarations. For example:

**❌ Invalid (should trigger warning/error):**
```json
{
  "inputs": {
    "$gross_income": { "type": "number" }  // Error: prefix in declaration
  },
  "constants": {
    "$$tax_rate": 0.32  // Error: prefix in declaration
  }
}
```

**✅ Valid:**
```json
{
  "inputs": {
    "gross_income": { "type": "number" }  // Correct: no prefix
  },
  "constants": {
    "tax_rate": 0.32  // Correct: no prefix
  }
}
```

#### Declaration Syntax (No Prefixes)

Variables are declared in their sections without prefixes:

```json
{
  "inputs": {
    "gross_income": { "type": "number", "description": "..." }
  },
  "constants": {
    "tax_exempt_threshold": 250000
  },
  "outputs": {
    "taxable_income": { "type": "number", "description": "..." }
  }
}
```

#### Reference Syntax (With Prefixes)

Variables are referenced based on their authority/source domain:

1. **User Domain** (`$` Prefix): Values provided by the taxpayer
   - **Inputs**: `$gross_income`, `$deductions`, `$is_freelance`

2. **Legal Domain** (`$$` Prefix): Values defined by tax law and regulations
   - **Constants**: `$$tax_exempt_threshold`, `$$standard_deduction`, `$$freelance_tax_rate`

3. **Calculation Domain** (No Prefix): Values computed by the rule system
   - **Outputs**: `taxable_income`, `cumulative_gross_income`
   - **Special Variables**: `liability`

#### Why This Design Works

This approach groups variables by **authority/source** rather than runtime behavior:
- **User domain**: What the taxpayer provides and controls
- **Legal domain**: What tax law defines and controls
- **Calculation domain**: What the tax rules compute and control

#### Examples

```json
{
  "type": "set",
  "target": "taxable_income",
  "value": "$gross_income"
}
```

```json
{
  "type": "subtract",
  "target": "taxable_income",
  "value": "$$tax_exempt_threshold"
}
```

```json
{
  "type": "multiply",
  "target": "liability",
  "value": "$$freelance_tax_rate"
}
```

#### Variable Naming Rules

**Naming Standards:**
- Variable names should use lowercase with underscores (`tax_exempt_threshold`, not `TaxExemptThreshold`)
- Descriptive names are preferred over abbreviations (`gross_income` vs `gi`)
- Names must be unique within their category (inputs, outputs, constants)

**Declaration vs Reference:**
- **In declarations**: Use clean names without prefixes (`"gross_income": {...}`)
- **In references**: Use prefixes to indicate source (`$gross_income`, `$$tax_exempt_threshold`)

**No Conflicts Possible:**
With the source-based prefix system, naming conflicts are eliminated during reference:
- User domain values referenced with `$`: `$gross_income`, `$deductions`
- Legal domain values referenced with `$$`: `$$tax_exempt_threshold`, `$$standard_deduction`
- Calculated values referenced without prefix: `taxable_income`, `liability`

**Best Practices:**
- Choose names that clearly indicate the variable's purpose
- Avoid reusing base names across domains (e.g., don't have both input `income` and constant `income`)
- Use consistent naming patterns within a rule set
- Consider the audit trail: prefixes in references make data sources immediately clear

### Implementation Validation Guidelines

**For Library Implementers:**

Implementers should include validation logic to catch common prefix mistakes and ensure proper variable usage:

#### Declaration Validation

**Rule**: Variable declarations must NOT use prefixes

- Check all variable names in `inputs`, `constants`, and `outputs` sections
- If any variable name starts with `$` or `$$`, warn the user or throw an error
- Provide helpful correction suggestions (e.g., "Use 'gross_income' instead of '$gross_income' in declarations")

#### Reference Validation

**Rule**: Variable references must use appropriate prefixes or be valid calculated values

- Variables starting with `$$` should exist in the constants section (without the prefix)
- Variables starting with `$` should exist in the inputs section (without the prefix)
- Unprefixed variables should either exist in outputs section or be recognized special variables
- Provide clear error messages when referenced variables don't exist in their expected sections

#### Strict Mode Behavior

- **Warning Mode** (default): Log warnings for prefix mistakes but continue processing
- **Strict Mode**: Throw errors and halt processing when validation fails
- **Suggestion**: Include helpful error messages with correction suggestions

### Special variables
Special variables are system-defined variables that are used in calculations but not declared in other sections. They have no prefix (part of the calculation domain) and are available throughout the rules file. Some common special variables include:
- `liability`: Represents the current tax liability being calculated. This is the variable that holds the result of the tax calculation at any given point in the flow.

## Filing Schedules
Filing schedules define when tax filings are due. They define how frequent and when the tax filings should be made.

Each filing schedule has the following properties:
- `name`: The name of the filing schedule.
- `frequency`: The frequency of the filing
  - `quarterly`: Filing is due every quarter (every 3 months).
  - `annual`: Filing is due once a year.
- `when`: An optional condition that determines when the filing schedule should be applied. This is an expression that can reference the outputs of the rule set. If this condition is not met, the filing schedule will not be applied.
- `filing_day`: The day of the month when the filing is due. This is typically a number between 1 and 31, depending on the month. If the day exceeds the number of days in the month, it will be adjusted to the last day of the month.
- `forms`: An object that specifies the required tax forms and supporting documents for this filing schedule.
  - `primary`: The main form number required for the filing (e.g., "1701Q" for quarterly individual income tax).
  - `attachments`: An array of supporting documents or additional forms that must be submitted with the primary form.

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

The `forms` object provides detailed information about the required documentation for tax filings:

#### Primary Form
The `primary` field specifies the main tax form that must be filed. This is typically a government-issued form number that taxpayers need to complete and submit.

**Examples:**
- `"1701Q"`: Quarterly Individual Income Tax Return (Philippines)
- `"1701"`: Annual Individual Income Tax Return (Philippines)
- `"1702Q"`: Quarterly Corporate Income Tax Return (Philippines)

#### Attachments
The `attachments` field is an array of supporting documents, schedules, or additional forms that must accompany the primary form. This can include:

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
    "forms": {
      "primary": "1701Q",
      "attachments": [
        "Schedule 1 (Quarterly Income Statement)",
        "Schedule 7A (Creditable Withholding Tax)"
      ]
    }
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
    "forms": {
      "primary": "1701",
      "attachments": [
        "Schedule 1 (Background Information)",
        "Schedule 2 (Itemized Deductions)",
        "Schedule 7A (Creditable Withholding Tax)",
        "Supporting receipts for deductions",
        "Certificate of Compensation Payment (BIR Form 2316)"
      ]
    }
  }
]
```

## Conditional Rules

Conditional rules allows you to run specific operations or schedules based on certain conditions. This is useful for handling different scenarios in tax calculations, such as different tax rates for different income levels or requirement-specific cases.

At its core, a conditional rule is an `object` that contains the expression to be evaluated and the expected value to compare against, by explicitly telling the operator to use and the value to compare. For example:

```json
"cummulative_gross_income": {
  "lt": 250000
}
```

In this case `cummulative_gross_income` is the variable being evaluated, `lt` is the operator (less than), and `250000` is the value to compare against.

### Operators
Each rule must have an operator that defines how the condition is evaluated. The operator is a string that specifies the type of comparison to be made. They are case-sensitive and the value can be a number, string, or boolean depending on the context of the variable being evaluated.

The following operators can be used in conditional rules:
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal to
- `lte`: Less than or equal to

## Expressions

Expressions are used in conditional rules and operations to reference variables and perform calculations. They provide a way to dynamically compute values and make decisions based on the current state of variables.

### Variable References

Variables can be referenced in three different ways:

1. **User domain reference**: For inputs, use the `$` prefix.
   ```json
   "$gross_income"
   ```

2. **Legal domain reference**: For constants, use the `$$` prefix.
   ```json
   "$$tax_exempt_threshold"
   ```

3. **Calculation domain reference**: For outputs and special variables, use no prefix.
   ```json
   "taxable_income"
   "liability"
   ```

4. **Function calls**: Use built-in functions to perform calculations on variables.
   ```json
   "diff(liability, $gross_income)"
   ```

### Built-in Functions

The following built-in functions are available for use in expressions:

- `diff(a, b)`: Returns the absolute difference between two values `|a - b|`
- `sum(a, b, ...)`: Returns the sum of all provided values
- `max(a, b, ...)`: Returns the maximum value among the provided values
- `min(a, b, ...)`: Returns the minimum value among the provided values
- `round(value, decimals?)`: Rounds a value to the specified number of decimal places (default: 0)

### Expression Examples

```json
{
  "when": {
    "sum($gross_income, $additional_income)": {
      "gt": "$$tax_exempt_threshold"
    }
  }
}
```

```json
{
  "when": {
    "diff(liability, 0)": {
      "gt": 1000
    }
  }
}
```

## Operations

Operations define the actions that can be performed on variables during tax calculations. They are the building blocks of the calculation flow and allow you to manipulate values, perform arithmetic, and store results.

### Defining an Operation

Each operation is a JSON object that specifies the action to be performed. All operations have a `type` property that defines the kind of operation, and most have a `target` property that specifies which variable to modify.

Basic operation structure:
```json
{
  "type": "operation_type",
  "target": "variable_name",
  "value": "value_or_expression"
}
```

### Operation Types

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

#### `min`
Sets the target variable to the minimum value between its current value and the specified value.

```json
{
  "type": "min",
  "target": "liability",
  "value": "$$maximum_tax_cap"
}
```

#### `max`
Sets the target variable to the maximum value between its current value and the specified value.

```json
{
  "type": "max",
  "target": "taxable_income",
  "value": 0
}
```

#### `lookup`
Calculates a value based on a table lookup, primarily used for progressive tax brackets. This operation finds the appropriate bracket for the given value and calculates the tax based on the bracket structure.

```json
{
  "type": "lookup",
  "target": "liability",
  "table": "income_tax_brackets",
  "value": "taxable_income"
}
```

The lookup operation works by:
1. Finding the bracket where `value` falls between `min` and `max`
2. Calculating the tax for the amount within that bracket using the bracket's `rate`
3. Adding the `base_tax` from lower brackets
4. Setting the result to the target variable

**Example calculation:**
- If `taxable_income` is 500,000 and falls in the 400,000+ bracket (25% rate, 30,000 base tax)
- Tax = 30,000 + (500,000 - 400,000) × 0.25 = 55,000

### Using Expressions in Operations

Operations can use expressions and function calls in their `value` property:

```json
{
  "type": "set",
  "target": "adjusted_income",
  "value": "max($gross_income - $deductions, 0)"
}
```

```json
{
  "type": "multiply",
  "target": "liability",
  "value": "sum($$base_rate, $$additional_rate)"
}
```

## Operation Best Practices

When writing operations, follow these best practices to ensure clarity and maintainability:

### 1. Use Descriptive Variable Names
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

### 2. Group Related Operations
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
      "type": "max",
      "target": "taxable_income",
      "value": 0
    }
  ]
}
```

### 3. Initialize Variables Before Use
Always initialize variables before performing calculations:

```json
{
  "name": "Initialize liability calculation",
  "operations": [
    {
      "type": "set",
      "target": "liability",
      "value": 0
    }
  ]
}
```

### 4. Use Meaningful Step Names
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

### 5. Handle Edge Cases
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
      "when": {
        "taxable_income": {
          "gt": "$$tax_exempt_threshold"
        }
      },
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
