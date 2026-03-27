import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User, Mail, CreditCard, ShieldCheck,
  AlertCircle, CheckCircle, XCircle,
  ArrowLeft, ExternalLink, Loader2, Download,
  FileText, Image as ImageIcon, MapPin,
  Building2, Briefcase, Banknote, Wallet, Clock
} from "lucide-react";

interface UserDetails {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  bi: string;
  score: number;
  status: string;
  kyc_status: string;
  referral_code: string;
  created_at: string;
  phone?: string;
  empresa?: string;
  cargo?: string;
  salario?: number;
  iban?: string;
}

interface KYCSubmission {
  id: string;
  document_type: string;
  bi_front_url: string;
  bi_back_url: string;
  selfie_url: string;
  address_proof_url: string;
  salary_receipt_url?: string;
  status: string;
  rejection_reason?: string;
  full_name?: string;
  bi_number?: string;
}

interface ResolvedUrls {
  bi_front: string;
  bi_back: string;
  selfie: string;
  address_proof: string;
  salary_receipt: string;
}

interface LoanInfo {
  id: string;
  amount: number;
  months: number;
  interest_rate: number;
  status: string;
  payment_method?: string;
  credit_score?: number;
  score_breakdown?: any;
  credit_decision?: string;
  created_at: string;
}

export default function AdminUserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [kyc, setKyc] = useState<KYCSubmission | null>(null);
  const [urls, setUrls] = useState<ResolvedUrls>({ bi_front: "", bi_back: "", selfie: "", address_proof: "", salary_receipt: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loans, setLoans] = useState<LoanInfo[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setUser(profileData);

      // Fetch KYC
      const { data: kycData, error: kycError } = await (supabase as any)
        .from('kyc_submissions')
        .select('*')
        .eq('user_id', profileData.id)
        .single();

      if (kycError && kycError.code !== 'PGRST116') {
        console.warn("KYC not found or error:", kycError);
      }
      setKyc(kycData);

      // URLs are already stored as full public URLs in the database
      if (kycData) {
        setUrls({
          bi_front: kycData.bi_front_url || "",
          bi_back: kycData.bi_back_url || "",
          selfie: kycData.selfie_url || "",
          address_proof: kycData.address_proof_url || "",
          salary_receipt: kycData.salary_receipt_url || "",
        });
      }

      // Fetch loans for this user
      const { data: loansData } = await (supabase as any)
        .from('loans')
        .select('id, amount, months, interest_rate, status, payment_method, created_at')
        .eq('user_id', profileData.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (loansData) setLoans(loansData);

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar detalhes do utilizador");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveKYC = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ kyc_status: 'verified', status: 'ATIVO' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (kyc) {
        const { error: kycError } = await (supabase as any)
          .from('kyc_submissions')
          .update({ status: 'verified' })
          .eq('user_id', user.id);
        if (kycError) throw kycError;
      }

      toast.success("KYC aprovado com sucesso!");
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao aprovar KYC");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectKYC = async () => {
    if (!user || !rejectionReason) {
      toast.error("Por favor, insira um motivo de rejeição.");
      return;
    }
    setIsUpdating(true);
    try {
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: kycError } = await (supabase as any)
        .from('kyc_submissions')
        .update({ status: 'rejected', rejection_reason: rejectionReason })
        .eq('user_id', user.id);

      if (kycError) throw kycError;

      toast.success("KYC rejeitado.");
      setShowRejectForm(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao rejeitar KYC");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const isPdfUrl = (url: string) => url?.toLowerCase().endsWith('.pdf');

  const DocumentCard = ({ label, url, filename }: { label: string; url: string; filename: string }) => (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="aspect-video bg-muted rounded-xl overflow-hidden border border-border relative group">
        {url ? (
          <>
            {isPdfUrl(url) ? (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
                <FileText className="w-12 h-12 text-primary" />
                <span className="text-xs font-bold text-slate-500 uppercase">Documento PDF</span>
              </div>
            ) : (
              <>
                <img
                  src={url}
                  alt={label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden h-full items-center justify-center text-muted-foreground text-xs">
                  Imagem indisponível
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-white/30 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </a>
              <button
                onClick={() => handleDownload(url, filename)}
                className="bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-white/30 transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/50 text-sm">
            Não submetido
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dossiê do utilizador...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Utilizador não encontrado</h2>
          <Button variant="link" onClick={() => navigate("/admin/usuarios")} className="mt-4">
            Voltar para a lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const displayBi = user.bi || kyc?.bi_number || "Não preenchido";
  const displayName = user.nome || kyc?.full_name || "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/usuarios")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold">{displayName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${user.kyc_status === 'verified' ? 'bg-success/10 text-success' :
                  user.kyc_status === 'pending' ? 'bg-warning/10 text-warning' :
                    user.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-slate-100 text-slate-400'
                  }`}>
                  {user.kyc_status === 'verified' ? 'KYC Verificado' : user.kyc_status === 'pending' ? 'KYC Pendente' : user.kyc_status === 'rejected' ? 'KYC Rejeitado' : 'Sem KYC'}
                </span>
                <span className="text-xs text-muted-foreground">Membro desde {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.kyc_status === 'pending' && !showRejectForm && (
              <>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/5 h-11 px-6 rounded-xl font-bold"
                  disabled={isUpdating}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  onClick={handleApproveKYC}
                  className="gradient-primary h-11 px-6 rounded-xl font-bold shadow-primary text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Aprovar KYC
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Rejection Form */}
        {showRejectForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold">Indicar motivo da rejeição</h3>
            </div>
            <textarea
              className="w-full h-24 bg-white border border-border rounded-xl p-3 text-sm focus:ring-destructive/20 outline-none"
              placeholder="Ex: Documento borrado, Foto cortada..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRejectKYC} disabled={isUpdating}>
                Confirmar Rejeição
              </Button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Section */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documentação Submetida
              </h3>

              {!kyc ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma documentação submetida até ao momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <DocumentCard label="Frente do BI" url={urls.bi_front} filename={`${displayName}_bi_frente.jpg`} />
                  <DocumentCard label="Verso do BI" url={urls.bi_back} filename={`${displayName}_bi_verso.jpg`} />
                  <DocumentCard label="Selfie de Identificação" url={urls.selfie} filename={`${displayName}_selfie.jpg`} />
                  <DocumentCard label="Comprovativo de Morada" url={urls.address_proof} filename={`${displayName}_morada.jpg`} />
                  <DocumentCard label="Último Recibo Salarial" url={urls.salary_receipt} filename={`${displayName}_recibo_salarial.pdf`} />
                </div>
              )}
            </div>

            {/* Análise de Risco (Credit Score) */}
            {loans.length > 0 && loans[0].credit_score !== undefined && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Análise de Risco
                  </h3>
                  <div className="flex flex-col items-end">
                    <span className={`text-2xl font-display font-bold ${loans[0].credit_score >= 750 ? "text-success" :
                      loans[0].credit_score >= 600 ? "text-warning" : "text-destructive"
                      }`}>
                      {loans[0].credit_score}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Score Atual</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Histórico de Pagamento", value: (loans[0] as any).score_breakdown?.history || 0, weight: "40%" },
                    { label: "Rendimento e Capacidade", value: (loans[0] as any).score_breakdown?.income || 0, weight: "30%" },
                    { label: "Nível de Endividamento", value: (loans[0] as any).score_breakdown?.debt || 0, weight: "20%" },
                    { label: "Estabilidade", value: (loans[0] as any).score_breakdown?.stability || 0, weight: "10%" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">{item.label} <span className="text-[10px] text-slate-400 font-normal">({item.weight})</span></span>
                        <span className={item.value >= 700 ? "text-success" : item.value >= 400 ? "text-warning" : "text-destructive"}>
                          {item.value}/1000
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / 1000) * 100}%` }}
                          className={`h-full rounded-full ${item.value >= 700 ? "bg-success" : item.value >= 400 ? "bg-warning" : "bg-destructive"
                            }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {loans[0].credit_decision && (
                  <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${loans[0].credit_decision === 'APROVADO' ? 'bg-success/5 border-success/20 text-success' :
                    loans[0].credit_decision === 'ANALISE_MANUAL' ? 'bg-warning/5 border-warning/20 text-warning' :
                      'bg-destructive/5 border-destructive/20 text-destructive'
                    }`}>
                    {loans[0].credit_decision === 'APROVADO' ? <CheckCircle className="w-5 h-5" /> :
                      loans[0].credit_decision === 'ANALISE_MANUAL' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest">Decisão Automática</p>
                      <p className="text-sm font-bold">
                        {loans[0].credit_decision === 'APROVADO' ? 'Crédito Pré-Aprovado' :
                          loans[0].credit_decision === 'ANALISE_MANUAL' ? 'Requer Análise Humana' : 'Crédito Recusado'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dados Financeiros */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Dados Financeiros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Empresa</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{(user as any).empresa || 'Não declarado'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Função / Cargo</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{(user as any).cargo || 'Não declarado'}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Salário Declarado</p>
                  </div>
                  <p className="text-2xl font-display font-bold text-primary">
                    {(user as any).salario ? `${Number((user as any).salario).toLocaleString('pt-AO')} Kz` : 'Não declarado'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">IBAN</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800 break-all">{(user as any).iban || 'Não declarado'}</p>
                </div>
              </div>

              {/* Recent Loans with Payment Method */}
              {loans.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5" /> Solicitações de Crédito Recentes
                  </p>
                  <div className="space-y-2">
                    {loans.map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {Number(loan.amount).toLocaleString('pt-AO')} Kz
                            <span className="text-xs text-muted-foreground ml-2">({loan.months} {loan.months === 1 ? 'mês' : 'meses'})</span>
                          </p>
                          {loan.payment_method && (
                            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">
                              <Wallet className="w-3 h-3 inline mr-1" />
                              {loan.payment_method}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${loan.status === 'APROVADO' ? 'bg-success/10 text-success' :
                          loan.status === 'PENDENTE' ? 'bg-warning/10 text-warning' :
                            loan.status === 'REJEITADO' ? 'bg-destructive/10 text-destructive' :
                              'bg-slate-100 text-slate-500'
                          }`}>
                          {loan.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-4">Informação de Conta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Score de Crédito</p>
                  <p className="text-2xl font-display font-bold text-primary">{user.score || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Código de Indicação</p>
                  <p className="text-2xl font-display font-bold text-indigo-600 tracking-wider uppercase">{user.referral_code || "---"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm divide-y divide-border">
              <div className="pb-4">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-700 mb-4">Dados Pessoais</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Nome Completo</p>
                      <p className="text-sm font-medium">{displayName}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                      <p className="text-sm font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Nº do BI</p>
                      <p className="text-sm font-medium">{displayBi}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-700 mb-4">Status & Segurança</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Estado Geral</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${user.status === 'ATIVO' ? 'bg-success/10 text-success' :
                      user.status === 'BLOQUEADO' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                      }`}>
                      {user.status || 'PENDENTE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Segurança 2FA</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">Desativado</span>
                  </div>
                </div>
              </div>
            </div>

            {kyc?.rejection_reason && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
                <h4 className="flex items-center gap-2 text-destructive font-bold text-sm mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Histórico de Rejeição
                </h4>
                <p className="text-xs text-destructive/80 italic">"{kyc.rejection_reason}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout >
  );
}
