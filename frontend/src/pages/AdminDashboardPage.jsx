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

const ACTION_OPTIONS = [
  { value: 'NONE', label: 'No direct action' },
  { value: 'WARN_USER', label: 'Warn user' },
  { value: 'SUSPEND_USER', label: 'Suspend user' },
  { value: 'REMOVE_LISTING', label: 'Remove listing' },
  { value: 'MONITOR_ACCOUNT', label: 'Monitor account' },
  { value: 'ESCALATE', label: 'Escalate' },
]

const TARGET_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'LISTING', label: 'Listing' },
  { value: 'REQUEST', label: 'Request' },
  { value: 'MESSAGE', label: 'Message' },
]

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function formatEnumLabel(value) {
  if (!value) return '—'
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatShortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString()
  }

  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateOnlyMatch) return String(value)

  const localDate = new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
  return localDate.toLocaleDateString()
}

function formatPlainValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function pushDifference(differences, label, snapshotValue, currentValue, formatter = formatPlainValue) {
  if (normalizeComparableValue(snapshotValue) === normalizeComparableValue(currentValue)) {
    return
  }

  differences.push({
    label,
    snapshot: formatter(snapshotValue),
    current: formatter(currentValue),
  })
}

function getLatestMessageTimestamp(messages = []) {
  if (!messages.length) return null

  return messages.reduce((latest, message) => {
    const timestamp = message?.timestamp
    if (!timestamp) return latest
    if (!latest) return timestamp
    return new Date(timestamp) > new Date(latest) ? timestamp : latest
  }, null)
}

function getListingDifferences(snapshot, current, prefix = '') {
  if (!snapshot || !current) return []

  const differences = []
  const labelPrefix = prefix ? `${prefix} ` : ''

  pushDifference(differences, `${labelPrefix}Title`, snapshot.title, current.title)
  pushDifference(differences, `${labelPrefix}Category`, snapshot.categoryName, current.categoryName)
  pushDifference(differences, `${labelPrefix}Quantity`, snapshot.quantity, current.quantity)
  pushDifference(differences, `${labelPrefix}Expiry date`, snapshot.expiryDate, current.expiryDate, formatShortDate)
  pushDifference(differences, `${labelPrefix}Location`, snapshot.location, current.location)
  pushDifference(differences, `${labelPrefix}Status`, snapshot.status, current.status, formatEnumLabel)
  pushDifference(differences, `${labelPrefix}Description`, snapshot.description, current.description)
  pushDifference(
    differences,
    `${labelPrefix}Image`,
    snapshot.imageUrl ? 'Present' : 'Missing',
    current.imageUrl ? 'Present' : 'Missing',
  )

  return differences
}

function getRequestDifferences(snapshot, current) {
  if (!snapshot || !current) return []

  const differences = []

  pushDifference(differences, 'Request status', snapshot.status, current.status, formatEnumLabel)
  pushDifference(differences, 'Decision time', snapshot.decisionDate, current.decisionDate, formatDateTime)
  pushDifference(differences, 'Completion time', snapshot.completedDate, current.completedDate, formatDateTime)
  pushDifference(differences, 'Conversation messages', snapshot.messages?.length ?? 0, current.messages?.length ?? 0)
  pushDifference(
    differences,
    'Latest message',
    getLatestMessageTimestamp(snapshot.messages),
    getLatestMessageTimestamp(current.messages),
    formatDateTime,
  )

  return differences.concat(getListingDifferences(snapshot.listing, current.listing, 'Listing'))
}

function buildTargetCandidates(detail) {
  if (!detail) return []

  const seen = new Set()
  const candidates = []

  const addCandidate = (type, id, label) => {
    if (!type || !id) return
    const key = `${type}:${id}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ type, id, label })
  }

  addCandidate('USER', detail.reporter?.id, `Reporter: ${detail.reporter?.username || detail.reporter?.displayName || 'Unknown'}`)
  addCandidate('MESSAGE', detail.reportedMessageId, 'Reported message')
  addCandidate('LISTING', detail.listingEvidence?.listingId || detail.currentListingEvidence?.listingId, 'Reported listing')
  addCandidate('REQUEST', detail.requestEvidence?.requestId || detail.currentRequestEvidence?.requestId, 'Reported request')
  addCandidate('USER', detail.listingEvidence?.donor?.id || detail.currentListingEvidence?.donor?.id, 'Listing donor')
  addCandidate('USER', detail.requestEvidence?.donor?.id || detail.currentRequestEvidence?.donor?.id, 'Conversation donor')
  addCandidate('USER', detail.requestEvidence?.recipient?.id || detail.currentRequestEvidence?.recipient?.id, 'Conversation recipient')

  return candidates
}

function EvidencePersonDetails({ user }) {
  if (!user) return null

  return (
    <div className="admin-dashboard__evidence-grid">
      <div><span>Username</span><strong>{user.username || '—'}</strong></div>
      <div><span>Display name</span><strong>{user.displayName || '—'}</strong></div>
      <div><span>Role</span><strong>{formatEnumLabel(user.role)}</strong></div>
      <div><span>Organisation</span><strong>{user.organisationName || '—'}</strong></div>
      <div><span>Email</span><strong>{user.email || '—'}</strong></div>
    </div>
  )
}

function EvidenceUser({ user, label, variant = 'card' }) {
  if (!user) return null

  const className = variant === 'inline'
    ? 'admin-dashboard__participant-card'
    : 'admin-dashboard__evidence-block'

  return (
    <div className={className}>
      <h4>{label}</h4>
      <EvidencePersonDetails user={user} />
    </div>
  )
}

function buildComparisonRows(snapshotValue, currentValue, rows) {
  return rows.map((row) => ({
    label: row.label,
    snapshot: row.snapshot(snapshotValue),
    current: row.current(currentValue),
    formatter: row.formatter ?? formatPlainValue,
  }))
}

function ComparisonTable({ rows, snapshotLabel = 'Snapshot', currentLabel = 'Current' }) {
  return (
    <div className="admin-dashboard__comparison-table" role="table" aria-label={`${snapshotLabel} and ${currentLabel} comparison`}>
      <div className="admin-dashboard__comparison-row admin-dashboard__comparison-row--head" role="row">
        <span role="columnheader">Field</span>
        <span role="columnheader">{snapshotLabel}</span>
        <span role="columnheader">{currentLabel}</span>
      </div>
      {rows.map((row) => {
        const formattedSnapshot = row.formatter(row.snapshot)
        const formattedCurrent = row.formatter(row.current)
        const changed = normalizeComparableValue(row.snapshot) !== normalizeComparableValue(row.current)

        return (
          <div
            key={row.label}
            className={`admin-dashboard__comparison-row ${changed ? 'admin-dashboard__comparison-row--changed' : ''}`.trim()}
            role="row"
          >
            <span className="admin-dashboard__comparison-label" role="rowheader">{row.label}</span>
            <strong role="cell">{formattedSnapshot}</strong>
            <strong role="cell">{formattedCurrent}</strong>
          </div>
        )
      })}
    </div>
  )
}

function getRequestMetadataRows(snapshot, current) {
  return buildComparisonRows(snapshot, current, [
    {
      label: 'Request status',
      snapshot: (value) => value?.status,
      current: (value) => value?.status,
      formatter: formatEnumLabel,
    },
    {
      label: 'Requested',
      snapshot: (value) => value?.requestDate,
      current: (value) => value?.requestDate,
      formatter: formatDateTime,
    },
    {
      label: 'Decision',
      snapshot: (value) => value?.decisionDate,
      current: (value) => value?.decisionDate,
      formatter: formatDateTime,
    },
    {
      label: 'Completed',
      snapshot: (value) => value?.completedDate,
      current: (value) => value?.completedDate,
      formatter: formatDateTime,
    },
  ])
}

function getListingMetadataRows(snapshot, current) {
  return buildComparisonRows(snapshot, current, [
    {
      label: 'Title',
      snapshot: (value) => value?.title,
      current: (value) => value?.title,
    },
    {
      label: 'Quantity',
      snapshot: (value) => value?.quantity,
      current: (value) => value?.quantity,
    },
    {
      label: 'Expiry',
      snapshot: (value) => value?.expiryDate,
      current: (value) => value?.expiryDate,
      formatter: formatShortDate,
    },
    {
      label: 'Status',
      snapshot: (value) => value?.status,
      current: (value) => value?.status,
      formatter: formatEnumLabel,
    },
    {
      label: 'Location',
      snapshot: (value) => value?.location,
      current: (value) => value?.location,
    },
    {
      label: 'Category',
      snapshot: (value) => value?.categoryName,
      current: (value) => value?.categoryName,
    },
  ])
}

function getLatestNewMessage(snapshotMessages = [], currentMessages = []) {
  const snapshotIds = new Set(snapshotMessages.map((message) => message?.id).filter(Boolean))
  const newMessages = currentMessages.filter((message) => message?.id && !snapshotIds.has(message.id))
  return newMessages.at(-1) ?? null
}

function getConversationInsights(snapshot, current, reportedMessageId) {
  const insights = []
  const snapshotMessages = snapshot?.messages ?? []
  const currentMessages = current?.messages ?? []
  const snapshotIds = new Set(snapshotMessages.map((message) => message?.id).filter(Boolean))
  const newMessages = currentMessages.filter((message) => message?.id && !snapshotIds.has(message.id))

  if (newMessages.length > 0) {
    insights.push({
      title: `+${newMessages.length} new ${newMessages.length === 1 ? 'message' : 'messages'} after report`,
      detail: 'The current conversation includes replies that were not part of the captured snapshot.',
      tone: 'highlight',
    })

    const latestNewMessage = newMessages.at(-1)
    if (latestNewMessage) {
      insights.push({
        title: `Latest new message added by ${latestNewMessage.senderUsername || 'Unknown sender'}`,
        detail: formatDateTime(latestNewMessage.timestamp),
      })
    }
  }

  if (snapshot?.status !== current?.status) {
    insights.push({
      title: `Request status changed from ${formatEnumLabel(snapshot?.status)} to ${formatEnumLabel(current?.status)}`,
      detail: 'The request lifecycle changed after the report was submitted.',
    })
  }

  if (reportedMessageId) {
    const reportedMessageStillPresent = currentMessages.some((message) => message?.id === reportedMessageId)
    insights.push({
      title: reportedMessageStillPresent ? 'Reported message is still present in the current thread' : 'Reported message is missing from the current thread',
      detail: reportedMessageStillPresent
        ? 'Admins can compare the reported message against any new replies below.'
        : 'The originally reported message is no longer visible in the current conversation view.',
      tone: reportedMessageStillPresent ? 'focus' : 'warning',
    })
  }

  return insights
}

function getListingInsights(snapshot, current) {
  const insights = []
  const rawDifferences = getListingDifferences(snapshot, current)

  rawDifferences.forEach((difference) => {
    insights.push({
      title: `${difference.label} changed`,
      detail: `${difference.snapshot} -> ${difference.current}`,
    })
  })

  return insights
}

function InsightList({ items, emptyMessage }) {
  if (!items.length) {
    return <p className="admin-dashboard__subtitle">{emptyMessage}</p>
  }

  return (
    <div className="admin-dashboard__insight-list">
      {items.map((item) => (
        <article
          key={`${item.title}-${item.detail ?? ''}`}
          className={`admin-dashboard__insight-item ${item.tone ? `admin-dashboard__insight-item--${item.tone}` : ''}`.trim()}
        >
          <strong>{item.title}</strong>
          {item.detail && <p>{item.detail}</p>}
        </article>
      ))}
    </div>
  )
}

function ConversationMessage({ message, isReported = false, isNew = false }) {
  return (
    <article
      className={`admin-dashboard__chat-message ${isReported ? 'admin-dashboard__chat-message--reported' : ''} ${isNew ? 'admin-dashboard__chat-message--new' : ''}`.trim()}
    >
      <div className="admin-dashboard__chat-meta">
        <strong>{message?.senderUsername || 'Unknown sender'}</strong>
        <span>{formatEnumLabel(message?.senderRole)}</span>
        <time>{formatDateTime(message?.timestamp)}</time>
      </div>
      <p>{message?.content || '—'}</p>
      <div className="admin-dashboard__chat-badges">
        {isReported && <span className="badge badge-error">Reported message</span>}
        {isNew && <span className="badge badge-success">New after report</span>}
      </div>
    </article>
  )
}

function ConversationLane({
  title,
  messages = [],
  reportedMessageId = null,
  snapshotMessageIds = new Set(),
  markNewMessages = false,
}) {
  return (
    <section className="admin-dashboard__compare-lane">
      <header className="admin-dashboard__compare-lane-head">
        <span>{title}</span>
      </header>
      <div className="admin-dashboard__chat-thread">
        {messages.length > 0 ? (
          messages.map((message) => (
            <ConversationMessage
              key={message.id || `${message.timestamp}-${message.senderUsername}`}
              message={message}
              isReported={reportedMessageId === message.id}
              isNew={Boolean(markNewMessages && message?.id && !snapshotMessageIds.has(message.id))}
            />
          ))
        ) : (
          <p className="admin-dashboard__subtitle">No messages available in this state.</p>
        )}
      </div>
    </section>
  )
}

function ParticipantsSection({ donor, recipient }) {
  if (!donor && !recipient) return null

  return (
    <section className="admin-dashboard__evidence-strip">
      <div className="admin-dashboard__section-kicker">Participants</div>
      <div className="admin-dashboard__participants-grid">
        {donor && <EvidenceUser user={donor} label="Donor" variant="inline" />}
        {recipient && <EvidenceUser user={recipient} label="Recipient" variant="inline" />}
      </div>
    </section>
  )
}

function ListingCompareSection({ snapshot, current, label = 'Related listing' }) {
  if (!snapshot && !current) return null

  const snapshotImage = snapshot?.imageUrl || null
  const currentImage = current?.imageUrl || null
  const snapshotDonor = snapshot?.donor || null
  const currentDonor = current?.donor || null
  const metadataRows = getListingMetadataRows(snapshot, current)

  return (
    <section className="admin-dashboard__evidence-strip admin-dashboard__evidence-strip--subtle">
      <div className="admin-dashboard__section-kicker">{label}</div>
      <ComparisonTable rows={metadataRows} />
      <div className="admin-dashboard__listing-context">
        <div className="admin-dashboard__listing-media-grid">
          <div className="admin-dashboard__listing-media-slot">
            <span>Snapshot</span>
            {snapshotImage ? (
              <img src={snapshotImage} alt={snapshot?.title || 'Snapshot listing'} className="admin-dashboard__listing-thumb" />
            ) : (
              <div className="admin-dashboard__listing-thumb admin-dashboard__listing-thumb--placeholder">No image</div>
            )}
          </div>
          <div className="admin-dashboard__listing-media-slot">
            <span>Current</span>
            {currentImage ? (
              <img src={currentImage} alt={current?.title || 'Current listing'} className="admin-dashboard__listing-thumb" />
            ) : (
              <div className="admin-dashboard__listing-thumb admin-dashboard__listing-thumb--placeholder">No image</div>
            )}
          </div>
        </div>
        <div className="admin-dashboard__listing-notes">
          <div className="admin-dashboard__evidence-text">
            <span>Snapshot description</span>
            <p>{snapshot?.description || 'No description captured.'}</p>
          </div>
          <div className="admin-dashboard__evidence-text">
            <span>Current description</span>
            <p>{current?.description || 'No current description available.'}</p>
          </div>
          {(snapshotDonor || currentDonor) && (
            <div className="admin-dashboard__listing-donor-line">
              <span>Donor</span>
              <strong>{currentDonor?.displayName || currentDonor?.username || snapshotDonor?.displayName || snapshotDonor?.username || '—'}</strong>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ListingEvidenceWorkspace({ detail }) {
  const snapshot = detail?.listingEvidence
  const current = detail?.currentListingEvidence

  return (
    <div className="admin-dashboard__evidence-tool">
      <section className="admin-dashboard__evidence-strip">
        <div className="admin-dashboard__section-kicker">Listing evidence</div>
        <ComparisonTable rows={getListingMetadataRows(snapshot, current)} />
      </section>

      <section className="admin-dashboard__evidence-strip">
        <div className="admin-dashboard__section-kicker">What changed</div>
        <InsightList
          items={getListingInsights(snapshot, current)}
          emptyMessage="No meaningful listing changes were found between the captured evidence and the current live state."
        />
      </section>

      <ListingCompareSection snapshot={snapshot} current={current} label="Listing context" />
      <ParticipantsSection donor={current?.donor || snapshot?.donor} />
    </div>
  )
}

function RequestEvidenceWorkspace({ detail }) {
  const snapshot = detail?.requestEvidence
  const current = detail?.currentRequestEvidence
  const snapshotMessageIds = new Set((snapshot?.messages ?? []).map((message) => message?.id).filter(Boolean))
  const insights = getConversationInsights(snapshot, current, detail?.reportedMessageId)

  return (
    <div className="admin-dashboard__evidence-tool">
      <section className="admin-dashboard__evidence-strip admin-dashboard__evidence-strip--primary">
        <div className="admin-dashboard__section-kicker">Conversation evidence</div>
        <ComparisonTable rows={getRequestMetadataRows(snapshot, current)} />
        <div className="admin-dashboard__chat-compare">
          <ConversationLane
            title="Snapshot"
            messages={snapshot?.messages ?? []}
            reportedMessageId={detail?.reportedMessageId}
            markNewMessages={false}
          />
          <ConversationLane
            title="Current"
            messages={current?.messages ?? []}
            reportedMessageId={detail?.reportedMessageId}
            snapshotMessageIds={snapshotMessageIds}
            markNewMessages
          />
        </div>
      </section>

      <section className="admin-dashboard__evidence-strip">
        <div className="admin-dashboard__section-kicker">What changed</div>
        <InsightList
          items={insights}
          emptyMessage="No meaningful conversation changes were found after the report was captured."
        />
      </section>

      <ParticipantsSection donor={current?.donor || snapshot?.donor} recipient={current?.recipient || snapshot?.recipient} />
      <ListingCompareSection snapshot={snapshot?.listing} current={current?.listing} />
    </div>
  )
}

function ReportSummary({ detail }) {
  if (!detail) return null

  return (
    <div className="admin-dashboard__evidence-block admin-dashboard__summary-card">
      <div className="admin-dashboard__summary-head">
        <h4>Report summary</h4>
        <span className="badge badge-info">{formatEnumLabel(detail.type)}</span>
      </div>

      <div className="admin-dashboard__summary-section">
        <span className="admin-dashboard__summary-label">Classification</span>
        <div className="admin-dashboard__evidence-grid">
          <div><span>Category</span><strong>{formatEnumLabel(detail.policyCategory)}</strong></div>
          <div><span>Severity</span><strong>{formatEnumLabel(detail.severity)}</strong></div>
          <div><span>Status</span><strong>{formatEnumLabel(detail.status)}</strong></div>
          <div><span>Report ID</span><strong>{detail.id}</strong></div>
        </div>
      </div>

      <div className="admin-dashboard__summary-section">
        <span className="admin-dashboard__summary-label">Timeline</span>
        <div className="admin-dashboard__evidence-grid">
          <div><span>Created</span><strong>{formatDateTime(detail.createdAt)}</strong></div>
          <div><span>Evidence captured</span><strong>{formatDateTime(detail.evidenceCapturedAt)}</strong></div>
          <div><span>Reviewed</span><strong>{formatDateTime(detail.reviewedAt)}</strong></div>
          <div><span>Reviewed by</span><strong>{detail.reviewedByAdminUsername || '—'}</strong></div>
        </div>
      </div>

      <div className="admin-dashboard__summary-section">
        <span className="admin-dashboard__summary-label">Moderation action</span>
        <div className="admin-dashboard__evidence-grid">
          <div><span>Action taken</span><strong>{formatEnumLabel(detail.actionTaken)}</strong></div>
          <div><span>Action recorded</span><strong>{formatDateTime(detail.actionTakenAt)}</strong></div>
          <div><span>Target type</span><strong>{formatEnumLabel(detail.actionTargetType)}</strong></div>
          <div><span>Target ID</span><strong>{detail.actionTargetId || '—'}</strong></div>
        </div>
      </div>

      <div className="admin-dashboard__summary-section">
        <span className="admin-dashboard__summary-label">Report narrative</span>
        <div className="admin-dashboard__evidence-text">
          <span>Reason</span>
          <p>{detail.reason || '—'}</p>
        </div>
        <div className="admin-dashboard__evidence-text">
          <span>Details</span>
          <p>{detail.details || 'No extra details provided.'}</p>
        </div>
        <div className="admin-dashboard__evidence-text">
          <span>Reported message excerpt</span>
          <p>{detail.reportedMessageExcerpt || 'No exact message was singled out in this report.'}</p>
        </div>
        <div className="admin-dashboard__evidence-text">
          <span>Decision note</span>
          <p>{detail.decisionNote || 'No admin decision note recorded yet.'}</p>
        </div>
      </div>
    </div>
  )
}

function EvidenceStateSection({ title, subtitle, children }) {
  return (
    <section className="admin-dashboard__state-section">
      <div className="admin-dashboard__state-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="admin-dashboard__state-copy">{subtitle}</p>}
        </div>
      </div>
      <div className="admin-dashboard__state-body">
        {children}
      </div>
    </section>
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
  const [reviewForm, setReviewForm] = useState({
    decisionNote: '',
    actionTaken: 'NONE',
    actionTargetType: '',
    actionTargetId: '',
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
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
  const reviewTargetCandidates = useMemo(
    () => buildTargetCandidates(selectedReportDetail),
    [selectedReportDetail],
  )
  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase()
    if (!needle) return users

    return users.filter((user) => {
      const username = String(user.username || '').toLowerCase()
      const email = String(user.email || '').toLowerCase()
      const role = String(user.role || '').toLowerCase()
      const moderationState = user.monitoredAt ? 'monitored' : ''
      return (
        username.includes(needle)
        || email.includes(needle)
        || role.includes(needle)
        || moderationState.includes(needle)
      )
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

  const resetReviewForm = () => {
    setReviewForm({
      decisionNote: '',
      actionTaken: 'NONE',
      actionTargetType: '',
      actionTargetId: '',
    })
    setReviewError('')
  }

  const loadReportDetail = async (reportId) => {
    setSelectedReportId(reportId)
    setDetailLoading(true)
    setDetailError('')
    try {
      const detail = await fetchAdminReport(reportId)
      setSelectedReportDetail(detail)
      resetReviewForm()
    } catch (err) {
      setDetailError(err?.response?.data?.message || 'Unable to load report evidence right now.')
      setSelectedReportDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const buildReviewPayload = (includeAction) => ({
    decisionNote: reviewForm.decisionNote.trim(),
    actionTaken: includeAction ? reviewForm.actionTaken : 'NONE',
    actionTargetType: includeAction && reviewForm.actionTaken !== 'NONE'
      ? reviewForm.actionTargetType || null
      : null,
    actionTargetId: includeAction && reviewForm.actionTaken !== 'NONE'
      ? reviewForm.actionTargetId.trim() || null
      : null,
  })

  const handleResolveReport = async (reportId) => {
    const payload = buildReviewPayload(true)
    if (!payload.decisionNote) {
      setReviewError('Add a decision note before resolving this report.')
      return
    }

    setReviewSubmitting(true)
    setReviewError('')
    try {
      const updated = await resolveReport(reportId, payload)
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? { ...report, ...updated } : report)),
      )
      await loadReportDetail(reportId)
      setReportTab('HISTORY')
    } catch (err) {
      setReviewError(err?.response?.data?.message || 'Unable to resolve this report right now.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDismissReport = async (reportId) => {
    const payload = buildReviewPayload(false)
    if (!payload.decisionNote) {
      setReviewError('Add a decision note before dismissing this report.')
      return
    }

    setReviewSubmitting(true)
    setReviewError('')
    try {
      const updated = await dismissReport(reportId, payload)
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? { ...report, ...updated } : report)),
      )
      await loadReportDetail(reportId)
      setReportTab('HISTORY')
    } catch (err) {
      setReviewError(err?.response?.data?.message || 'Unable to dismiss this report right now.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleInspectReport = async (reportId) => {
    await loadReportDetail(reportId)
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
                    <td data-label="Name">{user.username}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Role">{user.role}</td>
                    <td data-label="Status">
                      <div className="admin-dashboard__user-status">
                        {user.status === 'ACTIVE' && <span className="badge badge-success">Active</span>}
                        {user.status === 'SUSPENDED' && <span className="badge badge-error">Suspended</span>}
                        {user.monitoredAt && (
                          <span
                            className="admin-dashboard__monitor-flag"
                            title={`Under monitoring since ${formatDateTime(user.monitoredAt)}`}
                          >
                            Monitored
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Actions">
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
                  <th>Category</th>
                  <th>Severity</th>
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
                    <td data-label="Type">{formatEnumLabel(report.type)}</td>
                    <td data-label="Category">{formatEnumLabel(report.policyCategory)}</td>
                    <td data-label="Severity">{formatEnumLabel(report.severity)}</td>
                    <td data-label="Target">
                      {report.type === 'LISTING'
                        ? (report.listingTitle || report.listingId || 'Listing')
                        : report.reportedMessageId
                          ? `Message ${report.reportedMessageId}`
                          : `Request ${report.requestId || '—'}`}
                    </td>
                    <td data-label="Reporter">{report.reporterUsername || 'Unknown'}</td>
                    <td data-label="Reason">{report.reason || '—'}</td>
                    <td data-label="Status">{formatEnumLabel(report.status)}</td>
                    <td data-label="Created">{formatDateTime(report.createdAt)}</td>
                    <td data-label="Actions">
                      <div className="admin-dashboard__table-actions">
                        <Button variant="outline" onClick={() => handleInspectReport(report.id)}>
                          View evidence
                        </Button>
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
          <div className="admin-dashboard__workspace">
            <aside className="admin-dashboard__workspace-sidebar">
              <ReportSummary detail={selectedReportDetail} />
              <EvidenceUser user={selectedReportDetail.reporter} label="Reporter" />

              {selectedReportDetail.canReview && (
                <div className="admin-dashboard__evidence-block">
                  <h4>Review decision</h4>
                  <div className="form-field">
                    <label className="form-label" htmlFor="admin-review-note">
                      Decision note <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="admin-review-note"
                      className="form-input admin-dashboard__review-textarea"
                      value={reviewForm.decisionNote}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, decisionNote: event.target.value }))}
                      placeholder="Summarize the evidence, policy rationale, and why this decision is fair."
                      rows={5}
                      maxLength={4000}
                      disabled={reviewSubmitting}
                    />
                  </div>

                  <div className="admin-dashboard__review-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="admin-review-action">Action taken</label>
                      <select
                        id="admin-review-action"
                        className="form-select"
                        value={reviewForm.actionTaken}
                        onChange={(event) => setReviewForm((prev) => ({
                          ...prev,
                          actionTaken: event.target.value,
                          actionTargetType: event.target.value === 'NONE' ? '' : prev.actionTargetType,
                          actionTargetId: event.target.value === 'NONE' ? '' : prev.actionTargetId,
                        }))}
                        disabled={reviewSubmitting}
                      >
                        {ACTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="admin-review-target-type">Action target type</label>
                      <select
                        id="admin-review-target-type"
                        className="form-select"
                        value={reviewForm.actionTargetType}
                        onChange={(event) => setReviewForm((prev) => ({ ...prev, actionTargetType: event.target.value }))}
                        disabled={reviewSubmitting || reviewForm.actionTaken === 'NONE'}
                      >
                        <option value="">Select a target</option>
                        {TARGET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="admin-review-target-id">Action target ID</label>
                    <input
                      id="admin-review-target-id"
                      className="form-input"
                      value={reviewForm.actionTargetId}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, actionTargetId: event.target.value }))}
                      placeholder="UUID of the entity that was acted on"
                      disabled={reviewSubmitting || reviewForm.actionTaken === 'NONE'}
                    />
                  </div>

                  {reviewTargetCandidates.length > 0 && (
                    <div className="admin-dashboard__quick-targets">
                      <span className="admin-dashboard__quick-targets-label">Quick targets</span>
                      <div className="admin-dashboard__quick-target-list">
                        {reviewTargetCandidates.map((candidate) => (
                          <button
                            key={`${candidate.type}-${candidate.id}`}
                            type="button"
                            className="admin-dashboard__quick-target"
                            onClick={() => setReviewForm((prev) => ({
                              ...prev,
                              actionTargetType: candidate.type,
                              actionTargetId: candidate.id,
                            }))}
                            disabled={reviewSubmitting || reviewForm.actionTaken === 'NONE'}
                          >
                            {candidate.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviewError && <p className="form-error">{reviewError}</p>}

                  <div className="admin-dashboard__detail-actions">
                    <Button variant="primary" onClick={() => handleResolveReport(selectedReportDetail.id)} disabled={reviewSubmitting}>
                      {reviewSubmitting ? 'Saving review...' : 'Resolve report'}
                    </Button>
                    <Button variant="danger" onClick={() => handleDismissReport(selectedReportDetail.id)} disabled={reviewSubmitting}>
                      {reviewSubmitting ? 'Saving review...' : 'Dismiss report'}
                    </Button>
                  </div>
                </div>
              )}

              {!selectedReportDetail.canReview && (
                <div className="admin-dashboard__evidence-block">
                  <h4>Review outcome</h4>
                  <p className="admin-dashboard__subtitle">
                    This report has already been reviewed. Use the summary to reference the stored decision note and action metadata.
                  </p>
                </div>
              )}
            </aside>

            <div className="admin-dashboard__workspace-main">
              {selectedReportDetail.type === 'LISTING' ? (
                <div className="admin-dashboard__state-section">
                  <div className="admin-dashboard__state-header">
                    <div>
                      <h3>Listing moderation evidence</h3>
                      <p className="admin-dashboard__state-copy">
                        Review the captured listing state first, then compare it against the current platform state in one aligned workspace.
                      </p>
                    </div>
                  </div>
                  <div className="admin-dashboard__state-body">
                    <ListingEvidenceWorkspace detail={selectedReportDetail} />
                  </div>
                </div>
              ) : (
                <div className="admin-dashboard__state-section">
                  <div className="admin-dashboard__state-header">
                    <div>
                      <h3>Conversation moderation evidence</h3>
                      <p className="admin-dashboard__state-copy">
                        Treat the conversation as the primary evidence. Compare the captured chat history against the current thread, then use the listing only as supporting context.
                      </p>
                    </div>
                  </div>
                  <div className="admin-dashboard__state-body">
                    <RequestEvidenceWorkspace detail={selectedReportDetail} />
                  </div>
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
