import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { signInWithEmail, signUpWithEmail } from '../../hooks/useAuth';
import { spring } from '../../lib/motion';

type Mode = 'signin' | 'signup';

interface AuthFormProps {
  onAuthed: () => void;
}

export function AuthForm({ onAuthed }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [offerSignup, setOfferSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setOfferSignup(false);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          if (/invalid login credentials/i.test(err)) {
            setError(
              "We couldn't sign you in. If you're new here, you can create an account below. Otherwise, double-check your password and try again."
            );
            setOfferSignup(true);
          } else {
            setError(err);
          }
          return;
        }
        onAuthed();
      } else {
        const { error: err, needsConfirmation } = await signUpWithEmail(
          email,
          password
        );
        if (err) {
          setError(err);
          return;
        }
        if (needsConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
          return;
        }
        onAuthed();
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setOfferSignup(false);
  }

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="mb-6 flex rounded-lg bg-parchment-200 p-1">
        {(['signin', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className="relative flex-1 rounded-md px-4 py-2 font-sans text-sm font-medium"
          >
            {mode === m && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-0 rounded-md bg-parchment-50 shadow-sm"
                transition={spring}
              />
            )}
            <span
              className={`relative z-10 ${
                mode === m ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-[2.35rem] text-ink-300"
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            className="pl-9"
          />
        </div>

        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-3 top-[2.35rem] text-ink-300"
          />
          <Input
            label="Password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9"
          />
        </div>

        <AnimatePresence initial={false}>
          {mode === 'signup' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="space-y-2">
            <p className="font-sans text-sm text-rose-600">{error}</p>
            {offerSignup && (
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-sans text-sm font-semibold text-sage-600"
              >
                Create an account →
              </button>
            )}
          </div>
        )}
        {info && <p className="font-sans text-sm text-sage-600">{info}</p>}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : mode === 'signin' ? (
            'Sign in'
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </div>
  );
}
