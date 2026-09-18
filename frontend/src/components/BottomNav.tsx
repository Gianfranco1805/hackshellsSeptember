import { NavLink } from 'react-router-dom'

const LINK_BASE = 'flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium'
const LINK_ACTIVE = 'text-violet-600'
const LINK_INACTIVE = 'text-slate-500'

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <NavLink to="/walk" className={({ isActive }) => `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`}>
        Walk
      </NavLink>
      <NavLink to="/contacts" className={({ isActive }) => `${LINK_BASE} ${isActive ? LINK_ACTIVE : LINK_INACTIVE}`}>
        Contacts
      </NavLink>
    </nav>
  )
}
