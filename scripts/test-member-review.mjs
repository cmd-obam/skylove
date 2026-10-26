import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  countReviewLabels,
  memberMatchesReviewFilter,
  parseReviewLabels,
} from '../src/services/auth/memberReview.js'

const sql = readFileSync(new URL('../supabase/migrations/062_member_detail_signup_review.sql', import.meta.url), 'utf8')

test('member review SQL stays super-admin only and hides secrets', () => {
  assert.match(sql, /IF NOT public\.is_super_admin\(\)/)
  assert.match(sql, /PERFORM public\.assert_super_admin\(\)/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.member_auth_review\(uuid\) FROM PUBLIC/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.member_auth_review\(uuid\) FROM anon, authenticated/)
  assert.doesNotMatch(sql, /encrypted_password|confirmation_token|recovery_token/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_member_detail_for_super_admin\(uuid\) TO authenticated/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.list_profiles_for_super_admin\(text\) TO authenticated/)
})

test('review labels classify overlapping account states', () => {
  const members = [
    { review_labels: '정상' },
    { review_labels: '이메일 미인증,유사 계정,추가 조사' },
    { review_labels: '가입 경로 확인 불가,추가 조사' },
  ]

  assert.deepEqual(parseReviewLabels(members[1].review_labels), ['이메일 미인증', '유사 계정', '추가 조사'])
  assert.equal(memberMatchesReviewFilter(members[0], '정상'), true)
  assert.equal(memberMatchesReviewFilter(members[0], '추가 조사'), false)
  assert.equal(countReviewLabels(members)['추가 조사'], 2)
  assert.equal(countReviewLabels(members)['정상'], 1)
})
