import { supabase } from '@/lib/supabase'
import { getSecurityQuestionLabel } from '@/data/securityQuestions'

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

  if (error) {
    console.error('[SecurityRecovery] get_password_recovery_question failed', error)
    return {
      success: false,
      message: '비밀번호 찾기 질문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (!data) {
    return {
      success: false,
      message:
        '등록된 비밀번호 찾기 질문이 없습니다. 회원가입 시 질문을 등록했는지 확인해주세요.',
    }
  }

  return {
    success: true,
    question: data,
    questionLabel: getSecurityQuestionLabel(data) || data,
  }
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

  if (error) {
    console.error('[SecurityRecovery] verify_password_recovery_answer failed', error)
    return {
      success: false,
      message: '답변 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (!data) {
    return {
      success: false,
      message: '등록하신 질문과 답변이 일치하지 않습니다. 다시 확인해주세요.',
    }
  }

  return { success: true }
}
