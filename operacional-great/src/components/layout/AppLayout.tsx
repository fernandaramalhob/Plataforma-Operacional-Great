import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { CommandPaletteProvider } from '@/hooks/useCommandPalette';
import { TeamOfMonthModal } from './TeamOfMonthModal';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen app-shell-bg">
        <AppSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="relative min-h-screen md:pl-[312px]">
          <div className="mx-auto min-h-screen max-w-[1680px] px-3 pb-8 pt-3 md:px-6 md:pb-10 md:pt-6">
            <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
            <main className="mt-6 md:mt-8">
              <Outlet />
            </main>
          </div>
        </div>

        <CommandPalette />
        <TeamOfMonthModal />
      </div>
    </CommandPaletteProvider>
  );
}
