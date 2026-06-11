import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from './navItems';

/** Bottom tab bar for phone portrait only (hidden at md+, where the rail takes over). */
export function BottomNav() {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-parchment-300 bg-parchment-100/90 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, accent }) => (
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
                      ? 'flex h-8 w-8 items-center justify-center rounded-full bg-sage-500 text-white shadow-sm'
                      : 'flex h-8 items-center justify-center'
                  }
                >
                  <Icon
                    size={accent ? 20 : 22}
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
                    accent
                      ? 'text-sage-600'
                      : isActive
                        ? 'text-sage-600'
                        : 'text-ink-300'
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
