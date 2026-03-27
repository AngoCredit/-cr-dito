import ClientLayout from "@/components/client/ClientLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Copy, Check, Users, Award, Star, Home, ShieldCheck } from "lucide-react";
import { getUserLevel, getNextLevel, LEVELS } from "@/lib/levels";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const mockReferrals = [
  { id: 1, nome: "Maria Santos", status: "PAGO", created_at: "2026-02-01" },
  { id: 2, nome: "Pedro Luís", status: "ATIVO", created_at: "2026-02-10" },
  { id: 3, nome: "Ana Costa", status: "PAGO", created_at: "2026-02-15" },
  { id: 4, nome: "Carlos Silva", status: "PENDENTE", created_at: "2026-03-01" },
];

// Remove old hardcoded levels constant


export default function Referrals() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      console.log("Iniciando busca de dados de indicação...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("Usuário não autenticado");
        return;
      }

      console.log("Usuário autenticado:", user.id);

      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('referral_code, score')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
      }

      if (profile) {
        setScore(profile.score || 0);
      }

      const { data: generatedInvites, error: invitesError } = await (supabase as any)
        .from('invites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (invitesError) console.error("Erro ao buscar convites:", invitesError);
      if (generatedInvites) setInvites(generatedInvites);

      const { count, error: countError } = await (supabase as any)
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user.id);

      if (countError) {
        console.error("Erro ao contar indicações:", countError);
      }

      setReferralCount(count || 0);
    } catch (error) {
      console.error("Exceção no fetchReferralData:", error);
    } finally {
      setLoading(false);
    }
  };

  const level = getUserLevel(score);
  const nextLevel = getNextLevel(score);
  const progress = nextLevel
    ? ((score - level.minScore) / (nextLevel.minScore - level.minScore)) * 100
    : 100;

  const generateInvite = async () => {
    try {
      if (invites.length >= 5) {
        toast.error("Limite máximo de 5 convites atingido.");
        return;
      }
      setGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCode = `INV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await (supabase as any).from('invites').insert({
        user_id: user.id,
        code: newCode
      });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint handling, highly unlikely collision
          toast.error("Tentando gerar código novamente...");
          return generateInvite();
        }
        throw error;
      }

      toast.success("Convite gerado com sucesso!");
      fetchReferralData();
    } catch (error: any) {
      toast.error("Erro ao gerar convite.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, nome, status, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });

      setReferrals(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const statusColor: Record<string, string> = {
    PAGO: "bg-success/10 text-success",
    ATIVO: "bg-primary/10 text-primary",
    PENDENTE: "bg-warning/10 text-warning",
    verified: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning"
  };

  return (
    <ClientLayout>
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Indicações</h2>
            <p className="text-muted-foreground text-sm">Indique amigos e ganhe bônus</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app")}
            className="rounded-xl border-slate-200 gap-2"
          >
            <Home className="w-4 h-4" /> Painel
          </Button>
        </div>

        {/* Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-card relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          <div className="relative z-10 w-full text-left">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Seus Convites</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-display font-bold text-primary tracking-tighter">{invites.length}</p>
                  <span className="text-sm font-bold text-slate-400">/ 5 max</span>
                </div>
              </div>
            </div>

            {invites.length < 5 && (
              <Button
                size="lg"
                onClick={generateInvite}
                disabled={generating}
                className="w-full mb-6 font-bold h-12 rounded-xl gradient-primary text-white shadow-xl shadow-primary/20 transition-all active:scale-95 border-0"
              >
                + Gerar Novo Convite
              </Button>
            )}

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div>
                    <p className={`font-display font-bold text-lg tracking-wider ${inv.status === 'ACTIVE' ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {inv.code}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">{new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${inv.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-slate-200 text-slate-400'}`}>
                      {inv.status === 'ACTIVE' ? 'Activo' : 'Usado'}
                    </span>
                    {inv.status === 'ACTIVE' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200" onClick={() => {
                        navigator.clipboard.writeText(inv.code);
                        toast.success("Código copiado!");
                      }}>
                        <Copy className="w-4 h-4 text-slate-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {invites.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-500 font-medium">Nenhum convite gerado.</p>
                  <p className="text-xs text-slate-400 mt-1">Gere o seu primeiro convite para começar.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Level Progression */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-card overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Seu Nível Atual</p>
                <h3 className="font-display text-xl font-bold text-primary">{level.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{score} Pontos</p>
              <p className="text-[10px] text-muted-foreground">{referralCount} Convites efetuados</p>
            </div>
          </div>

          {nextLevel ? (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span>Progresso para {nextLevel.name}</span>
                <span>Faltam {Math.round(nextLevel.minScore - score)} pontos para o nível {nextLevel.name}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full gradient-primary"
                />
              </div>
            </div>
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center mb-6">
              <p className="text-sm font-bold text-primary">👑 Nível Máximo Atingido: {level.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                Parabéns! Já possui todos os benefícios VIP da plataforma.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {level.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs bg-secondary/50 p-2 rounded-lg">
                <ShieldCheck className="w-3 h-3 text-success" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar border-t pt-4">
            {LEVELS.map((l) => (
              <div
                key={l.name}
                className={`flex-shrink-0 text-center px-4 py-3 rounded-xl transition-all border ${level.name === l.name
                  ? "gradient-primary text-white border-transparent shadow-md scale-105"
                  : score >= l.minScore
                    ? "bg-primary/5 text-primary border-primary/20"
                    : "bg-secondary text-muted-foreground border-border"
                  }`}
              >
                <div className="text-[10px] font-bold">{l.name}</div>
                <div className="text-[8px] opacity-70 font-medium">{l.minScore} pts</div>
                <div className="mt-1 text-[7px] bg-white/20 rounded px-1 py-0.5 inline-block font-black">
                  {l.creditMultiplier}x Lm.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral List */}
        <div>
          <h3 className="font-display font-semibold mb-3">Seus indicados</h3>
          <div className="space-y-3">
            {referrals.map((ref, i) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {ref.nome?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ref.nome || "Novo usuário"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${statusColor[ref.status] || "bg-slate-100 text-slate-500"}`}>
                  {ref.status}
                </span>
              </motion.div>
            ))}
            {referrals.length === 0 && !loading && (
              <div className="text-center py-10 opacity-50 space-y-2">
                <Users className="w-8 h-8 mx-auto" />
                <p className="text-sm">Ainda não indicou nenhum amigo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

