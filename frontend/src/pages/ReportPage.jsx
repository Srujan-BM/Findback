import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, LockKeyhole, MapPin, Package, RotateCw, ShieldCheck, Smartphone, Sparkles, Tag, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api, errorMessage } from '../api/client'

const schema = z.object({
  itemName: z.string().trim().min(2, 'Add a short name for the item.').max(100),
  category: z.string().min(1, 'Choose a category.'),
  brand: z.string().max(80).optional(),
  color: z.string().max(50).optional(),
  description: z.string().trim().min(10, 'Add a few details to help identify it.').max(2000),
  distinctiveFeatures: z.string().max(1000).optional(),
  privateVerificationData: z.string().max(1000).optional(),
  location: z.string().trim().min(2, 'Add a general location.').max(160),
  reportDate: z.string().min(1, 'Choose the date.'),
})
const today = new Date().toISOString().slice(0, 10)

export default function ReportPage() {
  const { type = 'lost' } = useParams()
  const isLost = type === 'lost'
  const [files, setFiles] = useState([])
  const filesRef = useRef(files)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { reportDate: today },
  })

  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => () => filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview)), [])

  function addFiles(event, replaceIndex = null) {
    const accepted = Array.from(event.target.files || [])
    const next = [...files]
    let replaced = false
    for (const file of accepted) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Photos must be JPG, PNG, or WebP.'); continue }
      if (file.size > 5 * 1024 * 1024) { setError('Each photo must be smaller than 5 MB.'); continue }
      const withPreview = Object.assign(file, { preview: URL.createObjectURL(file) })
      if (replaceIndex !== null && !replaced) {
        URL.revokeObjectURL(next[replaceIndex].preview)
        next[replaceIndex] = withPreview
        replaced = true
      } else if (next.length < 5) {
        next.push(withPreview)
      } else {
        URL.revokeObjectURL(withPreview.preview)
        setError('You can add up to five photos.')
        break
      }
    }
    setFiles(next)
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    if (event.dataTransfer.files.length) addFiles({ target: { files: event.dataTransfer.files, value: '' } })
  }

  function removeFile(index) {
    URL.revokeObjectURL(files[index].preview)
    setFiles(files.filter((_, fileIndex) => fileIndex !== index))
  }

  async function submit(values) {
    setError('')
    if (!files.length) { setError('Add at least one photo so people can recognize the item.'); return }
    const body = new FormData()
    Object.entries(values).forEach(([key, value]) => body.append(key, value || ''))
    files.forEach((file) => body.append('images', file))
    setBusy(true)
    try {
      const { data } = await api.post(`/items/${isLost ? 'lost' : 'found'}`, body, {
        onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0),
      })
      navigate('/dashboard', { state: { notice: data.possibleMatches ? `Report shared — ${data.possibleMatches} possible ${data.possibleMatches === 1 ? 'match' : 'matches'} found.` : 'Your report has been shared with the community.' } })
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-wrap page-section report-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={16} /> Back to dashboard</Link>
      <div className="report-layout">
        <div className="report-intro">
          <span className="eyebrow"><span className="eyebrow-dot" />{isLost ? 'Let’s help you look' : 'A thoughtful thing to do'}</span>
          <h1>{isLost ? <>Let’s bring your<br /><em>belonging</em> back.</> : <>A little kindness<br />goes a <em>long way.</em></>}</h1>
          <p>{isLost ? 'Share a few details and our community can help reunite you with what matters.' : 'Tell us what you found. The right details can help it find its way home.'}</p>
          <div className="report-gallery" aria-label="Commonly reported belongings">
            <figure className="report-gallery-card report-gallery-backpack">
              <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=760&q=80" alt="Everyday backpack" loading="lazy" />
              <figcaption><Package size={14} /> Bags & backpacks</figcaption>
            </figure>
            <figure className="report-gallery-card">
              <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=520&q=80" alt="Leather handbag" loading="lazy" />
              <figcaption><Tag size={14} /> Accessories</figcaption>
            </figure>
            <figure className="report-gallery-card">
              <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=520&q=80" alt="Wristwatch" loading="lazy" />
              <figcaption><Sparkles size={14} /> Watches</figcaption>
            </figure>
            <figure className="report-gallery-card">
              <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=520&q=80" alt="Mobile phone" loading="lazy" />
              <figcaption><Smartphone size={14} /> Phones</figcaption>
            </figure>
          </div>
          <div className="privacy-callout"><span className="privacy-check"><ShieldCheck size={17} /></span><p><strong>Your personal details stay private.</strong> Identifying details are only shared with people involved in a claim—not on the public listing.</p></div>
          <div className="report-steps"><span className="report-step-active"><b>01</b><i /> Item details</span><span><b>02</b><i /> Where & when</span><span><b>03</b><i /> Add a photo</span></div>
        </div>
        <form className="report-form" onSubmit={handleSubmit(submit)}>
          <div className="report-form-heading"><div><span className="eyebrow">Help make the connection</span><h2>{isLost ? 'Report a lost item' : 'Report a found item'}</h2><p>Start with the details people will recognize.</p></div><span className="report-secure"><LockKeyhole size={15} /> Private & secure</span></div>
          <div className="form-section-title"><span className="form-step-no">01</span><div><h3><Package size={17} /> Item details</h3><p>What should someone look for?</p></div></div>
          <div className="form-grid">
            <label className="field full"><span>Item name</span><input placeholder="e.g. Canvas tote bag" {...register('itemName')} />{errors.itemName && <small className="field-error">{errors.itemName.message}</small>}</label>
            <label className="field"><span>Category</span><select {...register('category')}><option value="">Choose a category</option>{['Accessories', 'Electronics', 'Clothing', 'Bags', 'Keys', 'Documents', 'Jewelry', 'Pets', 'Other'].map((category) => <option key={category}>{category}</option>)}</select>{errors.category && <small className="field-error">{errors.category.message}</small>}</label>
            <label className="field"><span>Color</span><input placeholder="e.g. Forest green" {...register('color')} /></label>
            <label className="field"><span>Brand <small>Optional</small></span><input placeholder="If you know it" {...register('brand')} /></label>
            <label className="field full"><span>Description</span><textarea rows="3" placeholder="What makes it recognizable? Share details that could help." {...register('description')} />{errors.description && <small className="field-error">{errors.description.message}</small>}</label>
            <label className="field full"><span>Distinctive details <small>Private</small></span><textarea rows="2" placeholder="A mark, engraving, or other detail only the owner would know." {...register('distinctiveFeatures')} /></label>
            <label className="field full"><span>Private identifying detail <small>Only for found reports</small></span><textarea rows="2" placeholder={isLost ? 'Optional. Keep any especially identifying detail private.' : 'A private detail that can help verify the right owner.'} {...register('privateVerificationData')} /></label>
          </div>
          <div className="form-section-title location-title"><span className="form-step-no">02</span><div><h3><MapPin size={17} /> Where & when</h3><p>A general area is all we need to get started.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>{isLost ? 'Where did you last see it?' : 'Where did you find it?'}</span><input placeholder="A general place is perfect" {...register('location')} />{errors.location && <small className="field-error">{errors.location.message}</small>}</label>
            <label className="field"><span>{isLost ? 'Date you lost it' : 'Date you found it'}</span><input type="date" {...register('reportDate')} />{errors.reportDate && <small className="field-error">{errors.reportDate.message}</small>}</label>
          </div>
          <div className="form-section-title photo-title"><span className="form-step-no">03</span><div><h3><ImagePlus size={17} /> Add a photo</h3><p>Clear photos make it easier to recognize. Up to five, 5 MB each.</p></div></div>
          <div className="photo-grid">
            {files.map((file, index) => <div className="photo-preview" key={`${file.name}-${index}`}><img src={file.preview} alt={`Preview ${index + 1}: ${file.name}`} /><div className="photo-actions"><label className="photo-action" aria-label={`Replace photo ${index + 1}`} title="Replace photo"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => addFiles(event, index)} /><RotateCw size={15} /></label><button type="button" className="photo-action" aria-label={`Remove photo ${index + 1}`} onClick={() => removeFile(index)}><X size={15} /></button></div><span className="photo-file-name">{file.name}</span></div>)}
            {files.length < 5 && <label className="photo-drop" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} /><span className="photo-add"><ImagePlus size={21} /></span><strong>Choose photos</strong><small>or drag and drop here</small><small>{files.length}/5 added</small></label>}
          </div>
          {error && <div className="form-alert" role="alert">{error}</div>}
          {busy && <div className="progress-wrap"><div><span>Uploading photos</span><span>{progress}%</span></div><progress max="100" value={progress} /></div>}
          <div className="form-submit-row"><span><LockKeyhole size={15} /> Your exact contact details stay private.</span><button type="submit" className="button button-primary" disabled={busy}>{busy ? <><LoaderCircle size={17} className="submit-spinner" /> Sharing report…</> : <>Share report <ArrowRight size={17} /></>}</button></div>
        </form>
      </div>
    </section>
  )
}
