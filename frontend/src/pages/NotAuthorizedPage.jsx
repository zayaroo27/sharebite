function NotAuthorizedPage() {
  return (
    <section style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div className="card card--elevated" style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 className="card__title">Not authorized</h1>
        <p className="card__subtitle">
          You&rsquo;re signed in, but your account doesn&rsquo;t have access to this
          area.
        </p>
        <p>
          Please check that you&rsquo;re using the right role (Donor, Recipient, or
          Admin), or go back to your dashboard.
        </p>
      </div>
    </section>
  )
}

export default NotAuthorizedPage
