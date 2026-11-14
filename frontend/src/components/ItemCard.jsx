import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../api/client'

export default function ItemCard({ item }) {
  const photo = imageUrl(item.images?.[0]?.url)
  return (
    <Link className="item-card" to={`/items/${item._id}`}>
      <div className="item-image">
        {photo ? <img src={photo} alt={item.itemName} loading="lazy" /> : <div className="image-placeholder"><span>FB</span></div>}
        <span className={`type-pill ${item.reportType}`}>{item.reportType === 'lost' ? 'Lost item' : 'Found item'}</span>
        <span className="card-arrow"><ArrowUpRight size={17} /></span>
      </div>
      <div className="item-card-body">
        <span className="item-category">{item.category}</span>
        <h3>{item.itemName}</h3>
        <p>{item.description}</p>
        <div className="item-meta"><MapPin size={14} /><span>{item.location}</span><span className="meta-dot" />{new Date(item.reportDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
      </div>
    </Link>
  )
}
