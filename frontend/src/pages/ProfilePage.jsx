import { useState } from 'react'
import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/useAuth'
import { PageHeading } from '../components/Layout'

const profileSchema = z.object({ name: z.string().trim().min(2, 'Name must be at least two characters.').max(80) })

export default function ProfilePage() {
  const { user, signIn } = useAuth()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name } })

  async function submit(values) {
    setError('')
    setSaved(false)
    try {
      const { data } = await api.patch('/auth/profile', values)
      signIn(data.user)
      setSaved(true)
    } catch (reason) { setError(errorMessage(reason)) }
  }

  return <section className="section-wrap page-section profile-page"><PageHeading eyebrow="Your FindBack details" title="A little about you" description="Your name is shared when you connect with another community member." /><div className="profile-card"><span className="profile-avatar-large">{user.name.charAt(0).toUpperCase()}</span><div className="profile-card-head"><span className="eyebrow">Account information</span><h2>Personal details</h2></div><form onSubmit={handleSubmit(submit)} className="form-stack"><label className="field"><span>Your name</span><input autoComplete="name" {...register('name')} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label><label className="field"><span>Email address</span><input value={user.email} disabled /><small className="field-hint">Email changes aren’t available right now.</small></label><div className="profile-secure"><ShieldCheck size={17} /><span>Your password is never displayed. To update it, use a unique password for FindBack.</span></div>{error && <div className="form-alert">{error}</div>}{saved && <div className="success-alert">Your profile was updated.</div>}<button className="button button-primary" disabled={isSubmitting}><UserRound size={16} />{isSubmitting ? 'Saving…' : 'Save changes'} {!isSubmitting && <ArrowRight size={15} />}</button></form></div></section>
}
