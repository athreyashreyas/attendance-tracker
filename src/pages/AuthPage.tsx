import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthForm } from '../components/auth/AuthForm';

export function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-parchment-100 px-6 pb-safe pt-safe">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-sm"
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
