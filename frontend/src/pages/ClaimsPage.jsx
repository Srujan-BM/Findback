import { useEffect, useState } from 'react'
import { ArrowRight, Check, Clock3, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/useAuth'
import { EmptyState, PageHeading } from '../components/Layout'
import { imageUrl } from '../api/client'

export default function ClaimsPage() {
  const { user } = useAuth()
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  useEffect(() => { api.get('/claims').then(({ data }) => setClaims(data.claims)).catch((reason) => setError(errorMessage(reason))) }, [])

  async function review(claim, status) {
    try {
      const { data } = await api.patch(`/claims/${claim._id}/status`, { status })
      setClaims((current) => current.map((entry) => entry._id === claim._id ? { ...entry, status: data.claim.status } : entry))
    } catch (reason) { setError(errorMessage(reason)) }
  }

  return (
    <section className="section-wrap page-section">
      <PageHeading eyebrow="Ownership, thoughtfully verified" title="Claims & requests" description="Private details are only visible to the people involved in each report." />
      {error && <div className="form-alert">{error}</div>}
      {claims.length ? <div className="claim-list">{claims.map((claim) => {
        const isFinder = claim.finderId?._id === user.id || claim.finderId?.id === user.id
        return <article className="claim-card" key={claim._id}>
          <div className="claim-card-top"><div className="claim-item-photo">{claim.itemId?.images?.[0]?.url ? <img src={imageUrl(claim.itemId.images[0].url)} alt="" /> : <span>FB</span>}</div><div className="claim-title"><span className="eyebrow">{isFinder ? 'A request for your found item' : 'Your ownership request'}</span><h3>{claim.itemId?.itemName || 'Item report'}</h3><p>{isFinder ? `${claim.claimantId?.name || 'A community member'} believes this may be theirs.` : `Finder: ${claim.finderId?.name || 'Community member'}`}</p></div><span className={`status-chip ${claim.status}`}>{claim.status === 'pending' && <Clock3 size={13} />}{claim.status.replace('_', ' ')}</span></div>
          <div className="claim-answer"><span className="verification-label"><ShieldCheck size={15} /> Private ownership detail</span><p>{claim.verificationAnswers}</p></div>
          {claim.comments && <p className="claim-comment">“{claim.comments}”</p>}
          {isFinder && ['pending', 'more_info'].includes(claim.status) && <div className="claim-actions"><button className="button button-outline button-small" onClick={() => review(claim, 'rejected')}><X size={15} /> Decline</button><button className="button button-outline button-small" onClick={() => review(claim, 'more_info')}><MessageCircle size={15} /> Ask for more</button><button className="button button-primary button-small" onClick={() => review(claim, 'accepted')}><Check size={15} /> Verify ownership</button></div>}
          {claim.status === 'accepted' && <p className="claim-next-step"><Check size={15} /> Ownership verified. Coordinate a safe handover via <Link to="/messages">private messages <ArrowRight size={13} /></Link>.</p>}
        </article>
      })}</div> : <EmptyState icon={ShieldCheck} title="No ownership claims yet" action={<Link className="button button-outline button-small" to="/items">Browse reports <ArrowRight size={15} /></Link>}>Claims on found items are shared privately, so only you and the finder can see the details.</EmptyState>}
    </section>
  )
}
