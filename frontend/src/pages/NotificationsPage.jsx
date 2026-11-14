import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { EmptyState, PageHeading } from '../components/Layout'

const icons = { match_accepted: Search, claim_received: ShieldCheck, claim_update: CheckCheck, message: MessageCircle }

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { api.get('/notifications').then(({ data }) => setNotifications(data.notifications)).catch((reason) => setError(errorMessage(reason))) }, [])

  async function markRead(notification) {
    if (notification.isRead) return
    try {
      const { data } = await api.patch(`/notifications/${notification._id}/read`)
      setNotifications((current) => current.map((entry) => entry._id === notification._id ? data.notification : entry))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  async function markAllRead() {
    const unread = notifications.filter((notification) => !notification.isRead)
    try {
      await Promise.all(unread.map((notification) => api.patch(`/notifications/${notification._id}/read`)))
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  return (
    <section className="section-wrap page-section">
      <PageHeading eyebrow="A little something to know" title="Your updates" description="Match suggestions, new messages, and claim updates all in one place." action={notifications.some((entry) => !entry.isRead) && <button className="text-link button-as-link" onClick={markAllRead}>Mark all read <Check size={15} /></button>} />
      {error && <div className="form-alert">{error}</div>}
      {notifications.length ? <div className="notification-list">{notifications.map((notification) => {
        const Icon = icons[notification.type] || Bell
        return <article className={`notification-row ${notification.isRead ? '' : 'unread'}`} key={notification._id} onClick={() => markRead(notification)}><span className="notification-icon"><Icon size={18} /></span><div className="notification-copy"><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small></div>{!notification.isRead && <span className="unread-dot" />}{notification.relatedItemId && <Link className="notification-open" to={`/items/${notification.relatedItemId}`} onClick={() => markRead(notification)}>Open</Link>}</article>
      })}</div> : <EmptyState icon={Bell} title="It’s quiet for now">We’ll let you know when there’s a new match, message, or claim update.</EmptyState>}
    </section>
  )
}
