# OpenTaxJS Roadmap

This document outlines the current status, deliberate design decisions, and future considerations for the OpenTaxJS project. It serves as a guide for contributors and implementers to understand the project's philosophy and direction.

> *This roadmap is a living document and will be updated as the project evolves and community feedback is incorporated.*

## Current Status

The project has made significant progress beyond the initial specification phase. Currently:
- The rules specification is complete and comprehensive.
- An accompanying JSON schema has been created to validate the rules format.
- Infrastructure for the development of the library is complete.
- The expression parser and evaluator have been implemented.
- The core rule evaluation engine is complete and supports all specification features.
- The public API has been implemented with TypeScript types and comprehensive test coverage.
- Period calculation and filing schedule generation are functional.

The library is ready for use with basic tax calculations following the opentaxjs specification.

## Library Implementation Roadmap

The initial implementation is already functional and covers the core features of the specification. Roadmap will be updated later as more features and improvements are identified.

## Specification Roadmap

These features are **under evaluation** and may be added in future versions based on real-world usage and community feedback.

### 🤔 Currency and Precision Handling

> **Status**: Open for proposals. Not currently planned.

**Current Limitation**: No specification for currency types, decimal precision, or rounding rules.

**Potential Enhancement**: Built-in support for currency handling and rounding specifications.

**Considerations**:
- Critical for real-world implementations
- Varies significantly by jurisdiction
- Could be handled at implementation level vs. specification level

### 🤔 Enhanced Date/Time Support

> **Status**: Open for proposals. Not currently planned.

**Current Limitation**: Basic effective date support only.

**Potential Enhancement**: Support for mid-year rate changes, retroactive rules, time-based variables.

**Considerations**:
- Needed for jurisdictions with frequent tax law changes
- Adds complexity to rule evaluation
- May be better handled by rule versioning strategies

### 🤔 Rule Inheritance/Composition

> **Status**: Open for proposals. Not currently planned.

**Current Approach**: Rules are self-contained without imports or inheritance.

**Potential Enhancement**: Allow rules to reference or extend other rules.

**Considerations**:
- Would increase complexity for rule authors and auditors
- Creates security concerns around imported code
- Makes rules less portable and self-contained
- May require multiple files to understand a single rule

### 🤔 Complex Arithmetic Expressions

> **Status**: Open for proposals. Not currently planned.

**Current Approach**: Only atomic operations and simple expressions allowed.

**Potential Enhancement**: Support for complex arithmetic in single expressions.

**Considerations**:
- Could break the auditability principle
- May make step-by-step verification difficult
- Increases implementation complexity across languages
- Could reduce transparency for non-technical users

### 🤔 Advanced Input Validation

> **Status**: Open for proposals. Not currently planned.

**Current Approach**: Basic JSON Schema validation only.

**Potential Enhancement**: Built-in domain-specific validation rules.

**Considerations**:
- Validation requirements vary significantly by jurisdiction
- Could expand scope beyond calculation logic
- May be better handled at the application level
- Risk of specification bloat

### 🤔 Built-in Performance Optimizations

> **Status**: Planned. Will be added as we identify common usage patterns and performance bottlenecks across implementations.

**Current Approach**: No performance hints or optimization directives in the specification.

**Note**: Performance optimizations are left to implementers since optimization strategies vary significantly by language, environment, and use case. The specification focuses on correctness and clarity, allowing each implementation to optimize based on their specific requirements and usage patterns.

### 🤔 Rules Testing Framework

> **Status**: Planned. Open for implementation.

**Current Approach**: No built-in testing or verification mechanism in the specification.

**Potential Enhancement**: Standardized format for defining test cases with expected inputs and outputs for rules.

**Considerations**:
- Critical for ensuring rule accuracy and compliance
- Would enable automated verification of rule changes
- Could include test case formats for edge cases and boundary conditions
- Need to balance simplicity with comprehensive testing capabilities

### 🤔 Rules Editor

> **Status**: Planned. Open for implementation.

**Current Approach**: Rules are authored in standard text editors as JSON files.

**Potential Enhancement**: Web-based editor for creating and maintaining tax rules.

**Considerations**:
- Could provide syntax highlighting and validation
- Visual representation of rule flow and logic
- Integration with testing framework for immediate feedback
- Real-time validation against specification
- Could include templates for common tax calculation patterns

## Community Feedback

We welcome feedback on this roadmap. If you have use cases that aren't addressed by the current design or future considerations, please:

1. Open an issue on GitHub describing your specific scenario
2. Explain why the current approach doesn't work for your use case
3. Propose a solution that aligns with the project's philosophy
4. Consider implementation-level solutions before requesting specification changes

## Implementation Notes

For detailed implementation philosophy and guidelines, see Section 12.2 in [`RULES_SPEC.md`](./RULES_SPEC.md).
