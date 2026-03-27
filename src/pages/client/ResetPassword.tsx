import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Check if we are landing here with a valid session (Supabase handles the Hash fragment)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada ou link inválido. Por favor, tente recuperar a senha novamente.");
        navigate("/login");
      }
    };
    checkSession();
  }, [navigate]);

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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Senha atualizada com sucesso!");
      
      // Automatic redirect after success
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 border border-accent/20">
            <KeyRound className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Nova Senha</h1>
          <p className="text-slate-500">Defina a sua nova senha de acesso.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-elevated border border-slate-100">
          {!isSuccess ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest ml-1">Nova Senha</Label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-accent/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-widest ml-1">Confirmar Senha</Label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                  Use uma senha forte com letras, números e símbolos. Esta senha substitui a anterior imediatamente.
                </p>
              </div>

              <Button type="submit" size="xl" className="w-full h-16 rounded-2xl gradient-accent shadow-accent font-bold text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Atualizar Senha"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Tudo Pronto!</h3>
                <p className="text-slate-500">
                  A sua senha foi atualizada. Estamos a redirecionar você para o login...
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl text-slate-600 font-bold"
                onClick={() => navigate("/login")}
              >
                Ir para Login agora
              </Button>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-white shadow-soft border border-slate-100">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-center">Protocolo de Segurança Ativo</span>
        </div>
      </motion.div>
    </div>
  );
}
