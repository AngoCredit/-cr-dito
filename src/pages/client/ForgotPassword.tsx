import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor, insira o seu e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao enviar e-mail de recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 font-display text-2xl font-bold text-primary">
            +Kwanz<span className="text-accent">as</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Recuperar Senha</h1>
          <p className="text-slate-500">Insira o e-mail associado à sua conta para receber as instruções.</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-elevated border border-slate-100">
          {!isSent ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium ml-1">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@servico.com"
                    className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-primary/20 transition-all font-body"
                  />
                </div>
              </div>

              <Button size="lg" className="w-full h-14 rounded-2xl shadow-primary font-bold text-lg" type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Enviar Instruções"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto border border-green-100">
                <ShieldCheck className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Verifique a sua caixa de entrada</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Enviamos um link de recuperação para <strong>{email}</strong>. 
                  Clique no link para definir uma nova senha.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl text-slate-600 font-bold"
                onClick={() => setIsSent(false)}
              >
                Tentar outro e-mail
              </Button>
            </div>
          )}
        </div>

        <Link to="/login" className="flex items-center justify-center gap-2 mt-8 text-slate-400 hover:text-primary transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>

        {/* Developer Credit */}
        <div className="mt-12 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-white shadow-soft border border-slate-100">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Desenvolvido por</span>
          <img src="/images/bytekwanza_logo_hq.png" alt="byteKwanza" className="h-8 w-auto" />
        </div>
      </motion.div>
    </div>
  );
}
