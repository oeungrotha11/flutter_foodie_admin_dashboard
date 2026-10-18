import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, ReceiptText, Users, Gift, LogOut, Menu, X, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { cx } from './ui.jsx';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reward-rules', label: 'Reward Rules', icon: Gift },
  { to: '/customers', label: 'Customers', icon: Users },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-pine text-white transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-saffron text-ink"><UtensilsCrossed className="size-5" /></span>
            <span className="font-display text-xl font-bold">Foodie</span>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white')}>
              {({ isActive }) => (<><Icon className={cx('size-[18px]', isActive && 'text-saffron')} />{label}</>)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{user?.username || 'Admin'}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"><LogOut className="size-4" />Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-6" /></button>
          <span className="font-display text-lg font-bold">Foodie Admin</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
