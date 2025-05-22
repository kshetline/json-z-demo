import { Decimal as BigDecimal } from 'decimal.js';
import { Decimal } from 'proposal-decimal';
import * as JSONZ from 'json-z';

// tslint:disable-next-line:variable-name
export const NO_RESULT = Symbol('NO_RESULT');

const functionEnvironment: any = {
  window: null,
  navigator: null,
  document: null,
  location: null,
  globalThis: null,
  eval: null,
  console: null,
  BigDecimal,
  Decimal,
  JSONZ
};

export function saferEval(expression: string): any {
  if (!expression || expression.trim() === '')
    return NO_RESULT;

  if (!/.*\breturn\b[^'"`}]+$/.test(expression))
    expression = `return (${expression})`;

  // eslint-disable-next-line no-new-func
  return new Function(...Object.keys(functionEnvironment), expression)(...Object.values(functionEnvironment));
}
