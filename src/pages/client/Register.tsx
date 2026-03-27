import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Camera, Loader2, UserPlus, Building2, ShieldCheck, Mail, Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsModal } from "@/components/client/TermsModal";
import { CameraModal } from "@/components/client/CameraModal";

const steps = ["Indicação", "Pessoal", "Atividade", "Segurança"];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", password: "", nascimento: "", bi: "", endereco: "",
    empresa: "", cargo: "", tempoTrabalho: "", salario: "", iban: "",
    aceitouTermos: false,
    biFile: null as File | null,
    selfieFile: null as File | null,
    phoneNumber: "",
    isPhoneVerified: false,
    smsCodeSent: false,
    verificationCode: "",
  });

  const validateCode = async () => {
    if (!referralCode.match(/^INV-[A-Z0-9]{4}$/i)) {
      toast.error("Código de indicação inválido. Use o formato INV-XXXX");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('invites')
        .select('id, status')
        .eq('code', referralCode)
        .maybeSingle();

      if (error || !data) {
        toast.error("Este código de indicação é inválido.");
        return;
      }

      if (data.status === 'USED') {
        toast.error("Este código de indicação já foi utilizado por outra pessoa.");
        return;
      }

      setCodeValid(true);
      setTimeout(() => setStep(1), 500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!(form as any).biFile || !(form as any).selfieFile) {
      toast.error("Por favor, selecione os documentos necessários.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Sign Up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nome: form.nome,
            full_name: form.nome, // Add both for compatibility with different triggers
            bi: form.bi,
            empresa: form.empresa,
            cargo: form.cargo,
            salario: form.salario,
            iban: form.iban
          }
        }
      });

      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      if (!userId) throw new Error("Erro ao gerar conta.");

      // 2. Clear out existing sessions if any or wait a bit for profile trigger
      console.log("Usuário criado:", userId);

      // 3. Document Uploads
      const uploadFile = async (file: File, fileName: string) => {
        const fileExt = file.name.split('.').pop();
        const path = `${userId}/${fileName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, {
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error("Upload error for:", fileName, uploadError);
          // We don't throw yet, we'll check later
          return null;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(path);

        return publicUrl;
      };

      const [biUrl, selfieUrl] = await Promise.all([
        uploadFile((form as any).biFile!, "bi_frente"),
        uploadFile((form as any).selfieFile!, "selfie")
      ]);

      // 4. Create KYC Submission
      // Note: profiles.id is needed here. If the trigger ran, user_id = userId.
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (profile) {
        let referred_by_id = null;
        if (referralCode) {
          // Use the secure database function to process the referral bonus
          const { data: bonusResult, error: bonusError } = await (supabase as any)
            .rpc('process_referral_bonus', {
              p_invite_code: referralCode,
              p_new_user_id: userId,
              p_new_user_name: form.nome
            });

          if (bonusError) {
            console.error('Erro ao processar bónus de referência:', bonusError);
            throw new Error(`Erro ao validar o seu convite: ${bonusError.message}`);
          }

          if (!bonusResult?.success) {
            console.warn('Bónus não aplicado:', bonusResult?.error);
            throw new Error(`Este convite não pôde ser processado: ${bonusResult?.error || 'Erro desconhecido'}`);
          }

          console.log('Bónus de referência processado com sucesso:', bonusResult);
        }

        await (supabase as any).from('kyc_submissions').upsert({
          user_id: profile.id,
          full_name: form.nome,
          bi_number: form.bi,
          bi_front_url: biUrl,
          selfie_url: selfieUrl,
          status: 'pending'
        }, { onConflict: 'user_id' });

        await (supabase as any)
          .from('profiles')
          .update({
            nome: form.nome,
            bi: form.bi,
            kyc_status: 'pending' as any,
            empresa: form.empresa || null,
            cargo: form.cargo || null,
            salario: form.salario ? parseFloat(form.salario) : null,
            iban: form.iban || null
          })
          .eq('id', profile.id);
      }

      toast.success("Registo efetuado com sucesso!");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error: any) {
      console.error("Erro no registo:", error);
      toast.error(error.message || "Ocorreu um erro ao processar o seu pedido.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <img src="/images/financial_bg.png" alt="" className="w-full h-full object-cover" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 font-display text-2xl font-bold text-primary">
            +Kwanz<span className="text-accent">as</span>
          </Link>

          <div className="flex items-center justify-between max-w-md mx-auto mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? "bg-primary border-primary text-white" :
                  i === step ? "border-primary text-primary shadow-sm" :
                    "border-slate-200 text-slate-400"
                  }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${i === step ? "text-primary" : "text-slate-400"}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-elevated border border-slate-100 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Código de Acesso</h2>
                  <p className="text-slate-500 text-sm mb-4">Para garantir a segurança da nossa rede, o cadastro é feito exclusivamente via indicação de membros ativos.</p>
                  <div className="bg-orange-50 text-accent text-xs font-bold py-3 px-4 rounded-xl border border-orange-100 mb-6">
                    Dúvidas ou problemas? Contacte o suporte: 910 000 100
                  </div>
                </div>

                <div className="space-y-6 max-w-sm mx-auto w-full">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Insira o código de indicação</Label>
                    <Input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="REF-0000"
                      className="h-14 rounded-xl border-slate-200 text-center text-2xl font-bold tracking-widest focus:ring-primary/20"
                      maxLength={8}
                    />
                  </div>
                  <Button size="xl" className="w-full rounded-xl shadow-primary font-bold" onClick={validateCode} disabled={referralCode.length < 8}>
                    Próximo Passo <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-primary" /> Dados Pessoais
                </h2>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {[
                    { key: "nome", label: "Nome Completo", placeholder: "Ex: João Manuel Silva" },
                    { key: "email", label: "Email Profissional", placeholder: "exemplo@servico.ao", type: "email" },
                    { key: "password", label: "Senha de Acesso", placeholder: "••••••••", type: "password" },
                    { key: "bi", label: "Número do BI", placeholder: "000000000LA000" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label className="text-slate-700 text-sm font-medium">{field.label}</Label>
                      <Input
                        type={field.type || "text"}
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => updateForm(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-12 rounded-xl border-slate-200 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex gap-4">
                  <Button variant="outline" size="lg" className="rounded-xl px-10 border-slate-200" onClick={() => setStep(0)}>Voltar</Button>
                  <Button size="lg" className="flex-1 rounded-xl shadow-primary" onClick={() => setStep(2)}>Continuar</Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" /> Atividade Profissional
                </h2>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {[
                    { key: "empresa", label: "Instituição / Empresa", placeholder: "Onde trabalha?" },
                    { key: "cargo", label: "Função / Cargo", placeholder: "Ex: Analista Sénior" },
                    { key: "salario", label: "Rendimento Mensal (Kz)", placeholder: "Ex: 250000" },
                    { key: "iban", label: "IBAN para Recebimento", placeholder: "AO00..." },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label className="text-slate-700 text-sm font-medium">{field.label}</Label>
                      <Input
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => updateForm(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-12 rounded-xl border-slate-200 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex gap-4">
                  <Button variant="outline" size="lg" className="rounded-xl px-10 border-slate-200" onClick={() => setStep(1)}>Voltar</Button>
                  <Button size="lg" className="flex-1 rounded-xl shadow-primary" onClick={() => setStep(3)}>Continuar</Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Verificação de Segurança</h2>
                <p className="text-slate-500 mb-8 max-w-sm">Capture os documentos necessários para ativar a sua conta institutional.</p>

                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                  <div className="relative">
                    <input
                      type="file"
                      id="bi-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateForm("biFile", file as any);
                      }}
                    />
                    <button
                      onClick={() => document.getElementById('bi-upload')?.click()}
                      className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all gap-3 overflow-hidden ${(form as any).biFile ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-400 hover:border-primary/50 hover:bg-slate-50"
                        }`}
                    >
                      {(form as any).biFile ? (
                        <>
                          <Check className="w-6 h-6" />
                          <span className="text-[10px] font-bold uppercase truncate max-w-full italic">Bi Selecionado</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6" />
                          <span className="text-xs font-bold text-slate-500">Documento BI (Frente)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <CameraModal
                      onCapture={(file) => updateForm("selfieFile", file as any)}
                      trigger={
                        <button
                          className={`w-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all gap-3 overflow-hidden ${(form as any).selfieFile ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-400 hover:border-primary/50 hover:bg-slate-50"
                            }`}
                        >
                          {(form as any).selfieFile ? (
                            <>
                              <Check className="w-6 h-6" />
                              <span className="text-[10px] font-bold uppercase truncate max-w-full italic">Selfie Capturada</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6" />
                              <span className="text-xs font-bold text-slate-500">Capturar Selfie em Tempo Real</span>
                            </>
                          )}
                        </button>
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 w-full mb-8">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 group hover:border-primary/30 transition-all text-left">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${form.isPhoneVerified ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Verificação de SMS</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-tight">Validação do número de telemóvel para segurança</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nº de Telemóvel"
                          value={form.phoneNumber}
                          onChange={(e) => updateForm("phoneNumber", e.target.value)}
                          className="h-10 rounded-xl bg-white border-slate-100 text-xs font-bold"
                          disabled={form.isPhoneVerified || form.smsCodeSent}
                        />
                        {!form.smsCodeSent && !form.isPhoneVerified && (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (form.phoneNumber.length < 9) {
                                toast.error("Insira um número válido");
                                return;
                              }
                              updateForm("smsCodeSent", true as any);
                              toast.info("Modo Simulação: Use o código 1234");
                            }}
                            disabled={!form.phoneNumber}
                            className="rounded-xl px-4 font-bold text-xs bg-primary text-white"
                          >
                            Validar
                          </Button>
                        )}
                      </div>

                      {form.smsCodeSent && !form.isPhoneVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 pt-2"
                        >
                          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <p className="text-[10px] text-orange-700 font-bold leading-tight">
                              SISTEMA EM MODO TESTE:<br />
                              Introduza o código <span className="text-primary underline">1234</span> para validar.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Código"
                              value={form.verificationCode}
                              onChange={(e) => updateForm("verificationCode", e.target.value)}
                              className="h-10 rounded-xl bg-white border-slate-100 text-center text-sm font-bold tracking-[0.5em]"
                              maxLength={4}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (form.verificationCode === "1234") {
                                  updateForm("isPhoneVerified", true as any);
                                  updateForm("smsCodeSent", false as any);
                                  toast.success("Telemóvel verificado!");
                                } else {
                                  toast.error("Código incorreto. Tente 1234");
                                }
                              }}
                              className="rounded-xl px-4 font-bold text-xs bg-success text-white"
                            >
                              Confirmar
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {form.isPhoneVerified && (
                        <div className="flex items-center gap-2 text-success font-bold text-xs bg-success/5 p-2 rounded-lg border border-success/20">
                          <CheckCircle2 className="w-4 h-4" />
                          Número Verificado com Sucesso
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 text-left bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => updateForm("aceitouTermos", (!form.aceitouTermos) as any)}>
                    <Checkbox id="terms" checked={form.aceitouTermos as any} onCheckedChange={(checked) => updateForm("aceitouTermos", checked as any)} className="mt-1" />
                    <label htmlFor="terms" className="text-xs font-medium text-slate-500 leading-normal cursor-pointer">
                      Eu li e aceito os <TermsModal type="termos_uso" trigger={<span className="text-primary font-bold hover:underline">Termos e Condições</span>} /> e a <TermsModal type="politica_privacidade" trigger={<span className="text-primary font-bold hover:underline">Política de Privacidade</span>} /> da byteKwanza.
                    </label>
                  </div>
                </div>

                <div className="w-full flex gap-4">
                  <Button variant="outline" size="lg" className="rounded-xl px-10 border-slate-200" onClick={() => setStep(2)}>Voltar</Button>
                  <Button size="lg" className="flex-1 rounded-xl bg-primary shadow-primary font-bold" onClick={handleSubmit} disabled={isLoading || !form.aceitouTermos || !form.isPhoneVerified}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Cadastro"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          Já possui uma conta?{" "}
          <Link to="/login" className="text-primary hover:underline font-bold">
            Aceder ao sistema
          </Link>
        </p>

        <Link to="/" className="flex items-center justify-center gap-2 mt-8 text-slate-400 hover:text-primary transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a página inicial
        </Link>

        {/* Developer Credit */}
        <div className="mt-12 flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-white shadow-soft border border-slate-100 transition-transform hover:scale-105">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Desenvolvido por</span>
          <img src="/images/bytekwanza_logo_hq.png" alt="byteKwanza" className="h-7 w-auto" />
        </div>
      </motion.div>
    </div>
  );
}
