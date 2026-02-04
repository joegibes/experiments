import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Map, Calendar, Car, Home } from 'lucide-react';
import clsx from 'clsx';

export const Layout: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/schedule', icon: Calendar, label: 'Schedule' },
    { to: '/logistics', icon: Car, label: 'Travel' },
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-neutral-800 border-t border-neutral-700 pb-safe-area-inset-bottom z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center w-full h-full space-y-1',
                  isActive ? 'text-blue-400' : 'text-neutral-400 hover:text-neutral-200'
                )
              }
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
