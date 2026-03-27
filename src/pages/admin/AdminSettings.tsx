import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard,
    AlertTriangle,
    Users,
    ShieldCheck,
    Building2,
    Wallet,
    Bell,
    Activity,
    TrendingUp,
    Share2,
    Shield,
    FileText,
    Settings,
    Calculator,
    Palette,
    Save,
    Loader2,
    Eye,
    CheckCircle,
    XCircle,
    Plus,
    Trash2,
    QrCode,
    Copy,
    Award,
    Cpu
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MFASetup from "@/components/admin/MFASetup";
import { toast } from "sonner";

const categories = [
    { id: "regras", label: "Regras de Negócio", icon: Cpu },
    { id: "credito", label: "Crédito", icon: CreditCard },
    { id: "multas", label: "Multas/Atrasos", icon: AlertTriangle },
    { id: "utilizadores", label: "Utilizadores", icon: Users },
    { id: "kyc", label: "KYC Verificação", icon: ShieldCheck },
    { id: "bancos", label: "Bancos", icon: Building2 },
    { id: "pagamentos", label: "Pagamentos", icon: Wallet },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "score", label: "Score Risco", icon: Activity },
    { id: "referencias", label: "Referências", icon: Share2 },
    { id: "seguranca", label: "Segurança", icon: Shield },
    { id: "contratos", label: "Contratos", icon: FileText },
    { id: "sistema", label: "Sistema", icon: Settings },
    { id: "simulador", label: "+ Simulador", icon: Calculator },
    { id: "marca", label: "Marca/Design", icon: Palette },
];

export default function AdminSettings() {
    const [activeCategory, setActiveCategory] = useState("multas");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Settings State
    const [settings, setSettings] = useState<any>({
        multas: {
            taxaFixa: "5%",
            jurosDiario: "1%",
            diasTolerancia: "3",
            bloquearNovoCredito: true
        },
        utilizadores: {
            aprovacaoAutomatica: false,
            apenasReferencia: true,
            minContactos: "2",
            docsObrigatorios: ["bi_frente", "bi_verso", "selfie", "recibo_salario"],
            solicitarGPS: true,
            solicitarContactos: true,
            solicitarSMS: true
        },
        credito: {
            percentagemSalario: "40%",
            limiteMin: "10.000",
            limiteMax: "500.000",
            prazos: ["30", "60"]
        },
        kyc: {
            nivelObrigatorio: "Nível 2",
            scoreMinimo: "650",
            aprovacaoManual: true,
            permitirEdicao: false
        },
        marca: {
            suporte: "910 000 100",
            email: "suporte@bytekwanza.com"
        },
        bancos: {
            aceites: [
                { name: "BAI", active: true },
                { name: "BFA", active: true },
                { name: "BIC", active: true },
                { name: "BPC", active: true },
                { name: "Standard Bank", active: true },
                { name: "Banco Atlântico", active: true }
            ]
        },
        pagamentos: {
            metodos: [
                { name: "Multicaixa Express", active: true },
                { name: "Transferência Bancária", active: true },
                { name: "Unitel Money", active: true },
                { name: "Afrimoney", active: false }
            ]
        },
        score: {
            pontosTrabalhoAnual: 50,
            pontosSalarioMinimo: 100,
            pontosPagamentoAntecipado: 100,
            penalizacaoAtraso: -150,
            limiteAceitavel: 400
        },
        seguranca: {
            ativar2FA: true,
            limiteTentativas: 5,
            expiracaoSessao: 30,
            manterLogs: true
        },
        notificacoes: {
            credito_aprovado: {
                sms: true,
                email: true,
                push: true,
                template: "Seu crédito de {valor} Kz foi aprovado. Prazo: {data}."
            },
            credito_rejeitado: {
                sms: true,
                email: true,
                push: true,
                template: "Infelizmente o seu pedido de crédito foi recusado."
            },
            lembrete_pagamento: {
                sms: true,
                email: true,
                push: true,
                template: "Faltam 3 dias para o vencimento do seu crédito."
            },
            pagamento_recebido: {
                sms: true,
                email: true,
                push: true,
                template: "Confirmamos a recepção do seu pagamento de {valor} Kz."
            }
        },
        contratos: {
            termos_uso: "📄 TERMOS E CONDIÇÕES DE UTILIZAÇÃO\n1. 📌 Objeto\n\nOs presentes Termos e Condições regulam o acesso e utilização da plataforma digital...",
            politica_privacidade: "🔒 POLÍTICA DE PRIVACIDADE\n1. 📌 Introdução\n\nA presente Política de Privacidade regula o tratamento de dados pessoais...",
            contrato_credito: "📄 CONTRATO DE ADESÃO AO CRÉDITO\n1. 📌 Objeto\n\nO presente contrato regula as condições de concessão de microcrédito..."
        },
        referencias: {
            entidade: "99999",
            bonusReferencia: "500",
            referencialAdmin: "REF-0001",
            limiteMensal: "50.000"
        },
        regras: {
            regrasDinamicas: [
                {
                    id: "1",
                    condicao: "salário < 100.000",
                    acao: "crédito máximo = 30.000"
                },
                {
                    id: "2",
                    condicao: "cliente atrasou 2 vezes",
                    acao: "bloquear crédito"
                }
            ]
        }
    });

    const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [selectedKyc, setSelectedKyc] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [newBankName, setNewBankName] = useState("");
    const [newPaymentMethodName, setNewPaymentMethodName] = useState("");
    const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [newRuleCondicao, setNewRuleCondicao] = useState("");
    const [newRuleAcao, setNewRuleAcao] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeCategory === 'kyc') {
            fetchKycSubmissions();

            const channel = supabase
              .channel('admin-kyc-changes')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions' }, () => fetchKycSubmissions())
              .subscribe();

            return () => {
              supabase.removeChannel(channel);
            };
        }
    }, [activeCategory]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('system_settings')
                .select('*');

            if (error) throw error;

            if (data) {
                const newSettings = { ...settings };
                data.forEach((item: any) => {
                    if (item.key === 'bancos' && item.value?.aceites) {
                        item.value.aceites = item.value.aceites.map((b: any) =>
                            typeof b === 'string' ? { name: b, active: true } : b
                        );
                    }
                    newSettings[item.key] = item.value;
                });
                setSettings(newSettings);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao carregar configurações");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchKycSubmissions = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('kyc_submissions')
                .select('*, profiles(nome, email, full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setKycSubmissions(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar submissões KYC");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log(`Saving ${activeCategory} settings:`, settings[activeCategory]);
            const { error } = await (supabase as any)
                .from('system_settings')
                .upsert({
                    key: activeCategory,
                    value: settings[activeCategory],
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && settings.seguranca?.manterLogs) {
                await supabase.from('admin_audit_logs').insert({
                    admin_id: session.user.id,
                    action: 'UPDATE_SETTINGS',
                    entity: 'system_settings',
                    entity_id: activeCategory,
                    details: settings[activeCategory]
                });
            }

            toast.success("Alterações guardadas com sucesso!");
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Erro ao guardar alterações");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKycAction = async (id: string, userId: string, status: 'verified' | 'rejected', reason?: string) => {
        setIsActionLoading(id);
        try {
            const { error: subError } = await (supabase as any)
                .from('kyc_submissions')
                .update({
                    status,
                    rejection_reason: reason || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (subError) throw subError;

            const { error: profError } = await (supabase as any)
                .from('profiles')
                .update({ kyc_status: status })
                .eq('user_id', userId);

            if (profError) throw profError;

            // Enviar notificação em caso de rejeição
            if (status === 'rejected' && reason) {
                const { error: notifError } = await (supabase as any)
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        title: "Verificação KYC Rejeitada",
                        message: `A sua verificação de documentos foi rejeitada pelo seguinte motivo: ${reason}. Por favor, verifique os seus dados e tente novamente.`,
                        is_read: false
                    });

                if (notifError) console.error("Erro ao enviar notificação:", notifError);
            }

            toast.success(`KYC ${status === 'verified' ? 'aprovado' : 'rejeitado'} com sucesso!`);
            setIsReviewModalOpen(false);
            setRejectionReason("");
            fetchKycSubmissions();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar acção KYC");
        } finally {
            setIsActionLoading(null);
        }
    };

    const updateField = (category: string, field: string, value: any) => {
        setSettings({
            ...settings,
            [category]: {
                ...settings[category],
                [field]: value
            }
        });
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto pb-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 font-display">Definições da Plataforma</h1>
                </div>

                <div className="bg-white rounded-[2rem] shadow-card border border-slate-100 flex min-h-[600px] overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-slate-50 bg-slate-50/30 p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-3">Categorias</p>
                        <nav className="space-y-1">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const active = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${active
                                            ? "bg-white text-orange-500 shadow-sm border border-orange-50 font-bold"
                                            : "text-slate-500 hover:bg-white/50 hover:text-slate-700 font-medium"
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${active ? "text-orange-500" : "text-slate-400"}`} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-10 relative flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1"
                            >
                                {activeCategory === "multas" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-orange-500">
                                            <AlertTriangle className="w-5 h-5 fill-orange-500/10" />
                                            <h2 className="font-bold text-slate-800">Definições de Multas e Atrasos</h2>
                                        </div>

                                        <div className="space-y-6 max-w-md">
                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Multa por atraso (Taxa Fixa)</Label>
                                                <Input
                                                    value={settings.multas?.taxaFixa}
                                                    onChange={(e) => updateField("multas", "taxaFixa", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Juros diário por atraso</Label>
                                                <Input
                                                    value={settings.multas?.jurosDiario}
                                                    onChange={(e) => updateField("multas", "jurosDiario", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Dias de tolerância</Label>
                                                <Input
                                                    value={settings.multas?.diasTolerancia}
                                                    onChange={(e) => updateField("multas", "diasTolerancia", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                />
                                            </div>

                                            <div className="flex items-center space-x-3 pt-2">
                                                <Checkbox
                                                    id="block-credit"
                                                    checked={settings.multas?.bloquearNovoCredito}
                                                    onCheckedChange={(checked) => updateField("multas", "bloquearNovoCredito", checked)}
                                                />
                                                <label htmlFor="block-credit" className="text-xs font-bold text-slate-700 cursor-pointer">
                                                    Bloquear novo crédito se houver atraso ativo
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "credito" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary">
                                            <CreditCard className="w-5 h-5 text-orange-500" />
                                            <h2 className="font-bold text-slate-800">Definições de Crédito</h2>
                                        </div>

                                        <div className="space-y-6 max-w-xl">
                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Percentagem máxima sobre salário</Label>
                                                <Input
                                                    value={settings.credito?.percentagemSalario}
                                                    onChange={(e) => updateField("credito", "percentagemSalario", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    placeholder="Ex: 40%"
                                                />
                                                <p className="text-[10px] text-slate-400 font-medium">Capacidade de endividamento do cliente.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Valor mínimo de crédito</Label>
                                                <Input
                                                    value={settings.credito?.limiteMin}
                                                    onChange={(e) => updateField("credito", "limiteMin", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    placeholder="Ex: 10.000 Kz"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Valor máximo de crédito</Label>
                                                <Input
                                                    value={settings.credito?.limiteMax}
                                                    onChange={(e) => updateField("credito", "limiteMax", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    placeholder="Ex: 500.000 Kz"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-slate-900 font-bold text-sm">Prazos Disponíveis</Label>
                                                <div className="flex items-center gap-6 pt-1">
                                                    {[30, 60, 90].map((days) => (
                                                        <div key={days} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`prazo-${days}`}
                                                                checked={settings.credito?.prazos?.includes(days.toString())}
                                                                onCheckedChange={(checked) => {
                                                                    const current = settings.credito?.prazos || [];
                                                                    if (checked) {
                                                                        updateField("credito", "prazos", [...current, days.toString()]);
                                                                    } else {
                                                                        updateField("credito", "prazos", current.filter((d: string) => d !== days.toString()));
                                                                    }
                                                                }}
                                                            />
                                                            <label htmlFor={`prazo-${days}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                                                                {days} dias
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "kyc" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary">
                                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                                            <h2 className="font-bold text-slate-800">Definições de KYC (Verificação)</h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Nível de verificação obrigatório</Label>
                                                <Select
                                                    value={settings.kyc?.nivelObrigatorio}
                                                    onValueChange={(v) => updateField("kyc", "nivelObrigatorio", v)}
                                                >
                                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl">
                                                        <SelectValue placeholder="Selecione o nível" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="Nível 1">Nível 1 (Básico)</SelectItem>
                                                        <SelectItem value="Nível 2">Nível 2 (Intermediário)</SelectItem>
                                                        <SelectItem value="Nível 3">Nível 3 (Avançado)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-900 font-bold text-sm">Score mínimo para aprovação</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.kyc?.scoreMinimo}
                                                    onChange={(e) => updateField("kyc", "scoreMinimo", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    placeholder="Ex: 650"
                                                />
                                            </div>

                                            <div className="col-span-2 space-y-4 pt-2">
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="manual-kyc"
                                                        checked={settings.kyc?.aprovacaoManual}
                                                        onCheckedChange={(checked) => updateField("kyc", "aprovacaoManual", checked)}
                                                    />
                                                    <label htmlFor="manual-kyc" className="text-sm font-medium text-slate-700 cursor-pointer">
                                                        Aprovação manual obrigatória por admin
                                                    </label>
                                                </div>

                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id="edit-kyc"
                                                        checked={settings.kyc?.permitirEdicao}
                                                        onCheckedChange={(checked) => updateField("kyc", "permitirEdicao", checked)}
                                                    />
                                                    <label htmlFor="edit-kyc" className="text-sm font-medium text-slate-700 cursor-pointer">
                                                        Permitir edição de dados após verificação
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-primary mb-6">
                                                <Activity className="w-5 h-5" />
                                                <h2 className="font-bold text-slate-800">Gestão de Verificações Pendentes</h2>
                                            </div>

                                            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                                                        <tr>
                                                            <th className="px-6 py-4">Utilizador</th>
                                                            <th className="px-6 py-4">BI / Status</th>
                                                            <th className="px-6 py-4">Documentos</th>
                                                            <th className="px-6 py-4 text-right">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {kycSubmissions.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                                                                    Nenhuma submissão pendente encontrada.
                                                                </td>
                                                            </tr>
                                                        ) : kycSubmissions.map((sub) => (
                                                            <tr key={sub.id} className="hover:bg-white/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-slate-900">{(sub.profiles as any)?.nome}</div>
                                                                    <div className="text-[10px] text-slate-400">{(sub.profiles as any)?.email}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-mono text-xs">{sub.bi_number}</div>
                                                                    <div className={`text-[10px] font-bold mt-1 uppercase ${sub.status === 'pending' ? 'text-orange-500' :
                                                                        sub.status === 'verified' ? 'text-green-500' : 'text-red-500'
                                                                        }`}>
                                                                        {sub.status}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex gap-2">
                                                                        <a href={sub.bi_front_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
                                                                            <FileText className="w-4 h-4" />
                                                                        </a>
                                                                        <a href={sub.bi_back_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
                                                                            <FileText className="w-4 h-4" />
                                                                        </a>
                                                                        <a href={sub.selfie_url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
                                                                            <Activity className="w-4 h-4" />
                                                                        </a>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg px-3"
                                                                        onClick={() => {
                                                                            setSelectedKyc(sub);
                                                                            setIsReviewModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Revisar Dados
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "bancos" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <Building2 className="w-6 h-6" />
                                            <h2 className="text-xl font-bold text-slate-900 font-display">Bancos Aceites</h2>
                                        </div>

                                        <div className="space-y-4 max-w-2xl">
                                            {(settings.bancos?.aceites || []).map((bank: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-center justify-between p-4 bg-white border rounded-2xl group transition-all shadow-sm shadow-slate-100/50 ${bank.active ? 'border-border' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${bank.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                        <span className={`font-bold tracking-wide ${bank.active ? 'text-slate-800' : 'text-slate-500'}`}>
                                                            {bank.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                {bank.active ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                            <Switch
                                                                checked={bank.active}
                                                                onCheckedChange={(checked) => {
                                                                    const newList = [...settings.bancos.aceites];
                                                                    newList[index] = { ...newList[index], active: checked };
                                                                    updateField("bancos", "aceites", newList);
                                                                }}
                                                            />
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 w-9 p-0 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                            onClick={() => {
                                                                const newList = settings.bancos.aceites.filter((_: any, i: number) => i !== index);
                                                                updateField("bancos", "aceites", newList);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-6 flex gap-3">
                                                <Input
                                                    placeholder="Nome do novo banco..."
                                                    value={newBankName}
                                                    onChange={(e) => setNewBankName(e.target.value)}
                                                    className="h-14 bg-white border-slate-200 rounded-2xl shadow-sm font-medium focus:ring-primary/20"
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (!newBankName.trim()) {
                                                            toast.error("Insira o nome do banco.");
                                                            return;
                                                        }
                                                        const currentList = settings.bancos?.aceites || [];
                                                        updateField("bancos", "aceites", [...currentList, { name: newBankName.trim(), active: true }]);
                                                        setNewBankName("");
                                                        toast.success("Banco adicionado à lista!");
                                                    }}
                                                    className="h-14 px-8 rounded-2xl bg-white border-2 border-primary text-primary hover:bg-primary/5 font-bold transition-all gap-2"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Adicionar Banco
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "pagamentos" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <Wallet className="w-6 h-6" />
                                            <h2 className="text-xl font-bold text-slate-900 font-display">Métodos de Pagamento</h2>
                                        </div>

                                        <div className="space-y-4 max-w-2xl">
                                            {(settings.pagamentos?.metodos || []).map((method: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-center justify-between p-4 bg-white border rounded-2xl group transition-all shadow-sm shadow-slate-100/50 ${method.active ? 'border-border' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {method.active ? (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-400" />
                                                        )}
                                                        <span className={`font-bold tracking-wide ${method.active ? 'text-slate-800' : 'text-slate-500'}`}>
                                                            {method.name}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={`h-9 px-4 rounded-xl font-bold text-[10px] uppercase border-2 transition-all ${method.active
                                                                ? 'border-orange-200 text-orange-500 hover:bg-orange-500 hover:text-white hover:border-orange-500'
                                                                : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-transparent hover:from-orange-500 hover:to-orange-600 shadow-md shadow-orange-100'
                                                                }`}
                                                            onClick={() => {
                                                                const newList = [...settings.pagamentos.metodos];
                                                                newList[index] = { ...newList[index], active: !method.active };
                                                                updateField("pagamentos", "metodos", newList);
                                                            }}
                                                        >
                                                            {method.active ? 'Desativar' : 'Ativar'}
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 w-9 p-0 text-red-200 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                            onClick={() => {
                                                                const newList = settings.pagamentos.metodos.filter((_: any, i: number) => i !== index);
                                                                updateField("pagamentos", "metodos", newList);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-6 flex gap-3">
                                                <Input
                                                    placeholder="Nome do novo método..."
                                                    value={newPaymentMethodName}
                                                    onChange={(e) => setNewPaymentMethodName(e.target.value)}
                                                    className="h-14 bg-white border-slate-200 rounded-2xl shadow-sm font-medium focus:ring-primary/20"
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (!newPaymentMethodName.trim()) {
                                                            toast.error("Insira o nome do método.");
                                                            return;
                                                        }
                                                        const currentList = settings.pagamentos?.metodos || [];
                                                        updateField("pagamentos", "metodos", [...currentList, { name: newPaymentMethodName.trim(), active: true }]);
                                                        setNewPaymentMethodName("");
                                                        toast.success("Método adicionado!");
                                                    }}
                                                    className="h-14 px-8 rounded-2xl bg-white border-2 border-primary text-primary hover:bg-primary/5 font-bold transition-all gap-2"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Adicionar Método
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "notificacoes" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <Bell className="w-6 h-6" />
                                            <h2 className="text-xl font-bold text-slate-900 font-display">Notificações Automáticas</h2>
                                        </div>

                                        <div className="grid gap-6 max-w-3xl">
                                            {[
                                                { id: "credito_aprovado", label: "Crédito aprovado" },
                                                { id: "credito_rejeitado", label: "Crédito rejeitado" },
                                                { id: "lembrete_pagamento", label: "Lembrete de pagamento" },
                                                { id: "pagamento_recebido", label: "Pagamento recebido" }
                                            ].map((type) => (
                                                <div key={type.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-100/50 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-bold text-slate-800">{type.label}</h3>
                                                        <div className="flex gap-2">
                                                            {["sms", "email", "push"].map((channel) => (
                                                                <button
                                                                    key={channel}
                                                                    onClick={() => {
                                                                        const current = settings.notificacoes[type.id];
                                                                        updateField("notificacoes", type.id, {
                                                                            ...current,
                                                                            [channel]: !current[channel]
                                                                        });
                                                                    }}
                                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${settings.notificacoes?.[type.id]?.[channel]
                                                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                                        : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'
                                                                        }`}
                                                                >
                                                                    {channel}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <Textarea
                                                            value={settings.notificacoes?.[type.id]?.template}
                                                            onChange={(e) => {
                                                                const current = settings.notificacoes[type.id];
                                                                updateField("notificacoes", type.id, {
                                                                    ...current,
                                                                    template: e.target.value
                                                                });
                                                            }}
                                                            className="min-h-[100px] bg-slate-50/50 border-slate-100 rounded-2xl resize-none font-medium text-slate-700 leading-relaxed focus:ring-primary/10"
                                                            placeholder="Escreva a mensagem aqui..."
                                                        />
                                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                                            <span className="text-[10px] font-bold text-slate-300 bg-white/80 px-2 py-1 rounded-md border border-slate-50">
                                                                {settings.notificacoes?.[type.id]?.template?.length || 0} chars
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "score" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <TrendingUp className="w-6 h-6" />
                                            <h2 className="text-xl font-bold text-slate-900 font-display">Score de Crédito</h2>
                                        </div>

                                        <div className="grid gap-8 max-w-2xl">
                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Pontuação por tempo de trabalho (Anual)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={settings.score?.pontosTrabalhoAnual}
                                                        onChange={(e) => updateField("score", "pontosTrabalhoAnual", parseInt(e.target.value) || 0)}
                                                        className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 pr-16 font-bold text-slate-700 focus:ring-primary/10"
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">pts</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Pontuação por salário (&gt; 100k)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={settings.score?.pontosSalarioMinimo}
                                                        onChange={(e) => updateField("score", "pontosSalarioMinimo", parseInt(e.target.value) || 0)}
                                                        className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 pr-16 font-bold text-slate-700 focus:ring-primary/10"
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">pts</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Pontuação por pagamento antecipado</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={settings.score?.pontosPagamentoAntecipado}
                                                        onChange={(e) => updateField("score", "pontosPagamentoAntecipado", parseInt(e.target.value) || 0)}
                                                        className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 pr-16 font-bold text-slate-700 focus:ring-primary/10"
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">pts</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Penalização por atraso</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={settings.score?.penalizacaoAtraso}
                                                        onChange={(e) => updateField("score", "penalizacaoAtraso", parseInt(e.target.value) || 0)}
                                                        className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 pr-16 font-bold text-slate-700 focus:ring-primary/10"
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">pts</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Limite de risco aceitável (Score)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={settings.score?.limiteAceitavel}
                                                        onChange={(e) => updateField("score", "limiteAceitavel", parseInt(e.target.value) || 0)}
                                                        className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 font-bold text-slate-700 focus:ring-primary/10"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "seguranca" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <Shield className="w-6 h-6" />
                                            <h2 className="text-xl font-bold text-slate-900 font-display">Segurança do Sistema</h2>
                                        </div>

                                        <div className="grid gap-8 max-w-2xl">
                                            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                                        <ShieldCheck className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-slate-900 font-bold block">A minha Segurança 2FA</Label>
                                                        <p className="text-[10px] text-slate-500 font-medium">Configure a sua própria aplicação autenticadora.</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => setIsMFAModalOpen(true)}
                                                    className="h-10 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all gap-2"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                    Configurar MFA
                                                </Button>
                                            </div>

                                            <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <Checkbox
                                                    id="ativar2FA"
                                                    checked={settings.seguranca?.ativar2FA}
                                                    onCheckedChange={(checked) => updateField("seguranca", "ativar2FA", checked)}
                                                    className="w-5 h-5 rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <Label htmlFor="ativar2FA" className="text-slate-700 font-bold cursor-pointer">Ativar 2FA para administradores</Label>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Limite de tentativas de login</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.seguranca?.limiteTentativas}
                                                    onChange={(e) => updateField("seguranca", "limiteTentativas", parseInt(e.target.value) || 0)}
                                                    className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 font-bold text-slate-700 focus:ring-primary/10"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-slate-700 font-bold">Sessão automática expirada (minutos)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.seguranca?.expiracaoSessao}
                                                    onChange={(e) => updateField("seguranca", "expiracaoSessao", parseInt(e.target.value) || 0)}
                                                    className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl pl-6 font-bold text-slate-700 focus:ring-primary/10"
                                                />
                                            </div>

                                            <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                <Checkbox
                                                    id="manterLogs"
                                                    checked={settings.seguranca?.manterLogs}
                                                    onCheckedChange={(checked) => updateField("seguranca", "manterLogs", checked)}
                                                    className="w-5 h-5 rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <Label htmlFor="manterLogs" className="text-slate-700 font-bold cursor-pointer flex-1">Manter registo detalhado de atividades (logs)</Label>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 transition-colors ml-auto"
                                                    onClick={() => window.location.href = '/admin/logs'}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver Registos
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "marca" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Palette className="w-5 h-5" />
                                            <h2 className="font-bold text-slate-800">Identidade da Marca</h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-900 font-bold text-sm">Contacto de Suporte</Label>
                                                    <Input
                                                        value={settings.marca?.suporte}
                                                        onChange={(e) => updateField("marca", "suporte", e.target.value)}
                                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-900 font-bold text-sm">Email Oficial</Label>
                                                    <Input
                                                        value={settings.marca?.email}
                                                        onChange={(e) => updateField("marca", "email", e.target.value)}
                                                        className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                    <Palette className="w-4 h-4 text-primary" /> Visual Corporate
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-xs font-bold text-slate-600">Primária</span>
                                                        <div className="w-24 h-8 rounded-lg bg-primary border border-white" />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-xs font-bold text-slate-600">Destaque</span>
                                                        <div className="w-24 h-8 rounded-lg bg-orange-500 border border-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "utilizadores" && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Users className="w-5 h-5 text-indigo-500" />
                                            <h2 className="font-bold text-slate-800">Definições de Utilizador</h2>
                                        </div>

                                        <div className="space-y-6 max-w-xl">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="auto-approve"
                                                    checked={settings.utilizadores?.aprovacaoAutomatica}
                                                    onCheckedChange={(checked) => updateField("utilizadores", "aprovacaoAutomatica", checked)}
                                                />
                                                <label htmlFor="auto-approve" className="text-sm font-medium text-slate-700 cursor-pointer">
                                                    Aprovação automática de cadastro
                                                </label>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="only-ref"
                                                    checked={settings.utilizadores?.apenasReferencia}
                                                    onCheckedChange={(checked) => updateField("utilizadores", "apenasReferencia", checked)}
                                                />
                                                <label htmlFor="only-ref" className="text-sm font-medium text-slate-700 cursor-pointer">
                                                    Cadastro permitido apenas por referência
                                                </label>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                                <Label className="text-slate-900 font-bold text-sm">Permissões de Segurança (KYC)</Label>
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            id="req-gps"
                                                            checked={settings.utilizadores?.solicitarGPS}
                                                            onCheckedChange={(checked) => updateField("utilizadores", "solicitarGPS", checked)}
                                                        />
                                                        <Label htmlFor="req-gps" className="text-xs font-medium text-slate-600 cursor-pointer">Solicitar Localização GPS</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            id="req-contacts"
                                                            checked={settings.utilizadores?.solicitarContactos}
                                                            onCheckedChange={(checked) => updateField("utilizadores", "solicitarContactos", checked)}
                                                        />
                                                        <Label htmlFor="req-contacts" className="text-xs font-medium text-slate-600 cursor-pointer">Solicitar Acesso aos Contactos</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            id="req-sms"
                                                            checked={settings.utilizadores?.solicitarSMS}
                                                            onCheckedChange={(checked) => updateField("utilizadores", "solicitarSMS", checked)}
                                                        />
                                                        <Label htmlFor="req-sms" className="text-xs font-medium text-slate-600 cursor-pointer">Verificação de SMS / Dispositivo</Label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                <Label className="text-slate-900 font-bold text-sm">Número mínimo de contactos familiares</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.utilizadores?.minContactos}
                                                    onChange={(e) => updateField("utilizadores", "minContactos", e.target.value)}
                                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl max-w-[200px]"
                                                    placeholder="Ex: 2"
                                                />
                                            </div>

                                            <div className="space-y-4 pt-4">
                                                <Label className="text-slate-900 font-bold text-sm">Documentos Obrigatórios</Label>
                                                <div className="space-y-3">
                                                    {[
                                                        { id: "bi_frente", label: "BI frente" },
                                                        { id: "bi_verso", label: "BI verso" },
                                                        { id: "selfie", label: "Selfie com documento" },
                                                        { id: "recibo_salario", label: "Último recibo salarial" }
                                                    ].map((doc) => (
                                                        <div key={doc.id} className="flex items-center space-x-3">
                                                            <Checkbox
                                                                id={`doc-${doc.id}`}
                                                                checked={settings.utilizadores?.docsObrigatorios?.includes(doc.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = settings.utilizadores?.docsObrigatorios || [];
                                                                    if (checked) {
                                                                        updateField("utilizadores", "docsObrigatorios", [...current, doc.id]);
                                                                    } else {
                                                                        updateField("utilizadores", "docsObrigatorios", current.filter((d: string) => d !== doc.id));
                                                                    }
                                                                }}
                                                            />
                                                            <label htmlFor={`doc-${doc.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">
                                                                {doc.label}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeCategory === "referencias" && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Share2 className="w-5 h-5 text-indigo-500" />
                                            <h2 className="font-bold text-slate-800 text-xl font-display">Gestão de Referências e Indicações</h2>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* Entity Settings */}
                                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">Configuração de Entidade</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium">Dados para pagamentos Multicaixa</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-700 font-bold text-xs uppercase">Entidade Fixa (Sistema)</Label>
                                                        <Input
                                                            value={settings.referencias?.entidade}
                                                            onChange={(e) => updateField("referencias", "entidade", e.target.value)}
                                                            className="h-12 bg-white border-slate-200 rounded-xl font-mono text-lg font-bold text-center"
                                                            placeholder="Ex: 99999"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-700 font-bold text-xs uppercase">Limite Mensal por Referência (Kz)</Label>
                                                        <Input
                                                            type="number"
                                                            value={settings.referencias?.limiteMensal}
                                                            onChange={(e) => updateField("referencias", "limiteMensal", e.target.value)}
                                                            className="h-12 bg-white border-slate-200 rounded-xl font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Admin Referral */}
                                            <div className="bg-indigo-600 p-8 rounded-[2rem] text-white space-y-6 relative overflow-hidden shadow-xl shadow-indigo-100">
                                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                                        <Shield className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-sm">Referência do Admin</h3>
                                                        <p className="text-[10px] text-indigo-100 font-medium opacity-80">Código mestre para convites</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-center">
                                                        <p className="text-[10px] uppercase font-bold text-indigo-100 mb-2 tracking-widest">Código Oficial</p>
                                                        <p className="text-4xl font-display font-black tracking-widest">{settings.referencias?.referencialAdmin || "GERAR..."}</p>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="flex-1 h-12 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl"
                                                            onClick={async () => {
                                                                const newCode = `REF-${Math.floor(1000 + Math.random() * 9000)}`;
                                                                updateField("referencias", "referencialAdmin", newCode);

                                                                // Also update in profiles if possible
                                                                const { data: { user } } = await supabase.auth.getUser();
                                                                if (user) {
                                                                    await (supabase as any).from('profiles').update({ referral_code: newCode }).eq('user_id', user.id);
                                                                }
                                                                toast.success(`Referência ${newCode} gerada e guardada!`);
                                                            }}
                                                        >
                                                            Gerar Nova
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            className="w-12 h-12 p-0 border-white/20 text-white hover:bg-white/10 rounded-xl"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(settings.referencias?.referencialAdmin);
                                                                toast.success("Copiado!");
                                                            }}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Global Bonus */}
                                            <div className="col-span-1 md:col-span-2 bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <Award className="w-6 h-6 text-orange-500" />
                                                        <h3 className="font-bold text-slate-800">Sistema de Recompensas</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400">Ativado</span>
                                                        <Switch checked={true} />
                                                    </div>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <Label className="text-slate-600 font-bold text-xs uppercase">Bónus por Indicação Direta (Kz)</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                value={settings.referencias?.bonusReferencia}
                                                                onChange={(e) => updateField("referencias", "bonusReferencia", e.target.value)}
                                                                className="h-14 bg-slate-50 border-none rounded-2xl pl-6 font-bold text-lg"
                                                            />
                                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-300">Kz</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                                                        <p className="text-xs text-orange-800 leading-relaxed italic">
                                                            "Este valor será creditado no saldo do utilizador que convidar um novo cliente, assim que o novo cliente realizar o seu primeiro depósito ou contrato."
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeCategory === "contratos" && (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <div className="flex items-center gap-2 text-primary">
                                            <FileText className="w-5 h-5 text-orange-500" />
                                            <h2 className="font-bold text-slate-800">Contratos e Termos</h2>
                                        </div>

                                        <div className="space-y-8 max-w-2xl">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-slate-900 font-bold text-sm">Termos de Uso (Registo)</Label>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Exibido no cadastro</span>
                                                </div>
                                                <Textarea
                                                    className="min-h-[200px] bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary/20 resize-none p-6 text-slate-600 leading-relaxed font-mono text-xs"
                                                    value={settings.contratos?.termos_uso}
                                                    onChange={(e) => updateField("contratos", "termos_uso", e.target.value)}
                                                    placeholder="Insira os termos e condições de uso..."
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-slate-900 font-bold text-sm">Política de Privacidade</Label>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Conformidade Legal</span>
                                                </div>
                                                <Textarea
                                                    className="min-h-[200px] bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary/20 resize-none p-6 text-slate-600 leading-relaxed font-mono text-xs"
                                                    value={settings.contratos?.politica_privacidade}
                                                    onChange={(e) => updateField("contratos", "politica_privacidade", e.target.value)}
                                                    placeholder="Descreva a política de privacidade..."
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-slate-900 font-bold text-sm">Contrato de Crédito</Label>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Exibido na solicitação</span>
                                                </div>
                                                <Textarea
                                                    className="min-h-[200px] bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary/20 resize-none p-6 text-slate-600 leading-relaxed font-mono text-xs"
                                                    value={settings.contratos?.contrato_credito}
                                                    onChange={(e) => updateField("contratos", "contrato_credito", e.target.value)}
                                                    placeholder="Insira os termos do contrato de crédito..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeCategory === "regras" && (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-4">
                                            <Cpu className="w-6 h-6" />
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900 font-display">Configuração de Regras Dinâmicas</h2>
                                                <p className="text-xs text-slate-500 font-medium tracking-wide">Crie lógica condicional sem código.</p>
                                            </div>
                                            <div className="ml-auto">
                                                <Button
                                                    onClick={() => setIsRuleModalOpen(true)}
                                                    className="h-10 px-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold shadow-md shadow-orange-200 transition-all gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Nova Regra
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-w-4xl">
                                            {(settings.regras?.regrasDinamicas || []).map((rule: any, index: number) => (
                                                <div
                                                    key={rule.id || index}
                                                    className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl group transition-all shadow-sm hover:shadow-md hover:border-slate-200"
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                                            <Cpu className="w-5 h-5 text-blue-500" />
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 font-medium text-sm">
                                                            <span className="font-black text-slate-900">SE</span>
                                                            <span className="text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{rule.condicao}</span>
                                                            <span className="text-slate-300 px-1 font-light">→</span>
                                                            <span className="font-black text-green-600">ENTÃO</span>
                                                            <span className="text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100">{rule.acao}</span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                                                        onClick={() => {
                                                            const newRules = settings.regras.regrasDinamicas.filter((_: any, i: number) => i !== index);
                                                            updateField("regras", "regrasDinamicas", newRules);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {(settings.regras?.regrasDinamicas?.length === 0) && (
                                                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                                    <Cpu className="w-12 h-12 text-slate-200 mb-4" />
                                                    <p className="font-bold text-slate-500 text-sm">Nenhuma regra dinâmica configurada.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Crie a sua primeira regra para automatizar processos.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!["multas", "credito", "marca", "kyc", "utilizadores", "contratos", "seguranca", "regras", "bancos", "pagamentos", "notificacoes", "referencias"].includes(activeCategory) && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                        <Settings className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="font-bold uppercase tracking-widest text-xs">Módulo em Desenvolvimento</p>
                                        <p className="text-[10px] mt-2 italic">A carregar configurações do servidor...</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Save Button */}
                        <div className="pt-10 mt-auto border-t border-slate-50 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="h-14 px-10 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold shadow-lg shadow-orange-200 transition-all gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar Alterações
                            </Button>
                        </div>
                    </div>
                </div>
                <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                    <DialogContent className="max-w-2xl bg-white rounded-3xl p-8">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                                Revisão de Verificação KYC
                            </DialogTitle>
                        </DialogHeader>

                        {selectedKyc && (
                            <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Nome do Utilizador</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedKyc.profiles?.nome || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Email</p>
                                        <p className="text-sm font-medium text-slate-600">{selectedKyc.profiles?.email || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Número do BI</p>
                                        <p className="text-sm font-mono text-slate-800">{selectedKyc.bi_number}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Data de Submissão</p>
                                        <p className="text-sm text-slate-600">{new Date(selectedKyc.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-700">Documentos Obrigatórios</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <a href={selectedKyc.bi_front_url} target="_blank" rel="noreferrer" className="group relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Eye className="text-white w-6 h-6" />
                                            </div>
                                            <img src={selectedKyc.bi_front_url} alt="BI Frente" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/20 backdrop-blur-sm text-[8px] text-white font-bold uppercase">BI Frente</div>
                                        </a>
                                        <a href={selectedKyc.bi_back_url} target="_blank" rel="noreferrer" className="group relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Eye className="text-white w-6 h-6" />
                                            </div>
                                            <img src={selectedKyc.bi_back_url} alt="BI Verso" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/20 backdrop-blur-sm text-[8px] text-white font-bold uppercase">BI Verso</div>
                                        </a>
                                        <a href={selectedKyc.selfie_url} target="_blank" rel="noreferrer" className="group relative aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Eye className="text-white w-6 h-6" />
                                            </div>
                                            <img src={selectedKyc.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/20 backdrop-blur-sm text-[8px] text-white font-bold uppercase">Selfie</div>
                                        </a>
                                    </div>
                                </div>

                                {selectedKyc.status === 'pending' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <Label className="text-red-600 font-bold text-xs uppercase">Justificativa para Rejeição (Obrigatório)</Label>
                                            <Textarea
                                                placeholder="Descreva o motivo da rejeição (ex: Foto BI ilegível, Documento expirado...)"
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="min-h-[100px] bg-slate-50 border-slate-200 rounded-xl resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                                                onClick={() => handleKycAction(selectedKyc.id, selectedKyc.user_id, 'verified')}
                                                disabled={!!isActionLoading}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Aprovar Verificação
                                            </Button>
                                            <Button
                                                className="flex-1 h-12 rounded-xl bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 font-bold gap-2"
                                                onClick={() => {
                                                    if (!rejectionReason.trim()) {
                                                        toast.error("Por favor, insira uma justificativa para a rejeição.");
                                                        return;
                                                    }
                                                    handleKycAction(selectedKyc.id, selectedKyc.user_id, 'rejected', rejectionReason);
                                                }}
                                                disabled={!!isActionLoading}
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Rejeitar e Notificar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {selectedKyc.status !== 'pending' && (
                                    <div className={`p-4 rounded-xl font-bold text-center uppercase tracking-widest text-xs ${selectedKyc.status === 'verified' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                        Status: {selectedKyc.status}
                                        {selectedKyc.rejection_reason && (
                                            <p className="mt-2 text-[10px] lowercase font-normal italic">Motivo: {selectedKyc.rejection_reason}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Nova Regra Modal */}
                <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
                    <DialogContent className="max-w-md bg-white rounded-3xl p-8">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                                <Cpu className="w-6 h-6 text-primary" />
                                Nova Regra Dinâmica
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-bold text-sm">SE (Condição)</Label>
                                <Input
                                    value={newRuleCondicao}
                                    onChange={(e) => setNewRuleCondicao(e.target.value)}
                                    placeholder="Ex: salário < 100.000"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">Defina o critério que aciona a regra.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-900 font-bold text-sm">ENTÃO (Ação)</Label>
                                <Input
                                    value={newRuleAcao}
                                    onChange={(e) => setNewRuleAcao(e.target.value)}
                                    placeholder="Ex: crédito máximo = 30.000"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-xl"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">A ação que ocorre quando a condição é verdadeira.</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl text-slate-600 font-bold"
                                    onClick={() => {
                                        setIsRuleModalOpen(false);
                                        setNewRuleCondicao("");
                                        setNewRuleAcao("");
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                                    onClick={() => {
                                        if (!newRuleCondicao.trim() || !newRuleAcao.trim()) {
                                            toast.error("Preencha a condição e a ação da regra.");
                                            return;
                                        }
                                        const novaRegra = {
                                            id: Math.random().toString(36).substring(2, 9),
                                            condicao: newRuleCondicao.trim(),
                                            acao: newRuleAcao.trim()
                                        };
                                        const currentRules = settings.regras?.regrasDinamicas || [];
                                        updateField("regras", "regrasDinamicas", [...currentRules, novaRegra]);

                                        setNewRuleCondicao("");
                                        setNewRuleAcao("");
                                        setIsRuleModalOpen(false);
                                        toast.success("Regra adicionada à lista! Guarde as alterações.");
                                    }}
                                >
                                    Adicionar Regra
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <MFASetup
                isOpen={isMFAModalOpen}
                onOpenChange={setIsMFAModalOpen}
            />
        </AdminLayout>
    );
}
