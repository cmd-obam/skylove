import { FOOTER_MODALS } from '@/data/footerPolicies'

export const SIGNUP_CONSIGNMENT_CONTENT = (
  <div className="policy-doc">
    <h3>개인정보 처리 위탁</h3>
    <p>
      하늘사랑교회는 원활한 홈페이지 운영과 회원 서비스 제공을 위해 필요한 경우 개인정보 처리
      업무를 외부 전문업체에 위탁할 수 있습니다.
    </p>
    <p>
      현재 하늘사랑교회는 개인정보 처리 업무를 외부 업체에 위탁하지 않습니다. 향후 위탁 업무가
      발생하는 경우 위탁 대상, 위탁 업무 내용, 위탁 기간 등을 홈페이지를 통해 공개하겠습니다.
    </p>
    <p>
      회원가입 및 홈페이지 이용 과정에서 사용되는 시스템·인프라는 서비스 제공을 위한 범위 내에서
      운영되며, 관련 법령과 개인정보처리방침에 따라 안전하게 관리됩니다.
    </p>
  </div>
)

export const SIGNUP_TERM_SECTIONS = [
  {
    id: 'terms',
    key: 'terms',
    title: '서비스 이용약관',
    content: FOOTER_MODALS.terms.content,
  },
  {
    id: 'privacy',
    key: 'privacy',
    title: '개인정보 수집 동의',
    content: FOOTER_MODALS.privacy.content,
  },
  {
    id: 'consignment',
    key: 'consignment',
    title: '개인정보 처리 위탁',
    content: SIGNUP_CONSIGNMENT_CONTENT,
  },
]

export const SIGNUP_AGREE_ALL_LABEL =
  '서비스 이용 약관, 개인정보 수집 및 이용, 개인정보 처리 위탁에 모두 동의합니다.'
