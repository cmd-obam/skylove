import { useState } from 'react'
import {
  getLoginProviderLabel,
  linkMemberAccount,
  searchLinkableAccounts,
} from '@/services/auth/accountLinks'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { maskEmail } from '@/utils/maskPii'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/pages/MemberManagement.css'

function AccountLinkModal({ isOpen, primaryMember, onClose, onLinked }) {
  const [keyword, setKeyword] = useState('')
  const [accounts, setAccounts] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  if (!isOpen || !primaryMember) {
    return null
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const trimmed = keyword.trim()

    if (trimmed.length < 2) {
      setError('아이디·이메일·이름을 2자 이상 입력해주세요.')
      setAccounts([])
      setSelectedUserId('')
      setSearched(false)
      return
    }

    setSearching(true)
    setError('')
    setSelectedUserId('')

    const result = await searchLinkableAccounts(trimmed)

    if (!result.success) {
      setError(result.message)
      setAccounts([])
      setSearched(true)
      setSearching(false)
      return
    }

    const filtered = (result.accounts || []).filter(
      (account) => account.user_id !== primaryMember.user_id,
    )

    setAccounts(filtered)
    setSearched(true)
    setSearching(false)
  }

  const handleLink = async () => {
    if (!selectedUserId) {
      setError('연결할 계정을 선택해주세요.')
      return
    }

    setLinking(true)
    setError('')

    const result = await linkMemberAccount(primaryMember.user_id, selectedUserId)

    if (!result.success) {
      setError(result.message)
      setLinking(false)
      return
    }

    setLinking(false)
    onLinked?.(result)
  }

  return (
    <div className="member-management-modal" role="presentation" onClick={onClose}>
      <div
        className="member-management-modal__dialog member-management-modal__dialog--detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-link-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="account-link-modal-title" className="member-management-modal__title">
          추가 계정 연결
        </h2>

        <p className="member-management-modal__message">
          대표 회원: {primaryMember.name || '-'}
          {primaryMember.email ? ` (${maskEmail(primaryMember.email)})` : ''}
          {'\n'}
          아이디·이메일·이름으로 연결할 계정을 검색한 뒤 선택해주세요.
        </p>

        <div className="member-management-modal__body">
          <form className="account-link-modal__search" onSubmit={handleSearch} autoComplete="off">
            <label htmlFor="account-link-search" className="visually-hidden">
              연결할 계정 검색
            </label>
            <input
              id="account-link-search"
              type="search"
              className="account-link-modal__search-input"
              placeholder="아이디 / 이메일 / 이름"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              autoComplete={AUTOCOMPLETE_OFF}
              disabled={searching || linking}
            />
            <button
              type="submit"
              className="account-link-modal__search-button"
              disabled={searching || linking}
            >
              {searching ? '검색 중...' : '검색'}
            </button>
          </form>

          {error ? (
            <p
              className="member-management-modal__status member-management-modal__status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {searched && accounts.length === 0 && !error ? (
            <p className="member-management-modal__status">검색 결과가 없습니다.</p>
          ) : null}

          {accounts.length > 0 ? (
            <ul className="account-link-modal__results">
              {accounts.map((account) => {
                const checked = selectedUserId === account.user_id

                return (
                  <li key={account.user_id}>
                    <label
                      className={`account-link-modal__result${
                        checked ? ' account-link-modal__result--selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="linkable-account"
                        value={account.user_id}
                        checked={checked}
                        onChange={() => setSelectedUserId(account.user_id)}
                        disabled={linking}
                      />
                      <span className="account-link-modal__result-body">
                        <strong>{account.name || '-'}</strong>
                        <span>
                          아이디 {account.username || '-'} ·{' '}
                          {getLoginProviderLabel(account.provider)} ·{' '}
                          {maskEmail(account.email)}
                        </span>
                        <span>가입일 {formatBoardDate(account.created_at) || '-'}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onClose}
            disabled={linking}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={handleLink}
            disabled={linking || !selectedUserId}
          >
            {linking ? '연결 중...' : '계정 연결'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountLinkModal
