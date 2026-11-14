import { useEffect, useState } from 'react'
import { ArrowRight, Bell, Check, CirclePlus, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/useAuth'
import { EmptyState, PageHeading } from '../components/Layout'
import ItemCard from '../components/ItemCard'

const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export default function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [matches, setMatches] = useState([])
  const [claims, setClaims] = useState([])
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/items/mine'), api.get('/matches'), api.get('/claims'), api.get('/notifications')])
      .then(([reports, matchData, claimData, notificationData]) => {
        setItems(reports.data.items)
        setMatches(matchData.data.matches)
        setClaims(claimData.data.claims)
        setNotifications(notificationData.data.notifications.filter((notification) => !notification.isRead))
      })
      .catch((reason) => setError(errorMessage(reason)))
  }, [])

  async function updateStatus(item, status) {
    try {
      await api.patch(`/items/${item._id}/status`, { status })
      setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, status } : entry))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  return (
    <section className="section-wrap page-section dashboard-page">
      {location.state?.notice && <div className="success-alert"><Check size={17} />{location.state.notice}</div>}
      <PageHeading eyebrow={`Your FindBack space · ${todayLabel}`} title={`Hello, ${user.name.split(' ')[0]}.`} description="Here’s what’s happening with your reports." action={<Link className="button button-primary" to="/report/lost"><CirclePlus size={17} /> New report</Link>} />
      {error && <div className="form-alert">{error}</div>}
      <div className="dashboard-stats">
        <Link to="/dashboard#reports" className="stat-card"><span className="stat-icon"><Search size={19} /></span><span className="stat-label">My reports</span><strong>{items.length}</strong><small>Lost & found listings</small></Link>
        <Link to="/matches" className="stat-card"><span className="stat-icon"><ShieldCheck size={19} /></span><span className="stat-label">Possible matches</span><strong>{matches.length}</strong><small>Worth a closer look</small></Link>
        <Link to="/claims" className="stat-card"><span className="stat-icon"><MessageCircle size={19} /></span><span className="stat-label">Open claims</span><strong>{claims.filter((claim) => claim.status === 'pending').length}</strong><small>Ownership requests</small></Link>
        <Link to="/notifications" className="stat-card"><span className="stat-icon"><Bell size={19} /></span><span className="stat-label">New updates</span><strong>{notifications.length}</strong><small>Recent activity</small></Link>
      </div>
      <div className="dashboard-section" id="reports">
        <div className="section-heading-row"><div><span className="eyebrow">A little progress</span><h2>Your reports</h2></div><Link className="text-link" to="/items">Browse all reports <ArrowRight size={15} /></Link></div>
        {items.length ? <div className="items-grid">{items.slice(0, 3).map((item) => <div className="dashboard-item" key={item._id}><ItemCard item={item} /><div className="item-manage-row"><span className={`status-chip ${item.status.toLowerCase()}`}>{item.status.replaceAll('_', ' ')}</span>{['ACTIVE', 'MATCH_FOUND', 'CLAIM_RECEIVED', 'VERIFIED'].includes(item.status) && <select aria-label={`Update status for ${item.itemName}`} value="" onChange={(event) => event.target.value && updateStatus(item, event.target.value)}><option value="" disabled>Update status</option><option value="CLOSED">Close report</option>{item.reportType === 'lost' && <option value="RECOVERED">Mark recovered</option>}{item.reportType === 'found' && <option value="RETURNED">Mark returned</option>}</select>}</div></div>)}</div> : <EmptyState title="Your first report can help someone" action={<Link className="button button-primary button-small" to="/report/lost">Share a lost item <ArrowRight size={15} /></Link>}>Create a report and we’ll look for possible matches.</EmptyState>}
      </div>
      <div className="dashboard-bottom">
        <div className="dashboard-tip"><span className="tip-icon"><ShieldCheck size={19} /></span><div><span className="eyebrow">A note on safety</span><h3>Keep the conversation here</h3><p>Share only the details needed to verify ownership. Arrange handovers somewhere public and well-lit.</p><Link className="text-link" to="/messages">Open your messages <ArrowRight size={15} /></Link></div></div>
        <div className="quick-links"><span className="eyebrow">A few helpful places</span><Link to="/matches">Review possible matches <ArrowRight size={15} /></Link><Link to="/claims">Manage ownership claims <ArrowRight size={15} /></Link><Link to="/notifications">See your updates <ArrowRight size={15} /></Link></div>
      </div>
    </section>
  )
}
