import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthForm } from '../components/auth/AuthForm';

export function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="scroll-ios flex h-[var(--app-height)] flex-col overflow-y-auto bg-parchment-100">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center px-6 py-12 pb-safe pt-safe"
      >
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl text-ink-900">Attend</h1>
          <p className="mt-2 font-sans text-sm text-ink-500">
            Keep your attendance above the line.
          </p>
        </div>

        <AuthForm onAuthed={() => navigate('/dashboard', { replace: true })} />
      </motion.div>
    </div>
  );
}
