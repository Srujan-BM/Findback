import { useEffect, useState } from 'react'
import { Activity, Check, ShieldCheck, Users, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, errorMessage } from '../api/client'
import { PageHeading } from '../components/Layout'

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null)
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [section, setSection] = useState('overview')
  const [error, setError] = useState('')
  useEffect(() => { Promise.all([api.get('/admin/dashboard'), api.get('/admin/users'), api.get('/admin/reports')]).then(([stats, userData, reportData]) => { setDashboard(stats.data); setUsers(userData.data.users); setReports(reportData.data.reports) }).catch((reason) => setError(errorMessage(reason))) }, [])

  async function moderateUser(user) {
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive })
      setUsers((current) => current.map((entry) => entry._id === user._id ? data.user : entry))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  async function moderateReport(report, status) {
    try {
      await api.patch(`/admin/reports/${report._id}/status`, { status })
      setReports((current) => current.filter((entry) => entry._id !== report._id))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  const stats = dashboard?.stats
  return (
    <section className="section-wrap page-section">
      <PageHeading eyebrow="Thoughtful stewardship" title="Admin dashboard" description="Keep the FindBack community kind, useful, and safe." action={<span className="admin-verified"><ShieldCheck size={16} /> Admin access</span>} />
      {error && <div className="form-alert">{error}</div>}
      <div className="admin-tabs">{[['overview', 'Overview'], ['users', 'Members'], ['reports', `Reports${reports.length ? ` · ${reports.length}` : ''}`]].map(([key, label]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}>{label}</button>)}</div>
      {!stats ? <div className="loading-state"><span className="spinner" /> Loading platform overview…</div> : section === 'overview' ? <>
        <div className="admin-stats">{[['Community members', stats.users, Users], ['Item reports', stats.items, Activity], ['Possible matches', stats.matches, ShieldCheck], ['Claims awaiting review', stats.openClaims, Check], ['Listings to review', stats.openReports, X]].map(([label, count, Icon]) => <div className="admin-stat" key={label}><Icon size={18} /><span>{label}</span><strong>{count}</strong></div>)}</div>
        <div className="admin-chart-wrap"><div className="admin-table-title"><h2>Reports by type</h2><span>{stats.items} total reports</span></div><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ type: 'Lost', count: stats.lost }, { type: 'Found', count: stats.found }]} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8eee9" strokeDasharray="3 3" /><XAxis dataKey="type" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#718075' }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#89958b' }} /><Tooltip cursor={{ fill: '#f3f8f3' }} contentStyle={{ border: '1px solid #d5e2d7', borderRadius: 6, fontSize: 10 }} /><Bar dataKey="count" name="Reports" fill="#166534" radius={[4, 4, 0, 0]} maxBarSize={62} /></BarChart></ResponsiveContainer></div></div>
        <div className="admin-table-wrap"><div className="admin-table-title"><h2>Recent activity</h2><span>Latest platform actions</span></div><table><thead><tr><th>Activity</th><th>Member</th><th>When</th></tr></thead><tbody>{dashboard.recentLogs.map((log) => <tr key={log._id}><td>{log.action.replaceAll('.', ' ')}</td><td>{log.actorId?.name || 'System'}</td><td>{new Date(log.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!dashboard.recentLogs.length && <p className="table-empty">No activity recorded yet.</p>}</div>
      </> : section === 'users' ? <div className="admin-table-wrap"><div className="admin-table-title"><h2>Community members</h2><span>{users.length} accounts</span></div><div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td><span className={`status-chip ${user.isActive ? 'active' : 'closed'}`}>{user.isActive ? 'Active' : 'Suspended'}</span></td><td><button className="table-action" onClick={() => moderateUser(user)}>{user.isActive ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</tbody></table></div></div> : <div className="admin-table-wrap"><div className="admin-table-title"><h2>Listings to review</h2><span>{reports.length} open reports</span></div>{reports.length ? <div className="moderation-list">{reports.map((report) => <div className="moderation-row" key={report._id}><div><strong>{report.reportedItemId?.itemName || 'Listing unavailable'}</strong><small>{report.reason} · Reported by {report.reporterId?.name || 'a member'}</small></div><div><button className="table-action" onClick={() => moderateReport(report, 'dismissed')}>Dismiss</button><button className="table-action danger" onClick={() => moderateReport(report, 'reviewed')}>Review & close</button></div></div>)}</div> : <p className="table-empty">Nothing needs review right now. Thanks for keeping this space kind.</p>}</div>}
    </section>
  )
}
