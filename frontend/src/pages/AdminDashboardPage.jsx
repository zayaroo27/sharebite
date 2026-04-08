import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminDashboard,
  fetchAdminReport,
  suspendUser,
  reactivateUser,
  createCategory,
  updateCategory,
  deleteCategory,
  resolveReport,
  dismissReport,
} from '../services/adminService.js'
import Button from '../components/Button.jsx'
import '../styles/admin-dashboard.css'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function EvidenceUser({ user, label }) {
  if (!user) return null

  return (
    <div className="admin-dashboard__evidence-block">
      <h4>{label}</h4>
      <div className="admin-dashboard__evidence-grid">
        <div><span>Username</span><strong>{user.username || '—'}</strong></div>
        <div><span>Display name</span><strong>{user.displayName || '—'}</strong></div>
        <div><span>Role</span><strong>{user.role || '—'}</strong></div>
        <div><span>Organisation</span><strong>{user.organisationName || '—'}</strong></div>
        <div><span>Email</span><strong>{user.email || '—'}</strong></div>
      </div>
    </div>
  )
}

function ListingEvidence({ listingEvidence }) {
  if (!listingEvidence) return null

  return (
    <div className="admin-dashboard__evidence-block">
      <div className="admin-dashboard__evidence-head">
        <h4>Listing evidence</h4>
        {listingEvidence.fromSnapshot && (
          <span className="badge badge-warning">Snapshot evidence</span>
        )}
      </div>
      <div className="admin-dashboard__evidence-grid">
        <div><span>Title</span><strong>{listingEvidence.title || '—'}</strong></div>
        <div><span>Category</span><strong>{listingEvidence.categoryName || '—'}</strong></div>
        <div><span>Quantity</span><strong>{listingEvidence.quantity || '—'}</strong></div>
        <div><span>Expiry date</span><strong>{listingEvidence.expiryDate || '—'}</strong></div>
        <div><span>Location</span><strong>{listingEvidence.location || '—'}</strong></div>
        <div><span>Status</span><strong>{listingEvidence.status || '—'}</strong></div>
      </div>
      <div className="admin-dashboard__evidence-text">
        <span>Description</span>
        <p>{listingEvidence.description || 'No description captured.'}</p>
      </div>
      {listingEvidence.imageUrl && (
        <div className="admin-dashboard__evidence-image-wrap">
          <img src={listingEvidence.imageUrl} alt={listingEvidence.title || 'Listing evidence'} />
        </div>
      )}
      <EvidenceUser user={listingEvidence.donor} label="Donor" />
    </div>
  )
}

function RequestEvidence({ requestEvidence }) {
  if (!requestEvidence) return null

  return (
    <div className="admin-dashboard__evidence-block">
      <div className="admin-dashboard__evidence-head">
        <h4>Conversation / request evidence</h4>
        {requestEvidence.fromSnapshot && (
          <span className="badge badge-warning">Snapshot evidence</span>
        )}
      </div>
      <div className="admin-dashboard__evidence-grid">
        <div><span>Request ID</span><strong>{requestEvidence.requestId || '—'}</strong></div>
        <div><span>Status</span><strong>{requestEvidence.status || '—'}</strong></div>
        <div><span>Requested</span><strong>{formatDateTime(requestEvidence.requestDate)}</strong></div>
        <div><span>Decision</span><strong>{formatDateTime(requestEvidence.decisionDate)}</strong></div>
        <div><span>Completed</span><strong>{formatDateTime(requestEvidence.completedDate)}</strong></div>
      </div>

      <ListingEvidence listingEvidence={requestEvidence.listing} />
      <EvidenceUser user={requestEvidence.donor} label="Donor" />
      <EvidenceUser user={requestEvidence.recipient} label="Recipient" />

      <div className="admin-dashboard__evidence-block">
        <h4>Conversation history</h4>
        {requestEvidence.messages?.length ? (
          <div className="admin-dashboard__messages-list">
            {requestEvidence.messages.map((message) => (
              <article key={message.id || `${message.timestamp}-${message.senderUsername}`} className="admin-dashboard__message-item">
                <div className="admin-dashboard__message-head">
                  <strong>{message.senderUsername || 'Unknown sender'}</strong>
                  <span>{message.senderRole || '—'}</span>
                  <time>{formatDateTime(message.timestamp)}</time>
                </div>
                <p>{message.content || '—'}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-dashboard__subtitle">No messages were captured for this request.</p>
        )}
      </div>
    </div>
  )
}

function AdminDashboardPage() {
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [selectedReportDetail, setSelectedReportDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reportTab, setReportTab] = useState('PENDING')
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardWarning, setDashboardWarning] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAdminDashboard()
        setUsers(data.users ?? [])
        setCategories(data.categories ?? [])
        setReports(data.reports ?? [])
        setStats(data.stats ?? null)
        if (Array.isArray(data.sectionErrors) && data.sectionErrors.length > 0) {
          setDashboardWarning(
            `Some admin sections could not be loaded: ${data.sectionErrors.join(', ')}.`,
          )
        } else {
          setDashboardWarning('')
        }
      } catch (err) {
        setError('We could not load the admin dashboard right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const pendingReports = useMemo(
    () => reports.filter((report) => String(report.status).toUpperCase() === 'PENDING'),
    [reports],
  )

  const reviewedReports = useMemo(
    () => reports.filter((report) => String(report.status).toUpperCase() !== 'PENDING'),
    [reports],
  )

  const visibleReports = reportTab === 'PENDING' ? pendingReports : reviewedReports
  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase()
    if (!needle) return users

    return users.filter((user) => {
      const username = String(user.username || '').toLowerCase()
      const email = String(user.email || '').toLowerCase()
      const role = String(user.role || '').toLowerCase()
      return username.includes(needle) || email.includes(needle) || role.includes(needle)
    })
  }, [users, userSearch])

  const handleSuspend = async (userId) => {
    try {
      await suspendUser(userId)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: 'SUSPENDED' } : user,
        ),
      )
    } catch {
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
    } catch {
      alert('Unable to reactivate this user right now.')
    }
  }

  const handleResolveReport = async (reportId) => {
    try {
      const updated = await resolveReport(reportId)
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? { ...report, ...updated } : report)),
      )
      if (selectedReportId === reportId) {
        setSelectedReportDetail((prev) => prev ? { ...prev, status: updated.status, reviewedAt: updated.reviewedAt, reviewedByAdminUsername: updated.reviewedByAdminUsername, canReview: false } : prev)
      }
      setReportTab('HISTORY')
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to resolve this report right now.')
    }
  }

  const handleDismissReport = async (reportId) => {
    try {
      const updated = await dismissReport(reportId)
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? { ...report, ...updated } : report)),
      )
      if (selectedReportId === reportId) {
        setSelectedReportDetail((prev) => prev ? { ...prev, status: updated.status, reviewedAt: updated.reviewedAt, reviewedByAdminUsername: updated.reviewedByAdminUsername, canReview: false } : prev)
      }
      setReportTab('HISTORY')
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to dismiss this report right now.')
    }
  }

  const handleInspectReport = async (reportId) => {
    setSelectedReportId(reportId)
    setDetailLoading(true)
    setDetailError('')
    try {
      const detail = await fetchAdminReport(reportId)
      setSelectedReportDetail(detail)
    } catch (err) {
      setDetailError(err?.response?.data?.message || 'Unable to load report evidence right now.')
      setSelectedReportDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    const name = window.prompt('Enter a name for the new category:')
    if (!name) return
    try {
      const created = await createCategory({ name })
      setCategories((prev) => [...prev, created])
    } catch {
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
    } catch {
      alert('Unable to update this category right now.')
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return
    try {
      await deleteCategory(categoryId)
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
    } catch {
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
            Review platform activity, inspect reported content, and make evidence-based moderation decisions.
          </p>
        </div>
      </div>

      {dashboardWarning && <p className="form-helper">{dashboardWarning}</p>}

      {stats && (
        <article className="card">
          <h2 className="admin-dashboard__section-title">Platform overview</h2>
          <div className="admin-dashboard__stats-grid">
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Total users</span>
              <span className="admin-dashboard__stat-value">{stats.totalUsers ?? 0}</span>
            </div>
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Active users</span>
              <span className="admin-dashboard__stat-value">{stats.activeUsers ?? 0}</span>
            </div>
            <div className="admin-dashboard__stat-item">
              <span className="admin-dashboard__stat-label">Total listings</span>
              <span className="admin-dashboard__stat-value">{stats.totalListings ?? 0}</span>
            </div>
          </div>
        </article>
      )}

      <div className="admin-dashboard__grid">
        <article className="card admin-dashboard__panel-card">
          <div className="admin-dashboard__panel-head">
            <h2 className="admin-dashboard__section-title">Users</h2>
            <input
              type="text"
              className="form-input admin-dashboard__search-input"
              placeholder="Search by username, email, or role"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
          </div>
          <div className="admin-dashboard__table-wrapper admin-dashboard__table-wrapper--panel">
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
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.status === 'ACTIVE' && <span className="badge badge-success">Active</span>}
                      {user.status === 'SUSPENDED' && <span className="badge badge-error">Suspended</span>}
                    </td>
                    <td>
                      <div className="admin-dashboard__table-actions">
                        {user.status === 'ACTIVE' ? (
                          <Button variant="outline" onClick={() => handleSuspend(user.id)}>
                            Suspend
                          </Button>
                        ) : (
                          <Button variant="primary" onClick={() => handleReactivate(user.id)}>
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-dashboard__empty-row">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="admin-dashboard__sidebar">
          <article className="card admin-dashboard__panel-card">
            <div className="admin-dashboard__categories-header">
              <h2 className="admin-dashboard__section-title">Categories</h2>
              <Button variant="secondary" onClick={handleCreateCategory}>
                Add category
              </Button>
            </div>
            {categories.length === 0 ? (
              <p className="admin-dashboard__subtitle">
                No categories defined yet. Add categories to help donors label their listings clearly.
              </p>
            ) : (
              <div className="admin-dashboard__categories-list admin-dashboard__categories-list--scroll">
                {categories.map((category) => (
                  <div key={category.id} className="admin-dashboard__categories-item">
                    <div className="admin-dashboard__categories-main">
                      <span className="admin-dashboard__categories-name">{category.name}</span>
                    </div>
                    <div className="admin-dashboard__table-actions">
                      <Button variant="outline" onClick={() => handleUpdateCategory(category)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDeleteCategory(category.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </div>

      <article className="card admin-dashboard__panel-card">
        <div className="admin-dashboard__reports-header">
          <div>
            <h2 className="admin-dashboard__section-title">Reports moderation</h2>
            <p className="admin-dashboard__subtitle">
              Open a report to inspect the actual listing or conversation evidence before making a decision.
            </p>
          </div>
          <div className="admin-dashboard__report-tabs">
            <Button
              variant={reportTab === 'PENDING' ? 'primary' : 'outline'}
              onClick={() => setReportTab('PENDING')}
            >
              Pending ({pendingReports.length})
            </Button>
            <Button
              variant={reportTab === 'HISTORY' ? 'primary' : 'outline'}
              onClick={() => setReportTab('HISTORY')}
            >
              History ({reviewedReports.length})
            </Button>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <p className="admin-dashboard__subtitle">
            {reportTab === 'PENDING'
              ? 'There are no pending reports right now.'
              : 'There is no reviewed report history yet.'}
          </p>
        ) : (
          <div className="admin-dashboard__table-wrapper admin-dashboard__table-wrapper--panel">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Reporter</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.type}</td>
                    <td>{report.type === 'LISTING' ? (report.listingTitle || report.listingId || 'Listing') : `Request ${report.requestId || '—'}`}</td>
                    <td>{report.reporterUsername || 'Unknown'}</td>
                    <td>{report.reason || '—'}</td>
                    <td>{report.status}</td>
                    <td>{formatDateTime(report.createdAt)}</td>
                    <td>
                      <div className="admin-dashboard__table-actions">
                        <Button variant="outline" onClick={() => handleInspectReport(report.id)}>
                          View evidence
                        </Button>
                        {report.status === 'PENDING' && (
                          <>
                            <Button variant="primary" onClick={() => handleResolveReport(report.id)}>
                              Resolve
                            </Button>
                            <Button variant="danger" onClick={() => handleDismissReport(report.id)}>
                              Dismiss
                            </Button>
                          </>
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

      <article className="card">
        <div className="admin-dashboard__evidence-head">
          <h2 className="admin-dashboard__section-title">Moderation evidence</h2>
          {selectedReportDetail?.status && (
            <span className={`badge ${selectedReportDetail.status === 'PENDING' ? 'badge-warning' : 'badge-info'}`}>
              {selectedReportDetail.status}
            </span>
          )}
        </div>

        {!selectedReportId && !detailLoading && (
          <p className="admin-dashboard__subtitle">
            Choose a report from the table above to inspect its evidence.
          </p>
        )}

        {detailLoading && <p>Loading report evidence…</p>}
        {detailError && <p className="form-error">{detailError}</p>}

        {selectedReportDetail && !detailLoading && !detailError && (
          <div className="admin-dashboard__evidence-layout">
            <div className="admin-dashboard__evidence-column">
              <div className="admin-dashboard__evidence-block">
                <h4>Report summary</h4>
                <div className="admin-dashboard__evidence-grid">
                  <div><span>Report ID</span><strong>{selectedReportDetail.id}</strong></div>
                  <div><span>Type</span><strong>{selectedReportDetail.type}</strong></div>
                  <div><span>Created</span><strong>{formatDateTime(selectedReportDetail.createdAt)}</strong></div>
                  <div><span>Reviewed</span><strong>{formatDateTime(selectedReportDetail.reviewedAt)}</strong></div>
                  <div><span>Reviewed by</span><strong>{selectedReportDetail.reviewedByAdminUsername || '—'}</strong></div>
                </div>
                <div className="admin-dashboard__evidence-text">
                  <span>Reason</span>
                  <p>{selectedReportDetail.reason}</p>
                </div>
                <div className="admin-dashboard__evidence-text">
                  <span>Details</span>
                  <p>{selectedReportDetail.details || 'No extra details provided.'}</p>
                </div>
              </div>

              <EvidenceUser user={selectedReportDetail.reporter} label="Reporter" />
            </div>

            <div className="admin-dashboard__evidence-column">
              {selectedReportDetail.type === 'LISTING' ? (
                <ListingEvidence listingEvidence={selectedReportDetail.listingEvidence} />
              ) : (
                <RequestEvidence requestEvidence={selectedReportDetail.requestEvidence} />
              )}

              {selectedReportDetail.canReview && (
                <div className="admin-dashboard__detail-actions">
                  <Button variant="primary" onClick={() => handleResolveReport(selectedReportDetail.id)}>
                    Resolve report
                  </Button>
                  <Button variant="danger" onClick={() => handleDismissReport(selectedReportDetail.id)}>
                    Dismiss report
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  )
}

export default AdminDashboardPage
