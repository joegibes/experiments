import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Map, Clock, BarChart2, User, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const navItems = [
    { to: '/', icon: Map, label: 'Map' },
    { to: '/schedule', icon: Clock, label: 'Schedule' },
    { to: '/results', icon: BarChart2, label: 'Results' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <main className="flex-1 relative">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#000000] border-t border-white/10 pb-safe-area-inset-bottom z-[2000]">
        <div className="flex justify-around items-center h-[70px]">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-colors',
                  isActive ? 'text-orange-500' : 'text-neutral-500 hover:text-neutral-300'
                )
              }
            >
              <Icon size={24} strokeWidth={2.5} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </NavLink>
          ))}
          {/* Decorative Sparkle for 'Cyberpunk' feel from screenshot */}
          <div className="absolute right-4 bottom-24 pointer-events-none opacity-0">
             <Sparkles className="text-white w-6 h-6" />
          </div>
        </div>
      </nav>
    </div>
  );
};
