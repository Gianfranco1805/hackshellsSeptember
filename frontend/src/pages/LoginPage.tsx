import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/TextInput'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/walk', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-2xl font-extrabold tracking-tight">
          <span className="text-gold">Pawlina</span>
          <span className="text-navy">Walk</span>
        </p>
        <p className="mt-2 text-sm text-slate-600">Check-in safety for your walk home.</p>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-navy">Log in</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextInput label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-gold">
          Sign up
        </Link>
      </p>
    </div>
  )
}
