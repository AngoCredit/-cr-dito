import ClientLayout from "@/components/client/ClientLayout";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatKz } from "@/lib/format";
import { getUserLevel } from "@/lib/levels";
import { CreditCard, Wallet, Users, TrendingUp, ArrowUpRight, Loader2, ShieldAlert, Copy, Check, QrCode, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardData {
  nome: string;
  walletBalance: number;
  creditLimit: number;
  activeLoans: number;
  referralCount: number;
  referralCode: string;
  score: number;
  kycStatus: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    nome: "Utilizador",
    walletBalance: 0,
    creditLimit: 0,
    activeLoans: 0,
    referralCount: 0,
    referralCode: "...",
    score: 0,
    kycStatus: "not_started",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const [profileRes, loansRes] = await Promise.all([
        (supabase as any).from('profiles').select('nome, wallet_balance, credit_limit, referral_count, referral_code, kyc_status, score').eq('user_id', user.id).single(),
        (supabase as any).from('loans').select('status').eq('user_id', user.id)
      ]);

      if (profileRes.error) throw profileRes.error;

      const profile = profileRes.data;
      const loans = loansRes.data || [];
      const activeLoansCount = loans.filter((l: any) => l.status === 'APROVADO' || l.status === 'ATRASADO').length;

      setData({
        nome: profile.nome || "Utilizador",
        walletBalance: profile.wallet_balance || 0,
        creditLimit: profile.credit_limit || 0,
        activeLoans: activeLoansCount,
        referralCount: profile.referral_count || 0,
        referralCode: profile.referral_code || "...",
        score: profile.score || 0,
        kycStatus: profile.kyc_status || "not_started",
      });

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const level = getUserLevel(data.score);
  const boostedLimit = (data.creditLimit || 0) * level.creditMultiplier;

  const copyRef = () => {
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    toast.success("Código de indicação copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-muted-foreground p-6 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-foreground">A sincronizar os seus dados...</h3>
            <p className="text-sm">Estamos a preparar a sua visão geral financeira.</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">Bem-vindo à byteKwanza,</p>
          <div className="flex items-center justify-between mt-1">
            <h2 className="font-display text-4xl font-black text-primary tracking-tight">
              {data.nome} <span className="text-lg font-mono font-bold text-primary/40 ml-2">({data.referralCode})</span>
            </h2>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${data.kycStatus === 'verified'
              ? "bg-success/10 text-success border-success/20"
              : data.kycStatus === 'pending'
                ? "bg-orange-100 text-orange-700 border-orange-200"
                : "bg-red-100 text-red-700 border-red-200"
              }`}>
              KYC: {data.kycStatus === 'verified' ? 'Verificado' : data.kycStatus === 'pending' ? 'Pendente' : 'Não Verificado'}
            </div>
          </div>
        </motion.div>

        {/* KYC Alert */}
        {(data.kycStatus === 'not_started' || data.kycStatus === 'rejected') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-warning/10 border border-warning/20 p-4 rounded-2xl flex items-center gap-4 cursor-pointer"
            onClick={() => navigate("/app/kyc")}
          >
            <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-700" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider">Verificação Necessária</h4>
              <p className="text-[10px] text-orange-700/80 mt-0.5">Complete o seu KYC para desbloquear solicitações de crédito.</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-orange-700" />
          </motion.div>
        )}

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-card relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo disponível</p>
              <p className="text-5xl font-display font-bold text-primary tracking-tight">{formatKz(data.walletBalance)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-primary/10">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Nível {level.name} ({level.creditMultiplier}x)
                </div>
                {level.interestDiscount > 0 && (
                  <div className="bg-success/10 text-success px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-success/10">
                    <Percent className="w-3.5 h-3.5" />
                    -{level.interestDiscount * 100}% Juros
                  </div>
                )}
              </div>
            </div>

            <div
              onClick={(e) => { e.stopPropagation(); copyRef(); }}
              className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl p-4 flex flex-col items-center gap-2 border border-slate-100 cursor-pointer group min-w-[140px]"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de Indicação</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-primary tracking-wider">{data.referralCode}</span>
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-slate-400 group-hover:text-primary" />}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Limite de crédito", value: data.kycStatus === 'verified' && data.creditLimit > 0 ? formatKz(data.creditLimit) : "Em Análise", icon: CreditCard, color: "text-blue-500" },
            { label: "Solicitações", value: data.activeLoans.toString(), icon: ArrowUpRight, color: "text-indigo-500" },
            { label: "Saldo total", value: formatKz(data.walletBalance), icon: Wallet, color: "text-emerald-500" },
            { label: "Indicações", value: data.referralCount.toString(), icon: Users, color: "text-amber-500" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:border-primary/20 transition-all active:scale-95"
            >
              <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="font-display font-bold text-base mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg px-1">Ações rápidas</h3>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="fintech" size="lg" className="flex-col h-auto py-5 gap-3 rounded-2xl shadow-md" asChild>
              <Link to="/app/credito">
                <CreditCard className="w-6 h-6" />
                <span className="text-[11px] font-bold uppercase tracking-tighter">Credito</span>
              </Link>
            </Button>
            <Button variant="outline-primary" size="lg" className="flex-col h-auto py-5 gap-3 rounded-2xl border-2" asChild>
              <Link to="/app/carteira">
                <Wallet className="w-6 h-6 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-tighter">Depósito</span>
              </Link>
            </Button>
            <Button variant="outline-primary" size="lg" className="flex-col h-auto py-5 gap-3 rounded-2xl border-2" asChild>
              <Link to="/app/indicacoes">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-tighter">Indicar</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
