import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Compass, HeartHandshake, LogOut, Menu, MessageCircle, Plus, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { errorMessage } from '../api/client'

export function Layout() {
  const { user, signOut, authError } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/')
    } catch (reason) {
      setActionError(errorMessage(reason))
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand" to="/" aria-label="FindBack home">
            <span className="brand-mark"><HeartHandshake size={20} /></span>
            <span>findback<span className="brand-period">.</span></span>
          </Link>
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
            <NavLink to="/items" onClick={() => setMenuOpen(false)}><Compass size={17} /> Browse</NavLink>
            {user && <NavLink to="/matches" onClick={() => setMenuOpen(false)}>Matches</NavLink>}
            {user && <NavLink to="/messages" onClick={() => setMenuOpen(false)}><MessageCircle size={17} /> Messages</NavLink>}
            {user && <NavLink to="/notifications" onClick={() => setMenuOpen(false)}><Bell size={17} /> Updates</NavLink>}
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="button button-primary button-small" to="/report/lost"><Plus size={16} /> Report an item</Link>
                <div className="profile-menu">
                  <Link className="profile-chip" to="/dashboard"><span className="avatar">{user.name?.charAt(0)?.toUpperCase()}</span><span className="profile-name">{user.name?.split(' ')[0]}</span><ChevronDown size={15} /></Link>
                  <div className="profile-dropdown">
                    <Link to="/dashboard">My dashboard</Link>
                    <Link to="/claims">My claims</Link>
                    <Link to="/profile">Profile</Link>
                    {user.role === 'admin' && <Link to="/admin"><ShieldCheck size={15} /> Admin</Link>}
                    <button onClick={handleSignOut}><LogOut size={15} /> Sign out</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link className="login-link" to="/login">Log in</Link>
                <Link className="button button-primary button-small" to="/register">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="site-main">{(authError || actionError) && <div className="section-wrap"><div className="form-alert">{authError || actionError}</div></div>}<Outlet /></main>
      <footer className="footer">
        <div className="footer-inner">
          <Link className="brand" to="/"><span className="brand-mark"><HeartHandshake size={19} /></span><span>findback<span className="brand-period">.</span></span></Link>
          <p>Lost something? Let’s bring it back.</p>
          <span className="footer-note">Made for the things that matter.</span>
        </div>
      </footer>
    </>
  )
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon: Icon = Search, title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function LoadingState() {
  return <div className="loading-state"><span className="spinner" /> Loading your FindBack space…</div>
}

export function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
