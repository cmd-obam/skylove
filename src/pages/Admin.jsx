import './Signup.css'

function Admin() {
  return (
    <div className="signup-page">
      <div className="signup-page__container">
        <section className="signup-card" aria-label="관리자 페이지">
          <header className="signup-card__header">
            <h1 className="signup-card__title">관리자 페이지</h1>
            <div className="signup-card__accent" aria-hidden="true" />
            <p className="signup-card__description">관리자 전용 페이지입니다.</p>
          </header>
        </section>
      </div>
    </div>
  )
}

export default Admin
