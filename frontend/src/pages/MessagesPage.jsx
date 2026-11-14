import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api, apiBaseUrl, errorMessage } from '../api/client'
import { useAuth } from '../context/useAuth'
import { EmptyState, PageHeading } from '../components/Layout'

const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '')

export default function MessagesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const initialConversation = useRef(params.get('conversation'))
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeId, setActiveId] = useState(params.get('conversation') || '')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/conversations').then(({ data }) => {
      setConversations(data.conversations)
      const selected = initialConversation.current
      setActiveId(data.conversations.find((conversation) => conversation._id === selected)?._id || data.conversations[0]?._id || '')
    }).catch((reason) => setError(errorMessage(reason)))
  }, [])

  useEffect(() => {
    if (!activeId) return undefined
    let active = true
    api.get(`/conversations/${activeId}/messages`).then(({ data }) => { if (active) setMessages(data.messages) }).catch((reason) => { if (active) setError(errorMessage(reason)) })
    const socket = io(socketUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('conversation:join', activeId))
    const onMessage = (message) => {
      if (message.conversationId === activeId || message.conversationId?._id === activeId) {
        setMessages((current) => current.some((entry) => entry._id === message._id) ? current : [...current, message])
      }
    }
    socket.on('message:new', onMessage)
    return () => { active = false; socket.off('message:new', onMessage); socket.disconnect() }
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    if (!content.trim() || !activeId) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/conversations/${activeId}/messages`, { content })
      setMessages((current) => current.some((entry) => entry._id === data.message._id) ? current : [...current, data.message])
      setContent('')
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }

  function chooseConversation(id) {
    setMessages([])
    setActiveId(id)
    setParams({ conversation: id }, { replace: true })
  }

  const active = conversations.find((conversation) => conversation._id === activeId)
  const otherPerson = active?.participants?.find((participant) => participant._id !== user.id)

  return (
    <section className="section-wrap page-section messages-page">
      <PageHeading eyebrow="Private, person to person" title="Your conversations" description="A thoughtful note can be the first step to a happy reunion." />
      {error && <div className="form-alert">{error}</div>}
      {conversations.length ? <div className="chat-layout">
        <aside className="conversation-list"><div className="conversation-heading"><MessageCircle size={17} /> Conversations <span>{conversations.length}</span></div>{conversations.map((conversation) => {
          const other = conversation.participants?.find((participant) => participant._id !== user.id)
          return <button key={conversation._id} className={`conversation-row ${activeId === conversation._id ? 'active' : ''}`} onClick={() => chooseConversation(conversation._id)}><span className="avatar">{other?.name?.charAt(0)?.toUpperCase() || 'F'}</span><span className="conversation-row-copy"><strong>{other?.name || 'Community member'}</strong><small>{conversation.relatedItemId?.itemName || 'FindBack conversation'}</small><small className="conversation-date">{new Date(conversation.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span></button>
        })}</aside>
        <div className="chat-window">
          {active ? <>
            <div className="chat-topbar"><button className="icon-button chat-back" onClick={() => setActiveId('')} aria-label="Close conversation"><ArrowLeft size={18} /></button><span className="avatar">{otherPerson?.name?.charAt(0)?.toUpperCase() || 'F'}</span><span><strong>{otherPerson?.name || 'Community member'}</strong><small>{active.relatedItemId?.itemName || 'FindBack conversation'}</small></span><ShieldCheck size={18} className="chat-shield" /></div>
            <div className="chat-messages">{messages.length ? messages.map((message) => {
              const own = (message.senderId?._id || message.senderId) === user.id
              return <div key={message._id} className={`message-row ${own ? 'own' : ''}`}><span className="message-author">{own ? 'You' : message.senderId?.name || otherPerson?.name}</span><div className="message-bubble">{message.content}</div><span className="message-time">{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span></div>
            }) : <div className="chat-empty"><span className="empty-icon"><MessageCircle size={22} /></span><strong>Start with a kind hello.</strong><p>Keep it friendly, and avoid sharing personal details too soon.</p></div>}<div ref={bottomRef} /></div>
            <form className="chat-compose" onSubmit={sendMessage}><textarea maxLength="2000" rows="1" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write a thoughtful message…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} /><button className="button button-primary" type="submit" disabled={busy || !content.trim()} aria-label="Send message"><Send size={17} />{busy ? 'Sending' : 'Send'}</button><small>Enter to send · Shift + Enter for a new line</small></form>
          </> : <EmptyState title="Choose a conversation" /> }
        </div>
      </div> : <EmptyState icon={MessageCircle} title="No conversations yet" action={<a className="button button-outline button-small" href="/items">Browse reports <ArrowRightIcon /></a>}>When you contact a reporter, your private conversation will appear here.</EmptyState>}
      <div className="message-safety"><ShieldCheck size={17} /><span><strong>Keep it kind and safe.</strong> Never share passwords or payment details. Meet somewhere public for any handover.</span><ArrowUpRight size={15} /></div>
    </section>
  )
}

function ArrowRightIcon() { return <ArrowUpRight size={15} /> }
