export const sample1 =
`(() => {
  const a = [1, , -7, 88, NaN, Infinity];

  // For \`revealHiddenArrayProperties\`
  a['namedArrayProperty'] = 'usually hidden';

  const obj = {
    array: a,
    str1: "Doesn't need to be escaped, or does it?",
    str2: 'Say "cheese"!',
    str3: \`"double quotes"  and 'single quotes'\`,
    date: new Date("1969-07-20T20:17:40Z"),
    regex: /\\d+[a-z]/i,
    bigInt: BigInt('-9223372036854775808'),
    bigDecimal: BigDecimal('3.141592653589793238462643383279')
  }

  return obj;
})()`;

export const sample2 =
`{
  // comments
  unquoted: 'and you can quote me on that',
  singleQuotes: 'I can use "double quotes" here',
  backtickQuotes: \`I can use "double quotes"  and 'single quotes' here\`,
  lineBreaks: "Look, Mom! \\
No \\\\n's!",
  // Underscore separators in numbers allowed
  // (Safari currently doesn't like these underscores for JSONP.)
  million: 1_000_000,
  hexadecimal: 0xdecaf,
  // Leading 0 indicates octal if no non-octal digits (8, 9) follow
  octal: [0o7, 074],
  binary: 0b100101,
  leadingDecimalPoint: .8675309, andTrailing: 8675309.,
  negativeZero: -0,
  positiveSign: +1,
  notDefined: undefined,
  // Line below commented out to allow assisted JSON-P parsing
  // bigInt: -9223372036854775808n,
  bigInt: _BigInt("-9223372036854775808"),
  // Line below commented out to allow assisted JSON-P parsing
  // bigDecimal: 3.141592653589793238462643383279m,
  bigDecimal: _BigDecimal('3.141592653589793238462643383279'),
  trailingComma: 'in objects', andIn: ['arrays',],
  sparseArray: [1, 2, , , 5],
  // Function-like extended types. This is revived as a JavaScript \`Date\` object
  date: _Date('2019-07-28T08:49:58.202Z'),
  // Type container extended types. This is optionally revived as a JavaScript \`Date\` object
  date2: {"_$_": "Date", "_$_value": "2019-07-28T08:49:58.202Z"},
  // A relatively compact way to send and receive binary data
  buffer: _Uint8Array('T25lLiBUd28uIEZpdmUuLi4gSSBtZWFuIHRocmVlIQ=='),
  "backwardsCompatible": "with JSON",
}`;
