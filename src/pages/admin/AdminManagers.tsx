import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Plus, Users, MoreVertical, Loader2, ShieldCheck, Search } from "lucide-react";
import { ManagerPermissionsModal } from "@/components/admin/ManagerPermissionsModal";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface Manager {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  clientes: number;
  emprestimos: number;
  manager_plafond?: number;
}

export default function AdminManagers() {
  const navigate = useNavigate();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [usersFound, setUsersFound] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchUsers = async (term: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, nome, email')
        .neq('role', 'manager')
        .or(`nome.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);

      if (error) throw error;
      setUsersFound(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      // 1. Fetch user profile with referral info
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('user_id, referred_by, nome')
        .eq('id', userId)
        .single();

      if (!profile || !profile.user_id) throw new Error("ID de utilizador não encontrado no perfil.");

      // 2. Handle Referral Bonus Reversal if applicable
      if (profile.referred_by) {
        const { data: referrer } = await (supabase as any)
          .from('profiles')
          .select('user_id, wallet_balance, score')
          .eq('id', profile.referred_by)
          .single();

        if (referrer) {
          // Subtract 200 from balance and score
          const newBalance = (referrer.wallet_balance || 0) - 200;
          const newScore = (referrer.score || 0) - 200;

          await (supabase as any)
            .from('profiles')
            .update({
              wallet_balance: newBalance,
              score: newScore
            })
            .eq('id', profile.referred_by);

          // Log the reversal transaction
          await (supabase as any)
            .from('transactions')
            .insert({
              user_id: referrer.user_id,
              amount: -200,
              type: 'BONUS',
              status: 'COMPLETED',
              description: `Estorno de Bónus: ${profile.nome || 'Utilizador'} promovido a Gestor.`
            });
        }
      }

      // 3. Atualizar perfil para gestor
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ role: 'manager' })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 4. Associar explicitamente o gestor na tabela user_roles
      await (supabase as any)
        .from('user_roles')
        .upsert({ user_id: profile.user_id, role: 'manager' }, { onConflict: 'user_id' });

      toast.success("Usuário promovido a gestor e bónus revertidos!");
      setIsAddManagerOpen(false);
      fetchManagers();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao promover usuário.");
    }
  };

  const handleDemote = async (userId: string) => {
    try {
      if (!window.confirm("Atenção: Tem a certeza que deseja remover os privilégios de gestor deste utilizador?")) return;
      setIsLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', userId)
        .single();

      if (!profile || !profile.user_id) throw new Error("ID de utilizador não encontrado.");

      // 1. Atualizar perfil para user normal
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Remover permanentemente da tabela user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.user_id)
        .eq('role', 'manager');

      toast.success("Gestor despromovido a cliente com sucesso.");
      fetchManagers();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover privilégios de gestor.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();

    // Sincronização em Tempo Real
    const channel = supabase
      .channel('admin-managers-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime Update (Managers):', payload);
          fetchManagers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all managers
      const { data: managersData, error: managersError } = await (supabase as any)
        .from('profiles')
        .select('id, user_id, nome, email, manager_plafond')
        .eq('role', 'manager');

      if (managersError) throw managersError;

      const refinedManagers: Manager[] = [];

      // 2. For each manager, fetch counts
      for (const m of (managersData || [])) {
        // Count referred clients
        const { count: clientCount } = await (supabase as any)
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', m.id)
          .eq('role', 'user');

        // Count loans for those clients
        // First get client user_ids
        const { data: clients } = await (supabase as any)
          .from('profiles')
          .select('user_id')
          .eq('referred_by', m.id)
          .eq('role', 'user');

        const clientUserIds = (clients || []).map((c: any) => c.user_id);

        let loanCount = 0;
        if (clientUserIds.length > 0) {
          const { count } = await (supabase as any)
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .in('user_id', clientUserIds);
          loanCount = count || 0;
        }

        refinedManagers.push({
          id: m.id,
          user_id: m.user_id,
          nome: m.nome || "Gestor Sem Nome",
          email: m.email || "N/A",
          clientes: clientCount || 0,
          emprestimos: loanCount,
          manager_plafond: m.manager_plafond || 0
        });
      }

      setManagers(refinedManagers);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar lista de gestores");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Gestores</h1>
            <p className="text-muted-foreground">Gerencie os gestores da plataforma</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={() => setIsAddManagerOpen(true)}>
              <Users className="w-4 h-4 text-primary" />
              Promover Usuário
            </Button>
          </div>
        </div>

        {/* Add Manager Dialog */}
        <Dialog open={isAddManagerOpen} onOpenChange={setIsAddManagerOpen}>
          <DialogContent className="max-w-md bg-white rounded-[2rem] p-8 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold">Promover a Gestor</DialogTitle>
              <DialogDescription>
                Pesquise um utilizador existente para lhe atribuir funções de gestor.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Email ou nome do utilizador..."
                  className="pl-10 h-12 bg-slate-50 border-slate-100 rounded-xl"
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    if (e.target.value.length > 2) handleSearchUsers(e.target.value);
                  }}
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : usersFound.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{u.nome || "Sem nome"}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{u.email}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-primary font-bold" onClick={() => handlePromote(u.id)}>
                      Selecionar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Carregando gestores...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managers.map((manager, i) => (
              <motion.div
                key={manager.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 shadow-card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="gradient-primary w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-bold text-white">
                      {manager.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="font-display font-bold">{manager.nome}</p>
                      <p className="text-xs text-muted-foreground">{manager.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-elevated border-slate-100">
                      <DropdownMenuItem
                        className="text-destructive font-bold text-xs cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => handleDemote(manager.id)}
                      >
                        Despromover a Cliente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-display font-bold">{manager.clientes}</p>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-display font-bold">{manager.emprestimos}</p>
                    <p className="text-xs text-muted-foreground">Empréstimos</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-primary uppercase">Plafond Total</span>
                  <span className="font-display font-bold text-slate-700">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(manager.manager_plafond || 0)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl bg-slate-50 border-slate-100 font-bold gap-2 text-slate-600 hover:bg-slate-100 transition-colors"
                  onClick={() => {
                    setSelectedManager(manager);
                    setIsPermissionsOpen(true);
                  }}
                >
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Gerir Acessos
                </Button>
              </motion.div>
            ))}

            {selectedManager && (
              <ManagerPermissionsModal
                isOpen={isPermissionsOpen}
                onClose={() => setIsPermissionsOpen(false)}
                onSuccess={fetchManagers}
                userId={selectedManager.id}
                userName={selectedManager.nome}
                authUserId={selectedManager.user_id}
              />
            )}

            {managers.length === 0 && (
              <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-20 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhum gestor cadastrado no momento.</p>
                <Button variant="ghost" className="mt-4 text-primary" onClick={() => setIsAddManagerOpen(true)}>
                  Promover o primeiro gestor
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
