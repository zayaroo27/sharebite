import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchConversation, sendMessage } from '../services/messageService.js'
import { fetchDonorDashboard } from '../services/donorService.js'
import { fetchRecipientDashboard } from '../services/recipientService.js'
import { reportRequest } from '../services/reportService.js'
import { useAuth } from '../hooks/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'
import Avatar from '../components/Avatar.jsx'
import ReportModal from '../components/ReportModal.jsx'
import '../styles/messages.css'

const POLL_INTERVAL_MS = 5000
const LAST_SEEN_KEY_PREFIX = 'sharebite_last_seen_request_'

function formatTimestamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function getLastSeen(requestId) {
  try {
    return window.localStorage?.getItem(`${LAST_SEEN_KEY_PREFIX}${requestId}`) || ''
  } catch {
    return ''
  }
}

function setLastSeen(requestId, timestamp) {
  if (!requestId || !timestamp) return
  try {
    window.localStorage?.setItem(`${LAST_SEEN_KEY_PREFIX}${requestId}`, String(timestamp))
  } catch {
    // Ignore storage errors
  }
}

function MessagesPage() {
  const { requestId } = useParams()
  const { user } = useAuth()
  const { markMessageNotificationsAsRead } = useNotifications()
  const [conversations, setConversations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState(requestId || '')
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [reportingConversation, setReportingConversation] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportFeedback, setReportFeedback] = useState('')
  const [error, setError] = useState('')
  const [conversationError, setConversationError] = useState('')

  useEffect(() => {
    markMessageNotificationsAsRead()
  }, [markMessageNotificationsAsRead])

  useEffect(() => {
    if (requestId) {
      setSelectedRequestId(requestId)
    }
  }, [requestId])

  useEffect(() => {
    async function loadConversations() {
      setLoadingConversations(true)
      setConversationError('')
      try {
        let requests = []

        if (user?.role === 'DONOR') {
          const data = await fetchDonorDashboard()
          requests = data?.requests ?? []
        } else if (user?.role === 'RECIPIENT') {
          const data = await fetchRecipientDashboard()
          requests = data?.requests ?? []
        }

        const enriched = await Promise.all(
          requests.map(async (request) => {
            const id = request.requestId ?? request.id
            if (!id) {
              return {
                ...request,
                requestId: id,
                latestMessage: null,
                unread: false,
              }
            }

            try {
              const convo = await fetchConversation(id)
              const latestMessage = Array.isArray(convo) && convo.length > 0
                ? convo[convo.length - 1]
                : null

              const latestTs = latestMessage?.timestamp || ''
              const lastSeen = getLastSeen(id)
              const mine = latestMessage?.senderUsername?.toLowerCase() === user?.username?.toLowerCase()
              const unread = Boolean(latestTs && !mine && (!lastSeen || new Date(latestTs) > new Date(lastSeen)))

              return {
                ...request,
                requestId: id,
                latestMessage,
                unread,
              }
            } catch {
              return {
                ...request,
                requestId: id,
                latestMessage: null,
                unread: false,
              }
            }
          }),
        )

        setConversations(enriched)
        if (!selectedRequestId && enriched.length > 0) {
          setSelectedRequestId(enriched[0].requestId)
        }
        setError('')
      } catch (err) {
        setConversationError(err?.response?.data?.message || 'Unable to load conversations right now.')
      } finally {
        setLoadingConversations(false)
      }
    }

    if (!user?.role) return
    loadConversations()
  }, [user?.role, user?.username, selectedRequestId])

  const selectedConversation = useMemo(
    () => conversations.find((c) => String(c.requestId) === String(selectedRequestId)) || null,
    [conversations, selectedRequestId],
  )

  useEffect(() => {
    if (!selectedRequestId) {
      setMessages([])
      return undefined
    }

    let active = true

    async function loadConversationMessages() {
      setLoadingMessages(true)
      try {
        const data = await fetchConversation(selectedRequestId)
        if (!active) return
        const list = Array.isArray(data) ? data : []
        setMessages(list)
        setError('')

        const latest = list.length > 0 ? list[list.length - 1] : null
        if (latest?.timestamp) {
          setLastSeen(selectedRequestId, latest.timestamp)
          setConversations((prev) => prev.map((conversation) => (
            String(conversation.requestId) === String(selectedRequestId)
              ? { ...conversation, latestMessage: latest, unread: false }
              : conversation
          )))
        }
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.message || 'Unable to load this conversation right now.')
      } finally {
        if (active) {
          setLoadingMessages(false)
        }
      }
    }

    loadConversationMessages()
    const intervalId = window.setInterval(loadConversationMessages, POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [selectedRequestId])

  const filteredConversations = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    if (!needle) return conversations

    return conversations.filter((conversation) => {
      const listing = String(conversation.listingTitle || '').toLowerCase()
      const otherPerson = String(
        user?.role === 'DONOR' ? conversation.recipientName : conversation.donorName,
      ).toLowerCase()
      return listing.includes(needle) || otherPerson.includes(needle)
    })
  }, [conversations, searchTerm, user?.role])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedRequestId) return

    const content = newMessage.trim()
    if (!content) return

    setSending(true)
    try {
      const created = await sendMessage(selectedRequestId, content)
      setMessages((prev) => [...prev, created])
      setConversations((prev) => prev.map((conversation) => (
        String(conversation.requestId) === String(selectedRequestId)
          ? { ...conversation, latestMessage: created, unread: false }
          : conversation
      )))
      if (created?.timestamp) {
        setLastSeen(selectedRequestId, created.timestamp)
      }
      setNewMessage('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to send message right now.')
    } finally {
      setSending(false)
    }
  }

  const getParticipantName = (conversation) => (
    user?.role === 'DONOR' ? conversation.recipientName : conversation.donorName
  )

  const getParticipantRole = () => (
    user?.role === 'DONOR' ? 'RECIPIENT' : 'DONOR'
  )

  const getParticipantImageUrl = (conversation) => (
    user?.role === 'DONOR' ? conversation.recipientProfileImageUrl : conversation.donorProfileImageUrl
  )

  const handleReportConversation = async () => {
    if (!selectedConversation?.requestId) return
    setReportError('')
    setReportFeedback('')
    setReportModalOpen(true)
  }

  const handleSubmitConversationReport = async ({ reason, details }) => {
    if (!selectedConversation?.requestId) return
    setReportingConversation(true)
    try {
      await reportRequest(selectedConversation.requestId, reason, details)
      setReportFeedback('This conversation has been reported and queued for admin review.')
      setReportModalOpen(false)
    } catch (err) {
      setReportError(err?.response?.data?.message || 'Unable to submit report right now.')
    } finally {
      setReportingConversation(false)
    }
  }

  return (
    <section className="messages-workspace">
      <aside className="messages-sidebar card">
        <div className="messages-sidebar__header">
          <h1>Messages</h1>
          <p>Conversations related to your food requests and listings</p>
          <input
            type="text"
            className="form-input"
            placeholder="Search by listing or participant"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {loadingConversations ? (
          <p className="messages-sidebar__loading">Loading conversations…</p>
        ) : conversationError ? (
          <p className="form-error">{conversationError}</p>
        ) : filteredConversations.length === 0 ? (
          <p className="messages-sidebar__loading">No conversations found.</p>
        ) : (
          <div className="conversation-list">
            {filteredConversations.map((conversation) => {
              const selected = String(conversation.requestId) === String(selectedRequestId)
              const participant = getParticipantName(conversation) || 'Unknown participant'
              const participantRole = getParticipantRole()
              const latest = conversation.latestMessage

              return (
                <button
                  key={conversation.requestId}
                  type="button"
                  className={`conversation-row ${selected ? 'conversation-row--active' : ''}`.trim()}
                  onClick={() => setSelectedRequestId(conversation.requestId)}
                >
                  <div className="conversation-row__identity">
                    <Avatar
                      className="conversation-row__avatar"
                      name={participant}
                      imageUrl={getParticipantImageUrl(conversation)}
                      size={40}
                    />
                    <div className="conversation-row__content">
                  <div className="conversation-row__top">
                    <h3>{conversation.listingTitle || 'Untitled listing'}</h3>
                    {latest?.timestamp && (
                      <time>{formatTimestamp(latest.timestamp)}</time>
                    )}
                  </div>

                  <div className="conversation-row__meta">
                    <span>{participant}</span>
                    <span className="conversation-badge conversation-badge--role">{participantRole}</span>
                    <span className="conversation-badge conversation-badge--status">
                      {conversation.status || 'PENDING'}
                    </span>
                    {conversation.unread && <span className="conversation-unread-dot" aria-label="Unread" />}
                  </div>

                  <p className="conversation-row__preview">
                    {latest?.content || 'No messages yet for this request.'}
                  </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <section className="messages-main card">
        {!selectedConversation ? (
          <div className="messages-empty-state">
            <div className="messages-empty-state__icon" aria-hidden="true">💬</div>
            <h2>Select a conversation to view messages</h2>
            <p>Choose a request from the left panel to start chatting.</p>
          </div>
        ) : (
          <>
            <header className="messages-main__header">
              <div className="messages-main__header-row">
                <h2>{selectedConversation.listingTitle || 'Conversation'}</h2>
                <button
                  type="button"
                  className="messages-main__report-btn"
                  onClick={handleReportConversation}
                  disabled={reportingConversation}
                >
                  {reportingConversation ? 'Reporting...' : 'Report conversation'}
                </button>
              </div>
              <div className="messages-main__meta">
                <Avatar
                  className="messages-main__avatar"
                  name={getParticipantName(selectedConversation) || 'Unknown participant'}
                  imageUrl={getParticipantImageUrl(selectedConversation)}
                  size={34}
                />
                <span>{getParticipantName(selectedConversation) || 'Unknown participant'}</span>
                <span className="conversation-badge conversation-badge--role">{getParticipantRole()}</span>
                <span className="conversation-badge conversation-badge--status">{selectedConversation.status || 'PENDING'}</span>
              </div>
              <p className="messages-main__request-ref">Request ref: {selectedConversation.requestId}</p>
            </header>

            {error && <p className="form-error">{error}</p>}
            {reportFeedback && <p className="form-helper">{reportFeedback}</p>}

            <div className="messages-thread">
              {loadingMessages ? (
                <p className="messages-thread__loading">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="messages-thread__loading">No messages yet. Say hello 👋</p>
              ) : (
                messages.map((message) => {
                  const mine =
                    user?.username &&
                    String(message.senderUsername || '').toLowerCase() === String(user.username).toLowerCase()

                  return (
                    <article
                      key={message.id}
                      className={`message-bubble ${mine ? 'message-bubble--mine' : 'message-bubble--other'}`.trim()}
                    >
                      <Avatar
                        className="message-bubble__avatar"
                        name={message.senderUsername}
                        imageUrl={mine ? user?.profileImageUrl : message.senderProfileImageUrl}
                        size={32}
                      />
                      <div className="message-bubble__body">
                        <div className="message-bubble__meta">
                          <strong>{message.senderUsername}</strong>
                          {message.senderRole && <span>{message.senderRole}</span>}
                        </div>
                        <p className="message-bubble__content">{message.content}</p>
                        <time className="message-bubble__time">{formatTimestamp(message.timestamp)}</time>
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            <form className="messages-composer" onSubmit={handleSubmit}>
              <input
                type="text"
                className="form-input"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !newMessage.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </section>

      <ReportModal
        isOpen={reportModalOpen}
        title="Report conversation"
        subtitle="Describe what happened in this request conversation so an admin can review the evidence."
        targetLabel={selectedConversation?.listingTitle || 'Selected conversation'}
        submitting={reportingConversation}
        submitError={reportError}
        onClose={() => {
          if (reportingConversation) return
          setReportModalOpen(false)
          setReportError('')
        }}
        onSubmit={handleSubmitConversationReport}
      />
    </section>
  )
}

export default MessagesPage
