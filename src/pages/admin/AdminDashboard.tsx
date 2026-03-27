import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import { formatKz } from "@/lib/format";
import { Users, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StatItem {
  label: string;
  value: string;
  icon: any;
  change: string;
}

interface RecentLoan {
  id: string;
  cliente: string;
  valor: number;
  status: string;
  data: string;
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  APROVADO: { color: "bg-success/10 text-success", icon: CheckCircle },
  PENDENTE: { color: "bg-warning/10 text-warning", icon: Clock },
  PAGO: { color: "bg-primary/10 text-primary", icon: CheckCircle },
  ATRASADO: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total de clientes", value: "0", icon: Users, change: "..." },
    { label: "Empréstimos ativos", value: "0", icon: CreditCard, change: "..." },
    { label: "Volume emprestado", value: formatKz(0), icon: TrendingUp, change: "..." },
    { label: "Taxa de inadimplência", value: "0%", icon: AlertTriangle, change: "..." },
  ]);
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Sincronização em Tempo Real para Dashboard
    const channel = supabase
      .channel('admin-dashboard-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch users count
      const { count: usersCount } = await (supabase as any)
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      // Fetch loans summary
      // Note: If 'loans' table doesn't exist yet, this might catch an error
      const { data: loansData, error: loansError } = await (supabase as any)
        .from('loans')
        .select(`
          amount,
          status,
          created_at,
          profiles(nome)
        `);

      if (loansError && loansError.code !== 'PGRST116') {
        // Silently handle if table doesn't exist, showing 0s
        console.warn("Loans table might not be ready yet:", loansError.message);
      }

      const activeLoans = loansData?.filter((l: any) => l.status === 'APROVADO' || l.status === 'ATRASADO') || [];
      const totalVolume = loansData?.reduce((acc: number, l: any) => acc + (Number(l.amount) || 0), 0) || 0;
      const lateLoans = loansData?.filter((l: any) => l.status === 'ATRASADO') || [];
      const defaultRate = loansData?.length ? ((lateLoans.length / loansData.length) * 100).toFixed(1) : "0";

      setStats([
        { label: "Total de clientes", value: (usersCount || 0).toString(), icon: Users, change: "+100%" },
        { label: "Empréstimos ativos", value: activeLoans.length.toString(), icon: CreditCard, change: "Real" },
        { label: "Volume emprestado", value: formatKz(totalVolume), icon: TrendingUp, change: "Total" },
        { label: "Taxa de inadimplência", value: `${defaultRate}%`, icon: AlertTriangle, change: "Real" },
      ]);

      setRecentLoans(
        (loansData || []).slice(0, 5).map((l: any, i: number) => {
          const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
          return {
            id: i.toString(),
            cliente: profile?.nome || "Utilizador",
            valor: l.amount || 0,
            status: l.status || "PENDENTE",
            data: l.created_at ? new Date(l.created_at).toLocaleDateString() : "Data N/A"
          };
        })
      );

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar dados do Dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da plataforma em tempo real</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5 shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="gradient-primary p-2 rounded-lg">
                  <stat.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-success">{stat.change}</span>
              </div>
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Loans */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 className="font-display font-semibold text-lg">Empréstimos recentes</h2>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          <div className="divide-y divide-border">
            {recentLoans.map((loan) => {
              const config = statusConfig[loan.status] || statusConfig.PENDENTE;
              return (
                <div key={loan.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm text-white">
                      {loan.cliente.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{loan.cliente}</p>
                      <p className="text-xs text-muted-foreground">{loan.data}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-sm">{formatKz(loan.valor)}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.color}`}>
                      {loan.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentLoans.length === 0 && !isLoading && (
              <div className="p-10 text-center text-muted-foreground">
                Nenhum empréstimo recente encontrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
