import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, UserCog, LogOut, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const sidebarItems = [
  { id: "dashboard", to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { id: "usuarios", to: "/admin/usuarios", icon: Users, label: "Usuários" },
  { id: "emprestimos", to: "/admin/emprestimos", icon: CreditCard, label: "Empréstimos" },
  { id: "gestores", to: "/admin/gestores", icon: UserCog, label: "Gestores" },
  { id: "configuracoes", to: "/admin/configuracoes", icon: Settings, label: "Definições" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [allowedItems, setAllowedItems] = useState<{ id: string; to: string; icon: any; label: string }[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserAccess();
  }, []);

  const fetchUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setRole(profile?.role || null);

      if (profile?.role === 'manager') {
        const { data: permissions } = await (supabase as any)
          .from('editor_menu_permissions')
          .select('menu_id')
          .eq('user_id', user.id);

        const allowedIds = permissions?.map((p: any) => p.menu_id) || [];
        setAllowedItems(sidebarItems.filter(item => item.id === 'dashboard' || allowedIds.includes(item.id)));
      } else {
        setAllowedItems(sidebarItems);
      }
    } catch (error) {
      console.error("Error fetching access:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && role === 'manager') {
      const currentPath = location.pathname;
      if (currentPath !== '/admin' && currentPath !== '/admin/') {
        const isAllowed = allowedItems.some(i => currentPath === i.to || currentPath.startsWith(i.to + '/'));
        if (!isAllowed) {
          window.location.href = '/admin';
        }
      }
    }
  }, [isLoading, role, location.pathname, allowedItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 gradient-dark flex flex-col shrink-0 hidden md:flex">
        <div className="p-6">
          <h1 className="font-display text-2xl font-bold text-primary-foreground">
            +Kwanz<span className="text-accent">as</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Painel Admin</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {allowedItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active
                  ? "gradient-primary text-primary-foreground shadow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 gradient-dark px-4 py-3 flex items-center justify-between z-50">
        <h1 className="font-display text-lg font-bold text-primary-foreground">
          +Kwanz<span className="text-accent">as</span> Admin
        </h1>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 md:pt-8 pt-16">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 flex justify-around z-50">
        {allowedItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${active ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
