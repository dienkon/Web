import { expect, it } from 'vitest';
import { parseExamEntry } from './examInvite';

it.each(['GK1', 'toan12', 'exam-AbC_123'])('accepts a raw exam code/ID without changing case: %s', (value) => {
  expect(parseExamEntry(` ${value} `)).toEqual({ kind: 'code', value });
});
it.each([
  'https://dk-test-v3.vercel.app/student/exam/AbC123?utm_source=zalo',
  'https://dktest.vn/exam/AbC123',
  '/student/exam/AbC123/take',
  'https://dktest.vn/#/student/exam/AbC123',
  'https://dktest.vn/?examId=AbC123',
  'www.dktest.vn/student/exam/AbC123',
])('extracts an invitation into an internal exam ID: %s', (value) => {
  expect(parseExamEntry(value)).toEqual({ kind: 'exam', value: 'AbC123' });
});
it('recognizes code query invitations and programming exam links', () => {
  expect(parseExamEntry('https://dktest.vn/join?code=GK1')).toEqual({ kind: 'code', value: 'GK1' });
  expect(parseExamEntry('https://dktest.vn/code-exam/code-123')).toEqual({ kind: 'code-exam', value: 'code-123' });
});
it.each(['', 'javascript:alert(1)', 'data:text/html,test', 'https://evil.test/login', 'https://dktest.vn/student/exam/a%2Fb', 'https://dktest.vn/student/exam/%ZZ', 'https://dktest.vn/voucher/x?code=FREE', 'https://dktest.vn/student/exam/..', 'not a code', 'a'.repeat(4097)])('rejects invalid or non-exam input: %s', (value) => {
  expect(parseExamEntry(value)).toBeNull();
});
