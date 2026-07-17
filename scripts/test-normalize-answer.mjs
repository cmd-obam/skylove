import { normalizeAnswer } from '../src/services/auth/normalizeAnswer.js'

const CANONICAL = '하늘사랑교회'
const ENGLISH = 'haneulchurch'

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
  console.log(`PASS ${label}`)
}

function assertMatch(input, expected, label) {
  assertEqual(normalizeAnswer(input), expected, label)
}

function assertMismatch(a, b, label) {
  const left = normalizeAnswer(a)
  const right = normalizeAnswer(b)
  if (left === right) {
    throw new Error(`FAIL ${label}: unexpectedly matched ${JSON.stringify(left)}`)
  }
  console.log(`PASS ${label}`)
}

console.log('--- success cases (10) ---')
assertMatch('하늘사랑교회', CANONICAL, '1 exact')
assertMatch('하늘 사랑 교회', CANONICAL, '2 spaces')
assertMatch('  하늘사랑교회  ', CANONICAL, '3 trim')
assertMatch('하늘사랑교회', CANONICAL, '4 exact again')
assertMatch('하늘     사랑     교회', CANONICAL, '5 many spaces')
assertMatch('하늘\t사랑\t교회', CANONICAL, '6 tabs')
assertMatch('하늘\n사랑\n교회', CANONICAL, '7 newlines')
assertMatch(' 하늘  사랑\t교회\n ', CANONICAL, '8 mixed whitespace')
assertMatch('HaNeUlChurch', ENGLISH, '9 english mixed case')
assertMatch('haneulchurch', ENGLISH, '10 english lower')
assertEqual(normalizeAnswer('APPLE'), normalizeAnswer('apple'), '10b APPLE == apple')

console.log('--- fail cases (10) ---')
assertMismatch('하늘사랑교회', '하늘사랑', '1 partial prefix')
assertMismatch('하늘사랑교회', '하늘교회', '2 missing middle')
assertMismatch('하늘사랑교회', '사랑교회', '3 missing prefix')
assertMismatch('하늘사랑교회', '하늘사랑교훼', '4 typo')
assertMismatch('하늘사랑교회', '하늘 사랑교', '5 truncated')
assertMismatch('엄마', '어머니', '6 similar word')
assertMismatch('홍길동', 'ㅎㄱㄷ', '7 initials')
assertMismatch('서울', '서을', '8 typo vowel')
assertMismatch('하늘사랑교회', '하늘사랑교회님', '9 extra suffix')
assertMismatch('Apple', 'Appl', '10 english partial')

console.log('\nAll normalizeAnswer tests passed.')
