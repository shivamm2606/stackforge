import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/auth'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-80 p-6 space-y-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
      >
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">Login</h2>
          <p className="text-sm text-gray-500">Welcome back</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-sm focus:bg-white focus:outline-none focus:border-gray-300 transition"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-sm focus:bg-white focus:outline-none focus:border-gray-300 transition"
          required
        />

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
        >
          Login
        </button>

        <p className="text-xs text-center text-gray-500">
          Don’t have an account?{' '}
          <span
            onClick={() => navigate('/signup')}
            className="text-gray-900 cursor-pointer hover:underline"
          >
            Signup
          </span>
        </p>
      </form>
    </div>
  )
}