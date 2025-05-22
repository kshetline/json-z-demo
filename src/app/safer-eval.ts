import { Decimal as BigDecimal } from 'decimal.js';
import { Decimal } from 'proposal-decimal';
import * as JSONZ from 'json-z';
import * as babel from '@babel/standalone';

export const NO_RESULT = Symbol('NO_RESULT');

babel.registerPlugin('decimal.js', BigDecimal);
babel.registerPlugin('proposal-decimal', Decimal);
babel.registerPlugin('json-z', JSONZ);

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

  // Have Babel find syntax errors in the expression before trying to compile it.
  babel.transform(expression.trim().startsWith('{') ? `(${expression})` : expression,
    { parserOpts: { strictMode: false } });

  if (!/.*\breturn\b[^'"`}]+$/.test(expression))
    expression = `return (${expression})`;

  // eslint-disable-next-line no-new-func
  return Function(...Object.keys(functionEnvironment), expression)(...Object.values(functionEnvironment));
}
