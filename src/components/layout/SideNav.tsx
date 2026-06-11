import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from './navItems';

/** Sidebar rail, shown at md+ (iPad, phone landscape); hidden on phone portrait. */
export function SideNav() {
  return (
    <aside className="hidden shrink-0 border-r border-parchment-300 bg-parchment-50/70 pl-safe pt-safe md:flex md:h-dvh md:w-60 md:flex-col md:px-4 md:py-6">
      <div className="mb-8 px-3">
        <span className="font-serif text-2xl text-ink-900">Attend</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, longLabel, icon: Icon, accent }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.span
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
                  accent
                    ? 'bg-sage-500 text-white shadow-sm'
                    : isActive
                      ? 'bg-sage-100 text-sage-700'
                      : 'text-ink-500 hover:bg-parchment-200'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                {longLabel}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
