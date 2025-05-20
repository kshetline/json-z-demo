import { Decimal as BigDecimal } from 'decimal.js';
import { Decimal } from 'proposal-decimal';

// tslint:disable-next-line:variable-name
export const NO_RESULT = Symbol('NO_RESULT');

export function saferEval(expression: string): any {
  if (!expression || expression.trim() === '')
    return NO_RESULT;

  if (!/.*\breturn\b[^'"`}]+$/.test(expression))
    expression = `return (${expression})`;

  // eslint-disable-next-line no-new-func
  return new Function('window', 'document', 'location', 'globalThis', 'eval', 'console', 'BigDecimal', 'Decimal',
    expression)(null, null, null, null, null, null, BigDecimal, Decimal);
}
