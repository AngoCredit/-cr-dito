import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, ShieldCheck, AlertCircle, Trash2, QrCode, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface MFASetupProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function MFASetup({ isOpen, onOpenChange }: MFASetupProps) {
    const [step, setStep] = useState<'status' | 'verify'>('status');
    const [factors, setFactors] = useState<any[]>([]);
    const [enrolledFactor, setEnrolledFactor] = useState<any>(null);
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFactors();
        }
    }, [isOpen]);

    const fetchFactors = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            setFactors(data.all || []);
            setStep('status');
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao carregar factores 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    const onEnroll = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                issuer: "byteKwanza",
            });
            if (error) throw error;
            setEnrolledFactor(data);
            setStep('verify');
            setOtpCode("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const onVerify = async () => {
        if (otpCode.length !== 6) return;
        setIsLoading(true);
        try {
            const { id } = enrolledFactor;
            const challenge = await supabase.auth.mfa.challenge({ factorId: id });
            if (challenge.error) throw challenge.error;

            const verify = await supabase.auth.mfa.verify({
                factorId: id,
                challengeId: challenge.data.id,
                code: otpCode,
            });
            if (verify.error) throw verify.error;

            toast.success("2FA ativado com sucesso!");
            await fetchFactors();
        } catch (error: any) {
            toast.error(error.message || "Código inválido. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const onUnenroll = async (factorId: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            toast.success("2FA desativado com sucesso.");
            await fetchFactors();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white rounded-[2.5rem] overflow-hidden p-0 border-none shadow-2xl">
                <div className="bg-slate-950 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold font-display flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                            Segurança 2FA
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Proteja sua conta administrativa com autenticação de dois factores.</p>
                </div>

                <div className="p-8">
                    {isLoading && step === 'status' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
                        </div>
                    )}

                    {!isLoading && step === 'status' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {factors.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-start gap-4">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                                            <ShieldCheck className="text-white w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-emerald-900 text-lg">Proteção Ativa</p>
                                            <p className="text-sm text-emerald-700/80 font-medium">Sua conta está protegida por uma camada extra de segurança.</p>
                                        </div>
                                    </div>

                                    {factors.map(f => (
                                        <div key={f.id} className="group flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dispositivo Registado</p>
                                                <p className="font-bold text-slate-800 flex items-center gap-2">
                                                    App Autenticadora
                                                    {f.status === 'verified' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 w-10 p-0 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                onClick={() => onUnenroll(f.id)}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center space-y-8 py-4">
                                    <div className="relative inline-block">
                                        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto transform -rotate-6">
                                            <QrCode className="w-12 h-12 text-primary" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                                            <AlertCircle className="w-6 h-6 text-orange-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-xl text-slate-900">Configurar Autenticação</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                            O 2FA adiciona uma camada de segurança. <br />
                                            Você precisará de um código da sua app sempre que entrar.
                                        </p>
                                    </div>
                                    <Button onClick={onEnroll} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all gap-2 group">
                                        Começar Configuração
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'verify' && enrolledFactor && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-xl text-slate-900">Escaneie o QR Code</h3>
                                <p className="text-sm text-slate-500 font-medium">Use Google Authenticator ou Authy no seu telemóvel.</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-inner flex items-center justify-center">
                                <img
                                    src={enrolledFactor.totp.qr_code}
                                    alt="QR Code"
                                    className="w-52 h-52 flex items-center justify-center"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Código de Verificação</p>
                                    <div className="flex justify-center">
                                        <InputOTP
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={setOtpCode}
                                            onComplete={onVerify}
                                        >
                                            <InputOTPGroup className="gap-2">
                                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                                    <InputOTPSlot
                                                        key={i}
                                                        index={i}
                                                        className="h-14 w-12 text-2xl font-bold border-slate-200 rounded-2xl bg-slate-50 focus:ring-primary/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>

                                <Button
                                    onClick={onVerify}
                                    disabled={otpCode.length !== 6 || isLoading}
                                    className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Ativar 2FA Agora"}
                                </Button>

                                <button
                                    onClick={() => setStep('status')}
                                    className="w-full text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
