export const sample1 =
`(() => {
  const a = [1, , -7, 88, NaN, Infinity];

  // For \`revealHiddenArrayProperties\`
  a['namedArrayProperty'] = 'usually hidden';

  const obj = {
    array: a,
    str1: "Doesn't need to be escaped, or does it?",
    str2: 'Say "cheese"!',
    str3: \`"double quotes" and 'single quotes'\`,
    date: new Date("1969-07-20T20:17:40Z"),
    regex: /\\d+[a-z]/i,
    bigInt: BigInt('-9223372036854775808'),
    bigDecimal: BigDecimal('3.1415926535897932384626433832795028841971693993751'),
    decimal: new Decimal('2.718281828459045235360287471352662')
  }

  return obj;
})()`;

// noinspection SpellCheckingInspection
export const sample2 =
`{
  // comments
  unquoted: 'and you can quote me on that',
  singleQuotes: 'I can use "double quotes" here',
  backtickQuotes: \`I can use "double quotes" $\\{ and 'single quotes' here\`,
  lineBreaks: "Look, Mom! \\
No \\\\n's!",
  // Underscore separators in numbers allowed
  million: 1_000_000,
  hexadecimal: /* block comments */ 0xdecaf,
  // Leading 0 indicates octal if no non-octal digits (8, 9) follow
  octal: [0o7, 074],
  binary: 0b100101,
  leadingDecimalPoint: .8675309, andTrailing: 8675309.,
  negativeZero: -0,
  positiveSign: +1,
  notDefined: undefined,
  bigInt: _BigInt("-9223372036854775808"),
  bigDecimal: _BigDecimal('3.141592653589793238462643383279'),
  decimal: _Decimal('2.718281828459045235360287471352662'),
  trailingComma: {a: 'in objects',}, andIn: ['arrays',],
  sparseArray: [1, 2, , , 5],
  // Function-like extended types. This is revived as a JavaScript \`Date\` object
  date: _Date('2019-07-28T08:49:58.202Z'),
  // Type container extended types. This is optionally revived as a JavaScript \`Date\` object
  date2: {"_$_": "Date", "_$_value": "2020-07-25T15:44:05.014Z"},
  // A relatively compact way to send and receive binary data
  buffer: _Uint8Array('T25lLiBUd28uIEZpdmUuLi4gSSBtZWFuIHRocmVlIQ=='),
  \`secret\`: 'Sssshhhh!',
  "backwardsCompatible": "with JSON",
}`;

export const sample3 = sample2
  .replace(/(\bbigInt: )[^,]+?,/, '$1-9223372036854775808n,')
  .replace(/(\bbigDecimal: )[^,]+?,/, '$13.1415926535897932384626433832795028841971693993751m,')
  .replace(/(\bdecimal: )[^,]+?,/, '$12.718281828459045235360287471352662d,');

// noinspection SpellCheckingInspection
export const sample4 =
  `{
  // comments
  unquoted: 'and you can quote me on that',
  singleQuotes: 'I can use "double quotes" here',
  lineBreaks: "Look, Mom! \\
No \\\\n's!",
  hexadecimal: /* block comments */ 0xdecaf,
  leadingDecimalPoint: .8675309, andTrailing: 8675309.,
  positiveSign: +1,
  trailingComma: {a: 'in objects',}, andIn: ['arrays',],
  'key': "doesn't have to be unquoted",
  "backwardsCompatible": "with JSON",
}`;

export const sharedSample1 =
  `// Convert all strings to uppercase
(key, value) => typeof value === 'string' ? value.toUpperCase() : value`;

export const replacerSample2 =
  `// Round all numbers to two decimal places
(key, value) => typeof value === 'number' ? Math.round(value * 100) / 100 : value`;

export const reviverSample2 =
  `// Disable implied octal interpretation of leading zeroes
(key, value, content) => typeof value === 'number' && /^[-+]?0/.test(content?.source) ?
  Number(content.source.replace('+', '')) : value`;

export const sharedSample3 =
  `// Delete any object member named "secret"
(key, value) => key === 'secret' ? JSONZ.DELETE : value`;

export const replacerSample4 =
  `// Display all integer values as hexadecimal
function hex(key, value) {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value) && Math.floor(value) === value)
    return JSONZ.LITERALLY_AS((value < 0 ? '-' : '') + '0x' + Math.abs(value).toString(16).toUpperCase());
  else if (typeof value === 'bigint') {
    const sign = value < 0 ? (value = -value) && '-' : '';
    return JSONZ.LITERALLY_AS(sign + '0x' + value.toString(16).toUpperCase() + 'n');
  }
  
  return value;
}`
