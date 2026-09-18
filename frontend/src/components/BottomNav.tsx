import { NavLink } from 'react-router-dom'
import { ContactsIcon, SettingsIcon, WalkIcon } from './icons'

const TABS = [
  { to: '/walk', label: 'Walk', Icon: WalkIcon },
  { to: '/contacts', label: 'Contacts', Icon: ContactsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
] as const

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[2000] flex items-center justify-around border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2"
      aria-label="Primary"
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'bg-navy text-white' : 'text-slate-500'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
