import { supabase } from '@/lib/supabase'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import { getSecurityQuestionLabel } from '@/data/securityQuestions'

const VERIFY_EDGE_FUNCTION = 'verify_security_answer'

async function fetchQuestionFromTable({ name, email }) {
  const { data, error } = await supabase
    .from('profiles')
    .select('security_question, name, email')
    .ilike('email', email)
    .maybeSingle()

  if (error) {
    if (error.code === '42703') {
      return {
        success: false,
        message:
          '보안 질문 기능이 아직 설정되지 않았습니다. Supabase SQL Editor에서 supabase/fix_account_recovery.sql 을 실행해주세요.',
      }
    }

    console.error('[SecurityRecovery] profiles security_question lookup failed', error)
    return { success: false, message: '비밀번호 찾기 질문을 불러오지 못했습니다.' }
  }

  if (!data || data.name?.trim().toLowerCase() !== name.toLowerCase()) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  if (!data.security_question) {
    return {
      success: false,
      message:
        '등록된 비밀번호 찾기 질문이 없습니다. 회원가입 시 질문을 등록했는지 확인해주세요.',
    }
  }

  return {
    success: true,
    question: data.security_question,
    questionLabel: getSecurityQuestionLabel(data.security_question) || data.security_question,
  }
}

export async function fetchPasswordRecoveryQuestion({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedName || !trimmedEmail) {
    return { success: false, message: '회원 확인 정보가 없습니다.' }
  }

  const { data, error } = await supabase.rpc('get_password_recovery_question', {
    p_name: trimmedName,
    p_email: trimmedEmail,
  })

  if (!error && data) {
    return {
      success: true,
      question: data,
      questionLabel: getSecurityQuestionLabel(data) || data,
    }
  }

  if (error?.code !== 'PGRST202') {
    console.error('[SecurityRecovery] get_password_recovery_question failed', error)
    return {
      success: false,
      message: '비밀번호 찾기 질문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  console.warn('[SecurityRecovery] RPC missing, falling back to profiles table')
  return fetchQuestionFromTable({ name: trimmedName, email: trimmedEmail })
}

async function verifyAnswerViaEdgeFunction({ name, email, answer }) {
  const { data, error } = await supabase.functions.invoke(VERIFY_EDGE_FUNCTION, {
    body: { name, email, answer },
  })

  if (error) {
    console.warn('[SecurityRecovery] verify_security_answer edge function unavailable', error)
    return null
  }

  return Boolean(data?.success)
}

export async function verifyPasswordRecoveryAnswer({ name, email, answer }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()
  const trimmedAnswer = String(answer ?? '').trim()

  if (!trimmedName) {
    return { success: false, message: '이름을 입력해주세요.' }
  }

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  if (!trimmedAnswer) {
    return { success: false, message: '답변을 입력해주세요.' }
  }

  const { data, error } = await supabase.rpc('verify_password_recovery_answer', {
    p_name: trimmedName,
    p_email: trimmedEmail,
    p_answer: trimmedAnswer,
  })

  if (!error) {
    if (!data) {
      return { success: false, message: AUTH_MESSAGES.securityAnswerMismatch }
    }

    return { success: true }
  }

  if (error.code !== 'PGRST202') {
    console.error('[SecurityRecovery] verify_password_recovery_answer failed', error)
    return {
      success: false,
      message: '답변 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  const edgeVerified = await verifyAnswerViaEdgeFunction({
    name: trimmedName,
    email: trimmedEmail,
    answer: trimmedAnswer,
  })

  if (edgeVerified === true) {
    return { success: true }
  }

  if (edgeVerified === false) {
    return { success: false, message: AUTH_MESSAGES.securityAnswerMismatch }
  }

  return {
    success: false,
    message:
      '답변 확인 기능이 아직 설정되지 않았습니다. Supabase SQL Editor에서 supabase/fix_account_recovery.sql 을 실행해주세요.',
  }
}
