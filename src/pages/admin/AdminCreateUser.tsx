import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { UserPlus, ArrowLeft, Loader2, Mail, Lock, ShieldCheck, UserCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";

export default function AdminCreateUser() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        password: "",
        role: "user" as "admin" | "manager" | "user",
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            console.log("Iniciando criação de usuário:", formData);

            // 1. Instanciar um cliente Supabase secundário
            // Isto garante que o admin não seja desconectado ao criar o novo usuário
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error("Credenciais do Supabase (URL ou Key) em falta no projeto.");
            }

            const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // Gera a referência automática aqui para sincronizar com o auth
            const generatedRef = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

            // 2. Criar o utilizador no auth.users
            const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        nome: formData.nome,
                        full_name: formData.nome,
                        referral_code: generatedRef
                    }
                }
            });

            if (authError) {
                console.error("Erro na criação auth:", authError);
                throw new Error(authError.message || "Erro ao criar utilizador no sistema.");
            }

            const newUserId = authData.user?.id;

            if (newUserId) {
                // 3. Atualizar/Inserir o perfil e atribuir as roles
                // Gera a referência automática
                const profileData = {
                    nome: formData.nome,
                    full_name: formData.nome,
                    email: formData.email,
                    role: formData.role,
                    must_change_password: true,
                    status: 'ATIVO',
                    referral_code: generatedRef
                };

                // Verifica se a trigger handle_new_user já criou o perfil
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id, referral_code')
                    .eq('user_id', newUserId)
                    .maybeSingle();

                if (existingProfile) {
                    // Atualiza o perfil existente, adicionando referral_code apenas se nulo
                    await supabase
                        .from('profiles')
                        .update({
                            ...profileData
                        })
                        .eq('user_id', newUserId);
                } else {
                    // Insere um perfil novo explicitamente (caso a trigger falhe)
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            user_id: newUserId,
                            ...profileData
                        });

                    if (insertError) {
                        console.error("Erro no insert perfil:", insertError);
                    }
                }

                // 4. Inserir mapeamento explícito na tabela user_roles
                // Este passo é importante para as RLS de gestão
                if (formData.role !== 'user') {
                    await supabase
                        .from('user_roles')
                        .insert({
                            user_id: newUserId,
                            role: formData.role
                        });
                }
            }

            console.log("Usuário criado com sucesso!");

            toast.success(`Usuário (${formData.role}) criado com sucesso!`);

            // Give a tiny delay for the toast to be seen if needed, though navigate should be fine
            const targetPath = formData.role === 'manager' ? "/admin/gestores" : "/admin/usuarios";

            setTimeout(() => {
                navigate(targetPath);
            }, 100);

        } catch (error: any) {
            console.error("Erro geral no handleCreate:", error);
            toast.error(error.message || "Erro ao criar usuário");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/admin/usuarios")}
                    className="mb-6 hover:bg-slate-100 rounded-xl gap-2 text-slate-500"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para lista
                </Button>

                <div className="bg-white rounded-[2rem] shadow-card border border-slate-100 overflow-hidden">
                    <div className="gradient-primary p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 text-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                                <UserPlus className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold font-display">Cadastrar Novo Usuário</h1>
                            <p className="text-white/70 text-sm mt-1">Registo simplificado. Dados adicionais serão solicitados no primeiro acesso.</p>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    </div>

                    <form onSubmit={handleCreate} className="p-10 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 px-1">
                                    <User className="w-3 h-3" /> Nome Completo
                                </Label>
                                <Input
                                    required
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    className="h-14 border-slate-100 rounded-2xl bg-slate-50 focus:ring-primary/20"
                                    placeholder="Nome do utilizador"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 px-1">
                                    <Mail className="w-3 h-3" /> Email Institucional
                                </Label>
                                <Input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-14 border-slate-100 rounded-2xl bg-slate-50 focus:ring-primary/20"
                                    placeholder="usuario@bytekwanza.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 px-1">
                                    <Lock className="w-3 h-3" /> Senha Temporária
                                </Label>
                                <Input
                                    required
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="h-14 border-slate-100 rounded-2xl bg-slate-50 focus:ring-primary/20"
                                    placeholder="••••••••••••"
                                />
                                <p className="text-[10px] text-slate-400 px-1 font-medium">O usuário será forçado a trocar esta senha ao entrar.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 px-1">
                                    <UserCircle className="w-3 h-3" /> Tipo de Conta
                                </Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                                >
                                    <SelectTrigger className="h-14 border-slate-100 rounded-2xl bg-slate-50 focus:ring-primary/20 font-medium">
                                        <SelectValue placeholder="Selecione o nível de acesso" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        <SelectItem value="user" className="py-3 focus:bg-primary/5 cursor-pointer">Cliente (App Móvel)</SelectItem>
                                        <SelectItem value="manager" className="py-3 focus:bg-primary/5 cursor-pointer">Gestor (Acesso Restrito)</SelectItem>
                                        <SelectItem value="admin" className="py-3 focus:bg-primary/5 cursor-pointer">Administrador (Acesso Total)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formData.role === 'user' && (
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    <strong>Referência Automática:</strong> Este cliente será vinculado à sua conta como referência para acompanhamento de pedidos.
                                </p>
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 gradient-primary rounded-2xl font-bold shadow-primary text-white text-lg gap-2"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
                                Criar Usuário
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}
