import { useEffect, useState } from 'react'
import { ArrowRight, Check, MessageCircle, Sparkles, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage, imageUrl } from '../api/client'
import { useAuth } from '../context/useAuth'
import { EmptyState, PageHeading } from '../components/Layout'

export default function MatchesPage() {
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => { api.get('/matches').then(({ data }) => setMatches(data.matches)).catch((reason) => setError(errorMessage(reason))) }, [])

  async function decide(match, decision) {
    try {
      await api.post(`/matches/${match._id}/${decision}`)
      setMatches((current) => current.map((entry) => entry._id === match._id ? { ...entry, status: decision === 'accept' ? 'accepted' : 'rejected' } : entry))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  async function messageAbout(match) {
    const lostOwnerId = match.lostItemId.reporterId?._id || match.lostItemId.reporterId
    const itemToContact = lostOwnerId === user.id ? match.foundItemId : match.lostItemId
    try {
      const { data } = await api.post('/conversations', { relatedItemId: itemToContact._id })
      navigate(`/messages?conversation=${data.conversation._id}`)
    } catch (reason) { setError(errorMessage(reason)) }
  }

  return (
    <section className="section-wrap page-section">
      <PageHeading eyebrow="A promising possibility" title="Possible matches" description="These reports share some details. Compare them carefully—only the item owners can confirm a match." />
      {error && <div className="form-alert">{error}</div>}
      {matches.length ? <div className="match-list">{matches.map((match) => {
        const lost = match.lostItemId
        const found = match.foundItemId
        if (!lost || !found) return null
        return <article className="match-card" key={match._id}>
          <div className="match-header"><span className="match-score"><Sparkles size={15} />{match.overallSimilarity}% details in common</span><span className={`status-chip ${match.status}`}>{match.status}</span></div>
          <div className="match-comparison">{[lost, found].map((item) => <Link className="match-item" to={`/items/${item._id}`} key={item._id}><div className="match-image">{item.images?.[0]?.url ? <img src={imageUrl(item.images[0].url)} alt="" /> : <div className="image-placeholder"><span>FB</span></div>}</div><div><span className={`type-pill ${item.reportType}`}>{item.reportType} report</span><h3>{item.itemName}</h3><p>{item.color || item.category} · {item.location}</p></div><ArrowRight size={17} /></Link>)}</div>
          <div className="match-footer"><div className="match-reasons">{match.matchingReasons?.slice(0, 3).map((reason) => <span key={reason}><Check size={13} />{reason}</span>)}</div>{match.status === 'suggested' ? <div className="match-actions"><button className="button button-outline button-small" onClick={() => decide(match, 'reject')}><X size={15} /> Not a match</button><button className="button button-primary button-small" onClick={() => decide(match, 'accept')}><Check size={15} /> Explore this match</button></div> : match.status === 'accepted' ? <button className="button button-outline button-small" onClick={() => messageAbout(match)}><MessageCircle size={15} /> Message the other reporter</button> : null}</div>
        </article>
      })}</div> : <EmptyState icon={Sparkles} title="Nothing to compare just yet" action={<Link className="button button-primary button-small" to="/report/lost">Add a report <ArrowRight size={15} /></Link>}>We’ll keep looking for reports with matching details and let you know when something turns up.</EmptyState>}
    </section>
  )
}
