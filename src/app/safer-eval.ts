import * as BigInteger from 'big-integer';
import * as BigDecimal from 'decimal.js';
import * as JSONZ from 'json-z';

let bigIntImpl = BigInteger;

if (JSONZ.hasNativeBigInt())
  bigIntImpl = (window as any).BigInt;

export const NO_RESULT = Symbol();

export function saferEval(expression: string): any {
  if (!expression || expression.trim() === '')
    return NO_RESULT;

  if (!/.*\breturn\b[^'"`\}]+$/.test(expression))
    expression = `return (${expression})`;

  return new Function('window', 'document', 'location', 'globalThis', 'eval', 'console',
    'BigInt', 'BigDecimal',
    expression)(null, null, null, null, null, null,
      bigIntImpl, BigDecimal);
}
