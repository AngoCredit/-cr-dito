import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Eye, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  bi: string;
  score: number;
  status: string;
  kyc_status?: string;
  referral_code?: string;
  level?: string;
}

const statusColor: Record<string, string> = {
  ATIVO: "bg-success/10 text-success",
  PENDENTE: "bg-warning/10 text-warning",
  BLOQUEADO: "bg-destructive/10 text-destructive",
};

const kycColor: Record<string, string> = {
  verified: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  not_started: "bg-slate-100 text-slate-400",
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();

    // Sincronização em Tempo Real
    const channel = supabase
      .channel('admin-users-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime Update (Profiles):', payload);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja DELETAR o usuário ${nome}? Esta ação é irreversível e removerá todos os dados de autenticação.`)) {
      return;
    }

    try {
      setIsLoading(true);

      // Chamada a uma função RPC (segura) na base de dados em vez da Edge Function
      const { error } = await (supabase as any).rpc('delete_user_by_admin', {
        target_user_id: userId
      });

      if (error) throw error;

      toast.success("Usuário deletado com sucesso");
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao deletar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      setIsLoading(true);
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`Usuário ${status === 'ATIVO' ? 'ativado' : 'bloqueado'} com sucesso`);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.bi?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie os clientes da plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/admin/usuarios/novo")}
              className="gradient-primary h-12 px-6 rounded-xl font-bold shadow-primary text-white"
            >
              Novo Usuário
            </Button>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-10 h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Carregando base de dados institucional...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Usuário</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">BI</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Referência</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">KYC</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Score</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Nível</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="gradient-primary w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs text-white">
                            {user.nome?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.nome || "Utilizador"}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono">{user.bi || "N/A"}</td>
                      <td className="px-5 py-4 text-sm font-bold text-indigo-600 font-display tracking-wider">
                        {user.referral_code || "---"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${kycColor[user.kyc_status || "not_started"]}`}>
                          {user.kyc_status === 'verified' ? 'Verificado' : user.kyc_status === 'pending' ? 'Pendente' : user.kyc_status === 'rejected' ? 'Rejeitado' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full gradient-primary rounded-full"
                              style={{ width: `${Math.min(((user.score || 0) / 1000) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-display font-bold">{user.score || 0}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${user.level === 'Presidente' ? 'border-amber-500 text-amber-600 bg-amber-50' :
                          user.level === 'Platina' ? 'border-purple-500 text-purple-600 bg-purple-50' :
                            user.level === 'Ouro' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                              user.level === 'Prata' ? 'border-slate-400 text-slate-600 bg-slate-50' :
                                user.level === 'Bronze' ? 'border-orange-400 text-orange-600 bg-orange-50' :
                                  'border-slate-200 text-slate-400'
                          }`}>
                          {user.level || 'Iniciante'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[user.status || "PENDENTE"]}`}>
                          {user.status || "PENDENTE"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/usuarios/${user.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(user.status === "PENDENTE" || !user.status) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" onClick={() => handleUpdateStatus(user.id, 'ATIVO')}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleUpdateStatus(user.id, 'BLOQUEADO')}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-destructive transition-colors"
                            onClick={() => handleDelete(user.user_id, user.nome)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        Nenhum utilizador encontrado na base de dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
