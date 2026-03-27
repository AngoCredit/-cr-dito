import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { formatKz } from "@/lib/format";
import { CheckCircle, XCircle, Eye, Clock, AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  months: number;
  interest_rate: number;
  status: string;
  created_at: string;
  credit_score?: number;
  credit_decision?: string;
  profiles: {
    id: string;
    nome: string;
    email: string;
    score: number;
  };
}

const statusConfig: Record<string, { color: string }> = {
  PENDENTE: { color: "bg-warning/10 text-warning" },
  APROVADO: { color: "bg-success/10 text-success" },
  PAGO: { color: "bg-primary/10 text-primary" },
  ATRASADO: { color: "bg-destructive/10 text-destructive" },
  REJEITADO: { color: "bg-slate-100 text-slate-500" },
};

const REJECTION_REASONS = [
  "Score de crédito insuficiente",
  "Documentação incompleta ou inválida",
  "Rendimento insuficiente para o valor solicitado",
  "Cliente com histórico de atrasos",
];

export default function AdminLoans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({
    PENDENTE: 0,
    APROVADO: 0,
    ATRASADO: 0,
    PAGO: 0
  });

  // Rejection dialog state
  const [rejectingLoan, setRejectingLoan] = useState<Loan | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLoans();

    // Sincronização em Tempo Real
    const channel = supabase
      .channel('admin-loans-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => fetchLoans())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (loanId: string, newStatus: string, amount: number, reason?: string) => {
    try {
      setIsSubmitting(true);

      // 1. Get current user profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado");

      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, role, manager_plafond')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) throw profileError;

      // 2. If approving and is manager, check plafond
      if (newStatus === 'APROVADO' && profile.role === 'manager') {
        const plafond = profile.manager_plafond || 0;
        if (amount > plafond) {
          toast.error(`Limite excedido. O seu plafond máximo é de ${formatKz(plafond)}`);
          return;
        }
      }

      // 3. Update loan
      const updateData: any = { status: newStatus };
      if (reason) updateData.rejection_reason = reason;

      const { error: updateError } = await (supabase as any)
        .from('loans')
        .update(updateData)
        .eq('id', loanId);

      if (updateError) throw updateError;

      // 4. Log action
      await (supabase as any).from('admin_audit_logs').insert({
        admin_id: authUser.id,
        action: newStatus === 'APROVADO' ? 'APPROVE_LOAN' : 'REJECT_LOAN',
        entity: 'loans',
        entity_id: loanId,
        details: { amount, status: newStatus, reason: reason || null }
      });

      // 5. Notify user if rejected
      if (newStatus === 'REJEITADO' && reason) {
        // Find the loan to get user_id
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
          await (supabase as any).from('notifications').insert({
            user_id: loan.user_id,
            title: "Empréstimo Rejeitado",
            message: `O seu pedido de empréstimo de ${formatKz(amount)} foi rejeitado. Motivo: ${reason}`,
            is_read: false
          });
        }
      }

      toast.success(`Empréstimo ${newStatus === 'APROVADO' ? 'aprovado' : 'rejeitado'} com sucesso!`);
      setRejectingLoan(null);
      setSelectedReason("");
      fetchLoans();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('loans')
        .select(`
          *,
          profiles(id, nome, email, score)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loanData = data || [];
      setLoans(loanData);

      // Calculate counts
      const newCounts = { PENDENTE: 0, APROVADO: 0, ATRASADO: 0, PAGO: 0 };
      loanData.forEach((l: any) => {
        if (newCounts[l.status as keyof typeof newCounts] !== undefined) {
          newCounts[l.status as keyof typeof newCounts]++;
        }
      });
      setCounts(newCounts);

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar empréstimos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Empréstimos</h1>
          <p className="text-muted-foreground">Gerencie solicitações e empréstimos ativos</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pendentes", value: counts.PENDENTE.toString(), icon: Clock, color: "text-warning" },
            { label: "Aprovados", value: counts.APROVADO.toString(), icon: CheckCircle, color: "text-success" },
            { label: "Atrasados", value: counts.ATRASADO.toString(), icon: AlertTriangle, color: "text-destructive" },
            { label: "Pagos", value: counts.PAGO.toString(), icon: CheckCircle, color: "text-primary" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-4 shadow-card"
            >
              <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
              <p className="text-2xl font-display font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Consultando carteira de empréstimos...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Prazo</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Score</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loans.map((loan, i) => (
                    <motion.tr
                      key={loan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="gradient-primary w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs text-white">
                            {loan.profiles?.nome?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{loan.profiles?.nome || "Utilizador"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(loan.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-display font-bold text-sm">{formatKz(loan.amount)}</td>
                      <td className="px-5 py-4 text-sm">{loan.months} meses</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-display font-bold ${(loan.credit_score || loan.profiles?.score || 0) >= 750 ? "text-success" : (loan.credit_score || loan.profiles?.score || 0) >= 600 ? "text-warning" : "text-destructive"}`}>
                            {loan.credit_score || loan.profiles?.score || 0}
                          </span>
                          {loan.credit_decision && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter w-fit ${loan.credit_decision === 'APROVADO' ? 'bg-success/10 text-success border border-success/20' :
                              loan.credit_decision === 'ANALISE_MANUAL' ? 'bg-warning/10 text-warning border border-warning/20' :
                                'bg-destructive/10 text-destructive border border-destructive/20'
                              }`}>
                              {loan.credit_decision === 'ANALISE_MANUAL' ? 'Análise Manual' : loan.credit_decision}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[loan.status]?.color || "bg-slate-100 text-slate-500"}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-primary"
                            onClick={() => navigate(`/admin/usuarios/${loan.profiles?.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {loan.status === "PENDENTE" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success hover:text-success"
                                onClick={() => handleUpdateStatus(loan.id, 'APROVADO', loan.amount)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setRejectingLoan(loan);
                                  setSelectedReason("");
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {loans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        Nenhuma solicitação de empréstimo encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Dialog Overlay */}
      <AnimatePresence>
        {rejectingLoan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setRejectingLoan(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-800">Rejeitar Empréstimo</h3>
                  <p className="text-xs text-muted-foreground">
                    {rejectingLoan.profiles?.nome} — {formatKz(rejectingLoan.amount)}
                  </p>
                </div>
              </div>

              {/* Reason Options */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Motivo da rejeição</p>
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${selectedReason === reason
                      ? "border-destructive bg-destructive/5 text-destructive shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-bold"
                  onClick={() => {
                    setRejectingLoan(null);
                    setSelectedReason("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-12 rounded-xl font-bold"
                  disabled={!selectedReason || isSubmitting}
                  onClick={() => handleUpdateStatus(rejectingLoan.id, 'REJEITADO', rejectingLoan.amount, selectedReason)}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Rejeição
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
