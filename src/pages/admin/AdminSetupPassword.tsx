import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSetupPassword() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres.");
            return;
        }

        setIsLoading(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error("Usuário não encontrado.");

            const { error: profileError } = await (supabase as any)
                .from("profiles")
                .update({ must_change_password: false })
                .eq("user_id", userData.user.id);

            if (profileError) throw profileError;

            // Invalida o cache do perfil para que o ProtectedRoute veja a mudança
            await queryClient.invalidateQueries({ queryKey: ['profile', userData.user.id] });

            const { data: profile } = await (supabase as any)
                .from("profiles")
                .select("role")
                .eq("user_id", userData.user.id)
                .single();

            setIsSuccess(true);
            toast.success("Senha atualizada com sucesso!");

            setTimeout(() => {
                if (profile?.role === "admin" || profile?.role === "manager") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/app";
                }
            }, 1500);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar senha");
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white rounded-[2.5rem] p-12 shadow-elevated border border-success/10 text-center"
                >
                    <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-success" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">Tudo pronto!</h1>
                    <p className="text-slate-500 mb-8">Sua senha foi atualizada. Entrando no sistema...</p>
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 grayscale-[0.5]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-elevated border border-orange-100 relative"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-accent rounded-3xl flex items-center justify-center shadow-accent">
                    <KeyRound className="w-10 h-10 text-white" />
                </div>

                <div className="text-center mt-8 mb-10">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">Primeiro Acesso</h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-accent text-[10px] font-bold uppercase tracking-wider mb-4 border border-orange-100">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Troca de senha obrigatória
                    </div>
                    <p className="text-slate-500 text-sm">Para continuar, defina uma nova senha segura para a sua conta.</p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Nova Senha</Label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-accent/20"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest">Confirmar Senha</Label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-accent/20"
                            required
                        />
                    </div>

                    <Button type="submit" size="xl" className="w-full h-16 rounded-2xl gradient-accent shadow-accent font-bold text-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar e Entrar"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3" />
                        byteKwanza Security Protocol V2.1
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
