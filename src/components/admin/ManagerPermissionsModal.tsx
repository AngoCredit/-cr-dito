import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

interface PermissionModalProps {
  userId: string;
  userName: string;
  authUserId: string; // The UUID from auth.users
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MENU_OPTIONS = [
  { id: "dashboard", label: "Dashboard", path: "/admin" },
  { id: "usuarios", label: "Usuários", path: "/admin/usuarios" },
  { id: "emprestimos", label: "Empréstimos", path: "/admin/emprestimos" },
  { id: "gestores", label: "Gestores", path: "/admin/gestores" },
  { id: "configuracoes", label: "Definições", path: "/admin/configuracoes" },
];

export function ManagerPermissionsModal({ userId, userName, authUserId, isOpen, onClose, onSuccess }: PermissionModalProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [managerPlafond, setManagerPlafond] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && authUserId && userId) {
      fetchManagerData();
    }
  }, [isOpen, authUserId, userId]);

  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch menu permissions
      const { data: permData, error: permError } = await (supabase as any)
        .from('editor_menu_permissions')
        .select('menu_id')
        .eq('user_id', authUserId);

      if (permError) throw permError;
      setPermissions(permData.map((p: any) => p.menu_id));

      // 2. Fetch manager plafond from profile
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('manager_plafond')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setManagerPlafond(profileData.manager_plafond?.toString() || "0");

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados do gestor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (menuId: string) => {
    setPermissions(prev => 
      prev.includes(menuId) 
        ? prev.filter(p => p !== menuId) 
        : [...prev, menuId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update Profile (Plafond)
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ manager_plafond: parseFloat(managerPlafond) || 0 })
        .eq('id', userId);
      
      if (profileError) {
        console.error("Profile update error:", profileError);
        toast.error(`Erro ao atualizar plafond: ${profileError.message}`);
        return;
      }

      // 2. Delete existing menu permissions
      const { error: deleteError } = await (supabase as any)
        .from('editor_menu_permissions')
        .delete()
        .eq('user_id', authUserId);

      if (deleteError) {
        console.error("Delete permissions error:", deleteError);
        toast.error(`Erro ao limpar permissões: ${deleteError.message}`);
        return;
      }

      // 3. Insert selected menu permissions
      if (permissions.length > 0) {
        const toInsert = permissions.map(p => ({
          user_id: authUserId,
          menu_id: p
        }));
        const { error: insertError } = await (supabase as any)
          .from('editor_menu_permissions')
          .insert(toInsert);
        if (insertError) {
          console.error("Insert permissions error:", insertError);
          toast.error(`Erro ao guardar permissões: ${insertError.message}`);
          return;
        }
      }

      toast.success("Dados do gestor atualizados com sucesso!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao salvar dados: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
             <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl font-bold">Gerir Acessos</DialogTitle>
          <DialogDescription className="text-slate-400 font-medium tracking-tight">
            Defina quais as secções que <span className="text-primary font-bold">{userName}</span> pode visualizar no painel.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-4 space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <label className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block">Plafond de Crédito (KZ)</label>
              <input 
                type="number" 
                value={managerPlafond}
                onChange={(e) => setManagerPlafond(e.target.value)}
                placeholder="Ex: 500000"
                className="w-full bg-white border border-slate-200 rounded-xl h-12 px-4 font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Limite máximo que este gestor pode validar de uma só vez.</p>
            </div>
            
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">Secções do Painel</label>
            <div className="space-y-3">
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            MENU_OPTIONS.map((menu) => (
              <div 
                key={menu.id} 
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => handleToggle(menu.id)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">{menu.label}</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{menu.path}</span>
                </div>
                <Checkbox 
                  checked={permissions.includes(menu.id)} 
                  onCheckedChange={() => handleToggle(menu.id)}
                  className="rounded-lg h-6 w-6"
                />
              </div>
            ))
          )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold text-slate-500">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex-1 gradient-primary rounded-xl font-bold shadow-lg"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : "Guardar Acessos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
