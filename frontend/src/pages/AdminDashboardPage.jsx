import { useEffect, useState } from 'react'
import {
  fetchAdminDashboard,
  suspendUser,
  reactivateUser,
  deleteListing,
  createCategory,
  updateCategory,
  deleteCategory,
  resolveReport,
  dismissReport,
} from '../services/adminService.js'
import Button from '../components/Button.jsx'
import '../styles/admin-dashboard.css'

function AdminDashboardPage() {
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAdminDashboard()
        setUsers(data.users ?? [])
        setCategories(data.categories ?? [])
        setReports(data.reports ?? [])
        setStats(data.stats ?? null)
      } catch (err) {
        setError('We could not load the admin dashboard right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleSuspend = async (userId) => {
    try {
      await suspendUser(userId)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: 'SUSPENDED' } : user,
        ),
      )
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to suspend this user right now.')
    }
  }

  const handleReactivate = async (userId) => {
    try {
      await reactivateUser(userId)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: 'ACTIVE' } : user,
        ),
      )
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to reactivate this user right now.')
    }
  }

  const handleDeleteListing = async (listingId) => {
    try {
      await deleteListing(listingId)
      setReports((prev) => prev.filter((report) => report.listingId !== listingId))
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to delete this listing right now.')
    }
  }

  const handleResolveReport = async (reportId) => {
    try {
      await resolveReport(reportId)
      setReports((prev) => prev.filter((report) => report.id !== reportId))
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to resolve this report right now.')
    }
  }

  const handleDismissReport = async (reportId) => {
    try {
      await dismissReport(reportId)
      setReports((prev) => prev.filter((report) => report.id !== reportId))
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to dismiss this report right now.')
    }
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString()
  }

  const handleCreateCategory = async () => {
    const name = window.prompt('Enter a name for the new category:')
    if (!name) return
    try {
      const created = await createCategory({ name })
      setCategories((prev) => [...prev, created])
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to create this category right now.')
    }
  }

  const handleUpdateCategory = async (category) => {
    const name = window.prompt('Update category name:', category.name)
    if (!name || name === category.name) return
    try {
      const updated = await updateCategory(category.id, { name })
      setCategories((prev) =>
        prev.map((cat) => (cat.id === category.id ? updated : cat)),
      )
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to update this category right now.')
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return
    try {
      await deleteCategory(categoryId)
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to delete this category right now.')
    }
  }

  if (loading) {
    return (
      <section className="admin-dashboard">
        <p>Loading admin dashboard…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="admin-dashboard">
        <p className="form-error">{error}</p>
      </section>
    )
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__title-group">
          <h1>Admin dashboard</h1>
          <p className="admin-dashboard__subtitle">
            Oversee users, categories, and listings across ShareBite using a
            focused, structured view.
          </p>
        </div>
      </div>

      {stats && (
        <article className="card">
          <h2 className="admin-dashboard__section-title">Platform overview</h2>
          <div className="admin-dashboard__stats-grid">
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Total users</span>
              <span className="admin-dashboard__stat-value">
                {stats.totalUsers ?? 0}
              </span>
            </div>
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Active users</span>
              <span className="admin-dashboard__stat-value">
                {stats.activeUsers ?? 0}
              </span>
            </div>
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Total listings</span>
              <span className="admin-dashboard__stat-value">
                {stats.totalListings ?? 0}
              </span>
            </div>
          </div>
        </article>
      )}

      <div className="admin-dashboard__grid">
        <article className="card">
          <h2 className="admin-dashboard__section-title">Users</h2>
          <div className="admin-dashboard__table-wrapper">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.status === 'ACTIVE' && (
                        <span className="badge badge-success">Active</span>
                      )}
                      {user.status === 'SUSPENDED' && (
                        <span className="badge badge-error">Suspended</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-dashboard__table-actions">
                        {user.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            onClick={() => handleSuspend(user.id)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => handleReactivate(user.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="admin-dashboard__sidebar">
          <article className="card">
            <div className="admin-dashboard__categories-header">
              <h2 className="admin-dashboard__section-title">Categories</h2>
              <Button variant="secondary" onClick={handleCreateCategory}>
                Add category
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="admin-dashboard__subtitle">
                No categories defined yet. Add categories to help donors label
                their listings clearly.
              </p>
            ) : (
              <div className="admin-dashboard__categories-list">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="admin-dashboard__categories-item"
                  >
                    <div className="admin-dashboard__categories-main">
                      <span className="admin-dashboard__categories-name">
                        {category.name}
                      </span>
                      {typeof category.usageCount === 'number' && (
                        <span className="admin-dashboard__categories-meta">
                          Used in {category.usageCount} listings
                        </span>
                      )}
                    </div>
                    <div className="admin-dashboard__table-actions">
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateCategory(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="card">
            <h2 className="admin-dashboard__section-title">Reports moderation</h2>
            {reports.length === 0 ? (
              <p className="admin-dashboard__subtitle">
                There are no open reports right now.
              </p>
            ) : (
              <div className="admin-dashboard__table-wrapper">
                <table className="admin-dashboard__table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Reported by</th>
                      <th>Reason</th>
                      <th>Details</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>{report.type}</td>
                        <td>
                          {report.type === 'LISTING'
                            ? (report.listingTitle || report.listingId || 'Listing')
                            : (`Request ${report.requestId || '—'}`)}
                        </td>
                        <td>{report.reporterUsername || 'Unknown'}</td>
                        <td>{report.reason || 'No details provided'}</td>
                        <td>{report.details || '—'}</td>
                        <td>{formatDateTime(report.createdAt)}</td>
                        <td>
                          <div className="admin-dashboard__table-actions">
                            <Button variant="primary" onClick={() => handleResolveReport(report.id)}>
                              Resolve
                            </Button>
                            <Button variant="outline" onClick={() => handleDismissReport(report.id)}>
                              Dismiss
                            </Button>
                            {report.type === 'LISTING' && report.listingId && (
                              <Button variant="danger" onClick={() => handleDeleteListing(report.listingId)}>
                                Delete listing
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}

export default AdminDashboardPage
