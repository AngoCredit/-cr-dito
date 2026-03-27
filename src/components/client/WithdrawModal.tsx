import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKz } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Banknote, CreditCard } from "lucide-react";

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    iban: string;
    userId: string;
    onSuccess: () => void;
}

export function WithdrawModal({ isOpen, onClose, balance, iban: initialIban, userId, onSuccess }: WithdrawModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [iban, setIban] = useState<string>(initialIban || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = Number(amount);

        if (numAmount < 1000) {
            toast.error("O valor mínimo de saque é 1.000 Kz");
            return;
        }

        if (numAmount > balance) {
            toast.error("Saldo insuficiente para este saque.");
            return;
        }

        if (!iban || iban.length < 21) {
            toast.error("Por favor, insira um IBAN válido.");
            return;
        }

        try {
            setIsSubmitting(true);

            // 1. Insert withdrawal request
            const { error: txError } = await (supabase as any).from('transactions').insert({
                user_id: userId,
                amount: -numAmount, // Negative amount for withdrawals in history
                type: 'WITHDRAWAL',
                status: 'PENDING',
                description: `Saque para IBAN: ${iban}`
            });

            if (txError) throw txError;

            // 2. (Optional) Update user balance immediately to lock the funds. 
            // If we prefer admin to deduct only on approval, we can skip this. Let's deduct immediately for safety.
            // E.g., user can't request a withdrawal and spend the same balance elsewhere.
            const newBalance = balance - numAmount;
            const { error: profileError } = await (supabase as any)
                .from('profiles')
                .update({ wallet_balance: newBalance })
                .eq('user_id', userId);

            if (profileError) throw profileError;

            toast.success("Pedido de saque enviado com sucesso! Aguarde aprovação.");
            onSuccess();
            onClose();
            setAmount("");

        } catch (error: any) {
            console.error("Erro ao solicitar saque:", error);
            toast.error(error.message || "Não foi possível processar o pedido. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-0 shadow-2xl">
                <DialogHeader className="mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        <Banknote className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="font-display text-2xl font-bold">Solicitar Saque</DialogTitle>
                    <DialogDescription className="text-sm">
                        Retire os fundos disponíveis da sua carteira para a sua conta bancária.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo Disponível</span>
                        <span className="text-base font-display font-bold text-primary">{formatKz(balance)}</span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Valor a levantar (Kz)</label>
                            <Input
                                type="number"
                                placeholder="Ex: 50000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min={1000}
                                max={balance}
                                step={100}
                                required
                                className="h-12 bg-white rounded-xl border-slate-200 text-lg font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Confirme o IBAN</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="AO06..."
                                    value={iban}
                                    onChange={(e) => setIban(e.target.value)}
                                    required
                                    className="h-12 bg-white rounded-xl border-slate-200 pl-11 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto h-12 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || balance < 1000}
                            className="w-full sm:w-auto h-12 rounded-xl gradient-primary text-white font-bold"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                "Confirmar Saque"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
