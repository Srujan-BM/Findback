import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, HeartHandshake, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/useAuth'

const loginSchema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(8, 'Password must be at least 8 characters.') })
const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Please enter your name.').max(80) })

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(isRegister ? registerSchema : loginSchema) })
  if (user) return <Navigate to="/dashboard" replace />

  async function submit(values) {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/auth/${isRegister ? 'register' : 'login'}`, values)
      signIn(data.user, data.csrfToken)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-aside">
        <Link className="back-home" to="/"><ArrowLeft size={16} /> Back to home</Link>
        <div className="auth-aside-content"><span className="brand-mark large-mark"><HeartHandshake size={25} /></span><span className="eyebrow">Good things find their way</span><h2>Not everything<br />lost stays lost.</h2><p>Join a thoughtful community helping belongings—and the people who care about them—find their way back.</p><div className="auth-aside-note"><ShieldCheck size={18} /><span><strong>Your privacy comes first</strong><small>Your contact details are never shown on public reports.</small></span></div></div>
        <span className="auth-aside-footer">Lost something? Let’s bring it back.</span>
      </div>
      <div className="auth-content">
        <div className="auth-form-wrap">
          <span className="eyebrow">{isRegister ? 'A better kind of community' : 'Welcome back'}</span>
          <h1>{isRegister ? 'Create your account' : 'Good to see you again.'}</h1>
          <p className="auth-subtitle">{isRegister ? 'A little help can make a big difference.' : 'Pick up right where you left off.'}</p>
          <form onSubmit={handleSubmit(submit)} className="form-stack">
            {isRegister && <label className="field"><span>Your name</span><input autoComplete="name" placeholder="What should we call you?" {...register('name')} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label>}
            <label className="field"><span>Email address</span><input autoComplete="email" type="email" placeholder="you@example.com" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
            <label className="field"><span>Password</span><input autoComplete={isRegister ? 'new-password' : 'current-password'} type="password" placeholder="At least 8 characters" {...register('password')} />{errors.password && <small className="field-error">{errors.password.message}</small>}</label>
            {error && <div className="form-alert">{error}</div>}
            <button type="submit" className="button button-primary button-full" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create my account' : 'Log in'} {!busy && <ArrowRight size={17} />}</button>
          </form>
          <p className="auth-switch">{isRegister ? 'Already part of the community?' : 'New to FindBack?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></p>
          <div className="auth-privacy"><ShieldCheck size={15} /> Your account details are encrypted and private.</div>
        </div>
      </div>
    </section>
  )
}
