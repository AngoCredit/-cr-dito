import { useState, useEffect } from "react";
import ClientLayout from "@/components/client/ClientLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { formatKz } from "@/lib/format";
import { getUserLevel } from "@/lib/levels";
import { Calculator, Clock, Percent, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsModal } from "@/components/client/TermsModal";
import { calculateCreditScore, getCreditDecision, ScoringData } from "@/lib/creditScoring";
import { differenceInMonths } from "date-fns";

export default function CreditRequest() {
  const [valor, setValor] = useState(100000);
  const [prazo, setPrazo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<string>("not_started");
  const [aceitouContrato, setAceitouContrato] = useState(false);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [userCreditLimit, setUserCreditLimit] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const navigate = useNavigate();
  const [userScore, setUserScore] = useState(0);
  const [validationRules, setValidationRules] = useState({ kyc: false, financial: false, salary: false, referral: false, isLoaded: false });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsInitializing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch Profile for KYC status and Score
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('kyc_status, credit_limit, score, iban, salario, referred_by')
        .eq('user_id', user.id)
        .single();

      setKycStatus(profile?.kyc_status || "not_started");
      setUserCreditLimit(profile?.credit_limit || 0);
      setUserScore(profile?.score || 0);

      // Validate Referral
      let hasValidReferral = false;
      if (profile?.referred_by) {
        const { data: referrer } = await (supabase as any)
          .from('profiles')
          .select('role, score')
          .eq('id', profile.referred_by)
          .single();
        if (referrer?.role === 'admin' || (referrer?.score && referrer.score > 100)) {
          hasValidReferral = true;
        }
      }

      setValidationRules({
        kyc: profile?.kyc_status === 'verified',
        financial: !!profile?.iban && profile.iban.trim().length > 5,
        salary: Number(profile?.salario || 0) > 0,
        referral: hasValidReferral,
        isLoaded: true
      });

      // Fetch System Settings for rates
      const { data: settingsData } = await (supabase as any)
        .from('system_settings')
        .select('*')
        .in('key', ['credito', 'multas']);

      const mappedSettings: any = {};
      settingsData?.forEach((s: any) => { mappedSettings[s.key] = s.value; });
      setSettings(mappedSettings);

      // Extract active payment methods
      const { data: pagData } = await (supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'pagamentos')
        .single();

      if (pagData?.value?.metodos) {
        const activeMethods = pagData.value.metodos.filter((m: any) => m.active);
        setPaymentMethods(activeMethods);
        if (activeMethods.length > 0) setPaymentMethod(activeMethods[0].name);
      }

      // REMOVED REDIRECT IF NOT VERIFIED (to display the checklist completely)

      // Check for active/pending loans
      const { data: existingLoans } = await (supabase as any)
        .from('loans')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['PENDENTE', 'APROVADO', 'ATRASADO']);

      if (existingLoans && existingLoans.length > 0) {
        setHasActiveLoan(true);
      }

      // Set default value based on settings if possible
      if (mappedSettings.credito?.limiteMin) {
        setValor(parseInt(mappedSettings.credito.limiteMin.replace(/\./g, '')));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsInitializing(false);
    }
  };

  // LEVEL LOGIC
  const userLevel = getUserLevel(userScore);
  const boostedCreditLimit = userCreditLimit * userLevel.creditMultiplier;

  const getTaxa = () => {
    if (!settings?.credito) return prazo === 1 ? 0.35 : 0.45;
    const rateStr = prazo === 1 ? (settings.credito.taxa1Mes || '35%') : (settings.credito.taxa2Meses || '45%');
    const baseRate = parseFloat(rateStr.replace('%', '')) / 100;

    // Apply LEVEL DISCOUNT
    // If discount is 10%, the multiplier is 0.9
    const discountMultiplier = 1 - userLevel.interestDiscount;
    return baseRate * discountMultiplier;
  };

  const taxa = getTaxa();
  const valorTotal = valor * (1 + taxa);
  const parcela = valorTotal / prazo;

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const allValid = validationRules.kyc && validationRules.financial && validationRules.salary && validationRules.referral;
      if (!allValid) {
        toast.error("Não cumpre os requisitos mínimos de Score para solicitar crédito. Verifique o quadro de indicações.");
        setIsLoading(false);
        return;
      }

      // 1. Fetch user profile and history for scoring
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      const { data: history } = await (supabase as any)
        .from('loans')
        .select('*')
        .eq('user_id', userData.user.id);

      // 2. Prepare scoring data
      const paidLoans = history?.filter((l: any) => l.status === 'PAGO').length || 0;
      const delayedLoans = history?.filter((l: any) => l.status === 'ATRASADO').length || 0;
      const activeLoans = history?.filter((l: any) => ['APROVADO', 'ATRASADO'].includes(l.status));
      const outstandingBalance = activeLoans?.reduce((sum: number, l: any) => sum + (l.amount || 0), 0) || 0;

      const scoringData: ScoringData = {
        paidLoans,
        delayedLoans,
        totalLoans: history?.length || 0,
        monthlySalary: Number(profile?.salario || 0),
        requestedAmount: valor,
        activeLoansCount: activeLoans?.length || 0,
        outstandingBalance,
        kycVerified: profile?.kyc_status === 'verified',
        monthsSinceCreation: profile?.created_at ? Math.max(1, differenceInMonths(new Date(), new Date(profile.created_at))) : 1
      };

      // 3. Calculate score
      const breakdown = calculateCreditScore(scoringData);
      const decision = getCreditDecision(breakdown.finalScore);

      // 4. Handle rejection immediately if score is too low (optional, but requested for automated decision)
      if (decision === 'REJEITADO' && breakdown.finalScore < 500) {
        toast.error("Limite de crédito indisponível para o seu perfil no momento.");
        setIsLoading(false);
        return;
      }

      const { error } = await (supabase as any).from('loans').insert({
        user_id: userData.user.id,
        amount: valor,
        months: prazo,
        interest_rate: taxa * 100,
        status: decision === 'REJEITADO' ? 'REJEITADO' : 'PENDENTE',
        payment_method: paymentMethod || null,
        credit_score: breakdown.finalScore,
        score_breakdown: breakdown,
        credit_decision: decision
      });

      if (error) throw error;

      toast.success("Solicitação enviada com sucesso!");
      navigate("/app");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Validando segurança...</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-display text-3xl font-bold text-primary">Solicitar crédito</h2>
          <p className="text-muted-foreground text-sm font-medium">Simule e solicite o seu empréstimo institucional</p>
        </motion.div>

        <div className="space-y-8 mt-4">
          {/* Valor */}
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor solicitado</Label>
            <div className="text-center py-4 bg-muted/30 rounded-2xl border border-dashed border-primary/20">
              <span className="font-display text-5xl font-bold text-primary tracking-tighter">{formatKz(valor)}</span>
            </div>
            <Slider
              value={[valor]}
              onValueChange={(v) => setValor(v[0])}
              min={parseInt(settings?.credito?.limiteMin?.replace(/\./g, '') || "10000")}
              max={boostedCreditLimit > 0 ? boostedCreditLimit : parseInt(settings?.credito?.limiteMax?.replace(/\./g, '') || "500000")}
              step={10000}
              className="py-4 cursor-pointer"
              disabled={hasActiveLoan}
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Min: {formatKz(parseInt(settings?.credito?.limiteMin?.replace(/\./g, '') || "10000"))}</span>
              <span>Max: {formatKz(boostedCreditLimit > 0 ? boostedCreditLimit : parseInt(settings?.credito?.limiteMax?.replace(/\./g, '') || "500000"))}</span>
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prazo de reembolso</Label>
            <div className="flex gap-4">
              {[1, 2].map((m) => (
                <button
                  key={m}
                  onClick={() => setPrazo(m)}
                  disabled={hasActiveLoan}
                  className={`flex-1 h-14 rounded-2xl text-sm font-bold transition-all border-2 ${prazo === m
                    ? "gradient-accent text-white border-transparent shadow-lg scale-105"
                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    } ${hasActiveLoan ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {m} {m === 1 ? "Mês" : "Meses"} <span className="text-[10px] opacity-70 block font-normal">({m === 1 ? (settings?.credito?.taxa1Mes || '35%') : (settings?.credito?.taxa2Meses || '45%')})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Simulação */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Resumo da Simulação</h3>
            </div>
            <div className="space-y-4">
              {[
                { icon: Calculator, label: "Total a pagar", value: formatKz(Math.round(valorTotal)), highlighted: true },
                { icon: Percent, label: "Taxa mensal fixa", value: `${(taxa * 100).toFixed(1)}%` },
                { icon: Clock, label: "Parcela mensal", value: formatKz(Math.round(parcela)), highlighted: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <span className={`font-display font-bold ${item.highlighted ? "text-base text-primary" : "text-sm text-foreground"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Método de Pagamento */}
          {paymentMethods.length > 0 && (
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> Método de Pagamento Preferido
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method: any) => (
                  <button
                    key={method.name}
                    onClick={() => setPaymentMethod(method.name)}
                    disabled={hasActiveLoan}
                    className={`p-4 rounded-2xl text-sm font-bold transition-all border-2 text-center ${paymentMethod === method.name
                      ? 'gradient-primary text-white border-transparent shadow-lg scale-[1.02]'
                      : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                      } ${hasActiveLoan ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3 text-left bg-muted/30 p-4 rounded-2xl border border-dashed border-primary/20 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setAceitouContrato(!aceitouContrato)}>
            <Checkbox id="contract" checked={aceitouContrato} onCheckedChange={(checked) => setAceitouContrato(checked as boolean)} className="mt-1" />
            <label htmlFor="contract" className="text-xs font-medium text-slate-500 leading-normal cursor-pointer">
              Eu li e aceito o <TermsModal type="contrato_credito" trigger={<span className="text-primary font-bold hover:underline">Contrato de Adesão ao Crédito</span>} /> da byteKwanza e confirmo a veracidade dos dados.
            </label>
          </div>

          {/* Validation Checklist */}
          {validationRules.isLoaded && !(validationRules.kyc && validationRules.financial && validationRules.salary && validationRules.referral) && (
            <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-bold text-sm">Requisitos Mínimos de Score</h4>
              </div>
              <p className="text-xs text-orange-700/80 mb-3">O seu perfil não cumpre atualmente com as normas de elegibilidade de base da instituição.</p>
              <div className="space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  {validationRules.kyc ? <span className="text-success">✅</span> : <span>❌</span>}
                  <span className={validationRules.kyc ? "text-slate-600 line-through" : "text-orange-900"}>Documentação Submetida (KYC)</span>
                </div>
                <div className="flex items-center gap-2">
                  {validationRules.financial ? <span className="text-success">✅</span> : <span>❌</span>}
                  <span className={validationRules.financial ? "text-slate-600 line-through" : "text-orange-900"}>Dados Financeiros (IBAN Registado)</span>
                </div>
                <div className="flex items-center gap-2">
                  {validationRules.salary ? <span className="text-success">✅</span> : <span>❌</span>}
                  <span className={validationRules.salary ? "text-slate-600 line-through" : "text-orange-900"}>Salário Declarado Mensal</span>
                </div>
                <div className="flex items-center gap-2">
                  {validationRules.referral ? <span className="text-success">✅</span> : <span>❌</span>}
                  <span className={validationRules.referral ? "text-slate-600 line-through" : "text-orange-900"}>Convite Qualificado (Admin ou &gt; 100 pts)</span>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="hero"
            size="xl"
            className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl active:scale-95 transition-transform"
            onClick={handleSubmit}
            disabled={isLoading || !aceitouContrato || hasActiveLoan}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : hasActiveLoan ? (
              "Já possui solicitação ativa"
            ) : (
              "Confirmar Solicitação"
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground px-4 italic">
            *Sujeito a aprovação de crédito institucional e análise de risco byteKwanza.
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}
