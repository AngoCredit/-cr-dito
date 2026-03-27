import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, CreditCard, Wallet, Users, LogOut, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKz } from "@/lib/format";

const navItems = [
  { to: "/app", icon: Home, label: "Início" },
  { to: "/app/credito", icon: CreditCard, label: "Crédito" },
  { to: "/app/carteira", icon: Wallet, label: "Carteira" },
  { to: "/app/indicacoes", icon: Users, label: "Indicações" },
  { to: "/app/chat", icon: MessageCircle, label: "Chat" },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (user) {
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('wallet_balance')
          .eq('user_id', user.id)
          .single();
        if (profileData) setBalance(profileData.wallet_balance);
      }
    };
    fetchBalance();

    // Opcional: Realtime para o saldo
    const channel = supabase
      .channel('balance-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.new.wallet_balance !== undefined) {
          setBalance(payload.new.wallet_balance);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="gradient-dark px-4 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex flex-col">
          <h1 className="font-display text-xl font-bold text-white">
            +Kwanz<span className="text-primary-foreground/80">as</span>
          </h1>
          {balance !== null && (
            <span className="text-[10px] font-bold text-primary-foreground/60 uppercase tracking-tighter">
              Saldo: {formatKz(balance)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white/70 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 flex justify-around z-50">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
