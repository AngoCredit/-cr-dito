import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Fingerprint, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch user role and score for gamification
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('id, role, score')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile) {
          // Gamification: Daily Login Points
          const todayDate = new Date().toISOString().split('T')[0];
          const { count } = await (supabase as any)
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', data.user.id)
            .eq('type', 'BONUS')
            .like('description', 'Bónus de Login Diário%')
            .gte('created_at', todayDate + 'T00:00:00Z');

          if (count === 0) {
            await (supabase as any).from('profiles').update({
              score: (profile.score || 0) + 5
            }).eq('id', profile.id);

            await (supabase as any).from('transactions').insert({
              user_id: data.user.id,
              type: 'BONUS',
              amount: 0,
              description: `Bónus de Login Diário (+5 pts)`
            });

            toast.success("Recebeu +5 pontos pelo login diário!", { icon: "🌟" });
          }
        }

        toast.success("Login efetuado com sucesso");
        if (profile?.role === 'admin' || profile?.role === 'manager') {
          navigate("/admin");
        } else {
          navigate("/app");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden text-primary/10">
        <img src="/images/financial_bg.png" alt="" className="w-full h-full object-cover" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 font-display text-2xl font-bold text-primary">
            +Kwanz<span className="text-accent">as</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Acesso Seguro</h1>
          <p className="text-slate-500">Introduza as suas credenciais para gerir a sua conta</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-elevated border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email corporativo ou pessoal</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@servico.com"
                className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-body"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
                <Link to="#" className="text-xs text-primary font-bold hover:underline">Esqueceu-se?</Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-body"
              />
            </div>

            <Button size="lg" className="w-full h-12 rounded-xl shadow-primary font-bold" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Lock className="mr-2 w-4 h-4" /> Entrar no sistema</>}
            </Button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-white px-3 text-slate-400">Ou continuar com</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 text-slate-600 gap-3 font-semibold">
            <Fingerprint className="w-5 h-5 text-primary" />
            Biometria
          </Button>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          Ainda não faz parte?{" "}
          <Link to="/cadastro" className="text-primary hover:underline font-bold">
            Abrir conta institucional
          </Link>
        </p>

        <Link to="/" className="flex items-center justify-center gap-2 mt-8 text-slate-400 hover:text-primary transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a página inicial
        </Link>

        {/* Developer Credit */}
        <div className="mt-12 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-white shadow-soft border border-slate-100 transition-transform hover:scale-105">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Desenvolvido por</span>
          <img src="/images/bytekwanza_logo_hq.png" alt="byteKwanza" className="h-8 w-auto" />
        </div>
      </motion.div>
    </div>
  );
}
