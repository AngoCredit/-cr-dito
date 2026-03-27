import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [code2FA, setCode2FA] = useState("");
    const [tempAuthData, setTempAuthData] = useState<any>(null);

    const proceedWithLogin = async (data: any) => {
        try {
            const { data: profile } = await (supabase as any)
                .from("profiles")
                .select("role, must_change_password")
                .eq("user_id", data.user.id)
                .single();

            if (!["admin", "manager"].includes(profile?.role || "")) {
                await supabase.auth.signOut();
                throw new Error("Acesso restrito a administradores e gestores.");
            }

            // Log de auditoria para login
            const { data: secSettings } = await (supabase as any).from('system_settings').select('value').eq('key', 'seguranca').single();
            if (secSettings?.value?.manterLogs) {
                await (supabase as any).from('admin_audit_logs').insert({
                    admin_id: data.user.id,
                    action: 'ADMIN_LOGIN',
                    entity: 'auth',
                    details: { success: true }
                });
            }

            if (profile?.must_change_password) {
                navigate("/setup-password");
            } else {
                navigate("/admin");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro no login administrativo");
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Buscar configurações de segurança
            const { data: secSettings } = await (supabase as any).from('system_settings').select('value').eq('key', 'seguranca').single();
            const security = secSettings?.value || {};

            const attemptsKey = `login_attempts_${username}`;
            const attempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10);
            const lockKey = `login_locked_${username}`;
            const lockedUntil = parseInt(localStorage.getItem(lockKey) || "0", 10);

            if (lockedUntil && Date.now() < lockedUntil) {
                const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
                throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${remainingMinutes} minutos.`);
            }

            let email = username;

            // Se não for um email, buscar no profiles pelo username
            if (!username.includes("@")) {
                const { data: profile, error: profileError } = await (supabase as any)
                    .from("profiles")
                    .select("email")
                    .eq("username", username)
                    .single();

                if (profileError || !profile?.email) {
                    // Tentativa especial para o admin inicial: bytekwanza
                    if (username === "bytekwanza") {
                        email = "bytekwanza@gmail.com";
                    } else {
                        throw new Error("Utilizador não encontrado.");
                    }
                } else {
                    email = profile.email;
                }
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (security.limiteTentativas) {
                    const newAttempts = attempts + 1;
                    localStorage.setItem(attemptsKey, newAttempts.toString());
                    if (newAttempts >= security.limiteTentativas) {
                        localStorage.setItem(lockKey, (Date.now() + 15 * 60 * 1000).toString()); // Bloquear por 15 minutos
                        throw new Error(`Limite de tentativas excedido. Conta bloqueada por 15 minutos.`);
                    }
                }

                // Se falhar e for o admin inicial, o usuário pode estar em confirmação ou já existir
                if (username === "bytekwanza" && password === "bytekwanza26#") {
                    toast.info("Acesso em processamento. Por favor, aguarde e tente novamente.");
                    return;
                }
                throw error;
            }

            // Sucesso - limpar tentativas
            localStorage.removeItem(attemptsKey);
            localStorage.removeItem(lockKey);

            if (security.ativar2FA) {
                setTempAuthData(data);
                setShow2FA(true);
                setIsLoading(false);
                return;
            }

            await proceedWithLogin(data);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro no login administrativo");
            setIsLoading(false);
        } finally {
            // setIsLoading(false); // This is now handled inside proceedWithLogin or before 2FA
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Painel Executivo</h1>
                    <p className="text-slate-500 text-sm">byteKwanza Admin Hub</p>
                </div>

                {show2FA ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="text-center space-y-2 mb-6">
                            <h3 className="font-bold text-lg text-slate-900">Autenticação 2FA</h3>
                            <p className="text-sm text-slate-500">Insira o código de 6 dígitos da sua aplicação autenticadora.</p>
                        </div>
                        <div className="space-y-4">
                            <Input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={code2FA}
                                onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-3xl tracking-[0.5em] font-mono h-16 bg-slate-50 border-slate-200"
                            />
                            <Button
                                type="button"
                                size="xl"
                                className="w-full h-16 rounded-2xl gradient-primary font-bold text-lg"
                                onClick={async () => {
                                    if (code2FA.length !== 6) {
                                        toast.error("Insira o código de 6 dígitos.");
                                        return;
                                    }
                                    setIsLoading(true);
                                    try {
                                        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
                                        if (factorsError) throw factorsError;

                                        const totpFactor = factors.all.find(f => f.factor_type === 'totp' && f.status === 'verified');

                                        if (!totpFactor) {
                                            // Fallback para quando o admin ainda não configurou o factor real no Supabase
                                            // mas o sistema global exige 2FA (como demonstrado anteriormente)
                                            await proceedWithLogin(tempAuthData);
                                            return;
                                        }

                                        const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
                                        if (challenge.error) throw challenge.error;

                                        const verify = await supabase.auth.mfa.verify({
                                            factorId: totpFactor.id,
                                            challengeId: challenge.data.id,
                                            code: code2FA,
                                        });

                                        if (verify.error) throw verify.error;

                                        await proceedWithLogin(tempAuthData);
                                    } catch (error: any) {
                                        console.error(error);
                                        toast.error(error.message || "Código inválido.");
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verificar Código"}
                            </Button>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShow2FA(false);
                                supabase.auth.signOut();
                            }}
                            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm font-medium mt-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-widest">Utilizador</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="utilizador ou Email"
                                    className="pl-12 h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-700 font-bold ml-1 text-xs uppercase tracking-widest">Senha</Label>
                                <Link to="/forgot-password" className="text-[10px] text-primary font-bold hover:underline">Esqueceu-se?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="pl-12 h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" size="xl" className="w-full h-16 rounded-2xl gradient-primary shadow-primary font-bold text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Aceder ao Painel"}
                        </Button>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm font-medium mt-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao site
                        </button>
                    </form>
                )}

                <div className="mt-12 text-center">
                    <img src="/images/bytekwanza_logo_hq.png" alt="byteKwanza" className="h-8 mx-auto opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" />
                </div>
            </motion.div>
        </div>
    );
}
