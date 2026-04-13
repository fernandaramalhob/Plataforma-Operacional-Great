import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { CommandPaletteProvider } from '@/hooks/useCommandPalette';

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div className="pl-[260px] transition-all duration-300">
          <Topbar />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
