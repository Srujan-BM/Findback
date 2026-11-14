import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, HeartHandshake, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage, imageUrl } from '../api/client'
import { useAuth } from '../context/useAuth'

export default function ItemDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [photo, setPhoto] = useState(0)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [privateDetails, setPrivateDetails] = useState(null)

  useEffect(() => {
    api.get(`/items/${id}`).then(({ data }) => setItem(data.item)).catch((reason) => setError(errorMessage(reason)))
  }, [id])

  useEffect(() => {
    if (!user || !item || item.reportType !== 'found') return
    const ownerId = item.reporterId?._id || item.reporterId
    if (ownerId === user.id) {
      api.get(`/items/${id}/private`).then(({ data }) => setPrivateDetails(data)).catch((reason) => setError(errorMessage(reason)))
    }
  }, [id, item, user])

  async function startConversation() {
    if (!user) { navigate('/login', { state: { from: { pathname: `/items/${id}` } } }); return }
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/conversations', { relatedItemId: id })
      navigate(`/messages?conversation=${data.conversation._id}`)
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }

  async function submitClaim(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/claims', { itemId: id, verificationAnswers: answer })
      setNotice(data.message)
      setAnswer('')
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }

  if (!item && !error) return <div className="loading-state"><span className="spinner" /> Opening this report…</div>
  if (error && !item) return <section className="section-wrap page-section"><Link className="back-link" to="/items"><ArrowLeft size={16} /> Back to reports</Link><div className="form-alert">{error}</div></section>
  const ownerId = item.reporterId?._id || item.reporterId
  const isOwner = user && ownerId === user.id

  return (
    <section className="section-wrap page-section detail-page">
      <Link to="/items" className="back-link"><ArrowLeft size={16} /> Back to reports</Link>
      <div className="detail-layout">
        <div>
          <div className="detail-gallery">
            {item.images?.[photo]?.url ? <img src={imageUrl(item.images[photo].url)} alt={item.itemName} /> : <div className="image-placeholder detail-placeholder"><span>FB</span></div>}
            {item.images?.length > 1 && <div className="gallery-thumbs">{item.images.map((image, index) => <button key={image.publicId || index} className={index === photo ? 'selected' : ''} onClick={() => setPhoto(index)} aria-label={`View photo ${index + 1}`}><img src={imageUrl(image.url)} alt="" /></button>)}</div>}
          </div>
          <div className="detail-description"><span className="eyebrow">A few more details</span><h2>About this item</h2><p>{item.description}</p></div>
        </div>
        <aside className="detail-aside">
          <span className={`type-pill ${item.reportType}`}>{item.reportType === 'lost' ? 'Lost item' : 'Found item'}</span>
          <span className="item-category">{item.category}</span>
          <h1>{item.itemName}</h1>
          <div className="detail-facts"><span><MapPin size={17} />{item.location}</span><span><Check size={17} />{item.color || 'Color not specified'}{item.brand ? ` · ${item.brand}` : ''}</span><span><ShieldCheck size={17} />Reported {new Date(item.reportDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div className="reporter-card"><span className="avatar">{item.reporterId?.name?.charAt(0)?.toUpperCase() || 'F'}</span><div><small>Shared by</small><strong>{item.reporterId?.name || 'A community member'}</strong></div><HeartHandshake size={18} /></div>
          {!isOwner && item.reportType === 'found' && user && <form className="claim-box" onSubmit={submitClaim}><span className="eyebrow">Think this could be yours?</span><h3>Help the finder verify</h3><p>Share a private detail about the item only its owner would know. The finder sees your answer—not the public.</p><textarea required minLength="10" maxLength="1000" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="A mark, engraving, contents, or another identifying detail…" rows="4" /><button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending privately…' : 'Send an ownership claim'} <ArrowUpRight size={16} /></button></form>}
          {!isOwner && (!user || item.reportType === 'lost') && <button className="button button-primary button-full contact-button" onClick={startConversation} disabled={busy}><MessageCircle size={17} />{busy ? 'Opening a private chat…' : 'Message the reporter'}</button>}
          {isOwner && <div className="owner-note"><ShieldCheck size={18} /><p>This is your report. Manage its status from <Link to="/dashboard">your dashboard</Link>.{privateDetails?.privateVerificationData && <span className="private-detail"><strong>Private verification detail:</strong> {privateDetails.privateVerificationData}</span>}</p></div>}
          {notice && <div className="success-alert">{notice} <Link to="/claims">View claim</Link></div>}
          {error && <div className="form-alert">{error}</div>}
          <p className="safety-note">Please arrange any handover in a safe, public place. Never share passwords or payment details.</p>
        </aside>
      </div>
    </section>
  )
}
