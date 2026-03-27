import ClientLayout from "@/components/client/ClientLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatKz, formatDate } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Wallet, Clock, CheckCircle, XCircle } from "lucide-react";
import { WithdrawModal } from "@/components/client/WithdrawModal";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const WalletPage = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [iban, setIban] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Fetch Balance & IBAN
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('wallet_balance, iban')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setBalance(profileData.wallet_balance || 0);
          setIban(profileData.iban || "");
        }

        // Fetch Transactions
        const { data: txData } = await (supabase as any)
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .neq('amount', 0)
          .order('created_at', { ascending: false });

        if (txData) setTransactions(txData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ClientLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-card text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          <div className="relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo disponível</p>
            <p className="text-5xl font-display font-bold mt-2 text-primary tracking-tighter">{formatKz(balance)}</p>
            <Button
              variant="hero"
              size="lg"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="mt-8 font-bold px-12 h-14 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
            >
              Solicitar saque
            </Button>
          </div>
        </motion.div>

        {/* Transactions */}
        <div>
          <h3 className="font-display font-semibold mb-4">Histórico de transações</h3>
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 shadow-card"
                >
                  <div className={`p-2 rounded-lg ${tx.amount > 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="w-5 h-5 text-success" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                      {tx.type === 'WITHDRAWAL' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${tx.status === 'PENDING' ? 'bg-warning/10 text-warning' :
                          tx.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                          }`}>
                          {tx.status === 'PENDING' ? 'Pendente' : tx.status === 'COMPLETED' ? 'Concluído' : 'Recusado'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-display font-bold text-sm ${tx.amount > 0 ? "text-success" : "text-slate-800"}`}>
                    {tx.amount > 0 ? "+" : ""}{formatKz(tx.amount)}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="bg-card/50 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                <p className="text-sm">Nenhuma transação encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        balance={balance}
        iban={iban}
        userId={userId}
        onSuccess={fetchData}
      />
    </ClientLayout>
  );
};

export default WalletPage;
