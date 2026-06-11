import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, CheckCircle2, Settings, type LucideIcon } from 'lucide-react';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

const tabs: Tab[] = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/quick-mark', label: 'Mark', icon: CheckCircle2, accent: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-parchment-300 bg-parchment-100/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {tabs.map(({ to, label, icon: Icon, accent }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-0.5 py-1"
          >
            {({ isActive }) => (
              <>
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={
                    accent
                      ? '-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage-500 text-white shadow-md'
                      : 'flex h-7 items-center justify-center'
                  }
                >
                  <Icon
                    size={22}
                    strokeWidth={2}
                    className={
                      accent
                        ? 'text-white'
                        : isActive
                          ? 'text-sage-600'
                          : 'text-ink-300'
                    }
                  />
                </motion.span>
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-sage-600' : 'text-ink-300'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
