import { ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Check, CircleHelp, HeartHandshake, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import ItemCard from '../components/ItemCard'

export default function LandingPage() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    api.get('/items?limit=3').then(({ data }) => setItems(data.items)).catch((reason) => setError(errorMessage(reason)))
  }, [])
  function search(event) {
    event.preventDefault()
    window.location.assign(`/items${query ? `?q=${encodeURIComponent(query)}` : ''}`)
  }
  return (
    <>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> A little kindness goes a long way</span>
            <h1>Lost something?<br /><em>Let’s bring it back.</em></h1>
            <p className="hero-lede">A familiar place for lost things to find their way home. Share a report, find a match, and reconnect with what matters.</p>
            <form className="hero-search" onSubmit={search}>
              <Search size={20} />
              <input aria-label="Search lost and found items" placeholder="Try “black headphones” or “Central Park”" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit" className="button button-primary">Search <ArrowRight size={16} /></button>
            </form>
            <div className="hero-actions">
              <Link className="button button-primary" to="/report/lost">I lost something <ArrowUpRight size={16} /></Link>
              <Link className="button button-outline" to="/report/found">I found something <HeartHandshake size={16} /></Link>
            </div>
            <div className="trust-line"><ShieldCheck size={16} /><span>Private by design</span><span className="trust-divider" /><span>Community powered</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85" alt="A well-loved green backpack ready to find its owner" />
              <div className="photo-caption"><span className="caption-dot" /><span>Every item has a way back</span></div>
            </div>
            <div className="floating-note note-top"><span className="note-icon"><Sparkles size={16} /></span><span><strong>Made for reunions</strong><small>One good connection at a time</small></span></div>
            <div className="floating-note note-bottom"><span className="note-check"><Check size={16} /></span><span><strong>Your privacy comes first</strong><small>Connect only when you’re ready</small></span></div>
            <span className="hero-scribble"><ArrowDownRight size={25} /></span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>GOOD THINGS FIND THEIR WAY</span>
          <span className="hero-bottom-line" />
          <span>START WITH A REPORT</span>
        </div>
      </section>

      <section className="section-wrap how-section">
        <div className="section-intro">
          <span className="eyebrow">A simple way forward</span>
          <h2>Three small steps.<br /><em>One big relief.</em></h2>
          <p>Whether something went missing or you found a mystery on your way, we’ll help connect the dots.</p>
          <Link className="text-link" to="/items">Explore the community <ArrowRight size={16} /></Link>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-index">01</span><span className="step-icon"><Camera size={21} /></span><h3>Tell us what happened</h3><p>Add a photo and a few details. We’ll keep sensitive identifying clues private.</p><span className="step-line" /></article>
          <article className="step-card"><span className="step-index">02</span><span className="step-icon"><Search size={21} /></span><h3>Look for a connection</h3><p>We compare reports and surface possibilities. Every match is a starting point, never a promise.</p><span className="step-line" /></article>
          <article className="step-card"><span className="step-index">03</span><span className="step-icon"><HeartHandshake size={21} /></span><h3>Bring it back together</h3><p>Message privately, verify the details, and arrange a safe handover when you’re ready.</p><span className="step-line" /></article>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-wrap">
          <div className="section-heading-row"><div><span className="eyebrow">A little hope, nearby</span><h2>Recently reported</h2></div><Link className="text-link" to="/items">See all reports <ArrowRight size={16} /></Link></div>
          {error ? <div className="inline-error">{error}</div> : items.length ? <div className="items-grid">{items.map((item) => <ItemCard key={item._id} item={item} />)}</div> : <div className="starter-card"><span className="starter-icon"><CircleHelp size={22} /></span><div><h3>The first report can be yours</h3><p>Start a small act of kindness by sharing a lost or found item.</p></div><Link to="/report/lost" className="button button-outline button-small">Create a report <ArrowRight size={15} /></Link></div>}
        </div>
      </section>
      <section className="closing-cta"><div className="closing-inner"><div><span className="eyebrow">It starts right here</span><h2>Somewhere, someone is<br /><em>hoping you’ll find it.</em></h2></div><Link className="button button-light" to="/report/found">Share what you found <ArrowUpRight size={17} /></Link></div></section>
    </>
  )
}
