import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import ItemCard from '../components/ItemCard'
import { EmptyState, PageHeading } from '../components/Layout'

export default function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState(params.get('q') || '')
  const [type, setType] = useState(params.get('type') || '')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams()
      if (query.trim()) next.set('q', query.trim())
      if (type) next.set('type', type)
      setParams(next, { replace: true })
      const search = new URLSearchParams(next)
      if (category) search.set('category', category)
      setLoading(true)
      api.get(`/items?${search}`).then(({ data }) => { setItems(data.items); setError('') }).catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, type, category, setParams])

  return (
    <section className="section-wrap page-section">
      <PageHeading eyebrow="A community of helpful people" title="Explore reports" description="Every listing is a chance to help something find its way home." action={<span className="results-count">{items.length} {items.length === 1 ? 'report' : 'reports'}</span>} />
      <div className="browse-toolbar">
        <label className="search-field"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items, places, or details" /><button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">{query && <X size={16} />}</button></label>
        <label className="filter-field"><SlidersHorizontal size={17} /><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All reports</option><option value="lost">Lost items</option><option value="found">Found items</option></select></label>
        <label className="filter-field"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{['Accessories', 'Electronics', 'Clothing', 'Bags', 'Keys', 'Documents', 'Jewelry', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
      {error && <div className="form-alert">{error}</div>}
      {loading ? <div className="loading-state"><span className="spinner" /> Looking through reports…</div> : items.length ? <div className="items-grid">{items.map((item) => <ItemCard key={item._id} item={item} />)}</div> : <EmptyState title="No reports found" action={<button className="button button-outline button-small" onClick={() => { setQuery(''); setType(''); setCategory('') }}>Clear filters</button>}>Try another search, or help someone else by sharing a report.</EmptyState>}
    </section>
  )
}
