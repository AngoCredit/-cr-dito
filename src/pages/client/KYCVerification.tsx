import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Upload,
    Camera,
    FileText,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Home,
    MapPin,
    Users2,
    MessageSquare,
    Smartphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CameraModal } from "@/components/client/CameraModal";
import { User } from "lucide-react";

const allSteps = [
    { id: 1, title: "Identificação", icon: User },
    { id: 2, title: "Documentação", icon: FileText, key: 'bi' },
    { id: 3, title: "Validação Facial", icon: Camera, key: 'selfie' },
    { id: 4, title: "Residência", icon: Home, key: 'recibo_salario' },
    { id: 5, title: "Segurança", icon: ShieldCheck, key: 'security' },
];



export default function KYCVerification() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [settings, setSettings] = useState<any>({
        aprovacaoAutomatica: false,
        apenasReferencia: true,
        minContactos: "2",
        docsObrigatorios: ["bi_frente", "bi_verso", "selfie", "recibo_salario"],
        solicitarGPS: true,
        solicitarContactos: true,
        solicitarSMS: true
    });

    const [formData, setFormData] = useState({
        fullName: "",
        biNumber: "",
        biFront: null as File | null,
        biBack: null as File | null,
        selfie: null as File | null,
        addressProof: null as File | null,
        salaryReceipt: null as File | null,
        location: null as { lat: number, lng: number } | null,
        contacts: [] as any[],
        phoneNumber: "",
        isPhoneVerified: false,
        smsCodeSent: false,
        verificationCode: "",
    });

    const availableSteps = useMemo(() => {
        if (!settings) return allSteps;
        return allSteps.filter(step => {
            if (step.id === 1) return true;
            if (step.key === 'bi') return settings.docsObrigatorios?.includes('bi_frente') || settings.docsObrigatorios?.includes('bi_verso');
            if (step.key === 'selfie') return settings.docsObrigatorios?.includes('selfie');
            if (step.key === 'recibo_salario') return settings.docsObrigatorios?.includes('recibo_salario');
            if (step.key === 'security') return settings.solicitarGPS || settings.solicitarContactos || settings.solicitarSMS;
            return true;
        });
    }, [settings]);

    useEffect(() => {
        fetchProfile();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await (supabase as any)
            .from('system_settings')
            .select('value')
            .eq('key', 'utilizadores')
            .single();
        if (data) setSettings(data.value);
    };

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            setProfile(data);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    fullName: data.nome || "",
                    biNumber: data.bi || ""
                }));
            }
        }
    };

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

    const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`Ficheiro demasiado grande. Máximo permitido: 5MB`);
                e.target.value = '';
                return;
            }
            if (!ACCEPTED_TYPES.includes(file.type)) {
                toast.error(`Formato não suportado. Use imagens (JPG, PNG) ou PDF.`);
                e.target.value = '';
                return;
            }
            setFormData({ ...formData, [field]: file });
        }
    };

    const isPdf = (file: File | null) => file?.type === 'application/pdf';
    const fileLabel = (file: File | null) => {
        if (!file) return '';
        return isPdf(file) ? `📄 ${file.name}` : file.name;
    };

    const uploadFile = async (file: File, path: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const ext = file.name.split('.').pop() || 'bin';
        const fileName = `${user?.id}/${path}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage
            .from('kyc-documents')
            .upload(fileName, file, { contentType: file.type });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sessão expirada. Entre novamente.");
            if (!profile) throw new Error("Dados do perfil não encontrados. Reinicie a página.");

            // Upload files
            const [biFrontUrl, biBackUrl, selfieUrl, addressUrl, salaryReceiptUrl] = await Promise.all([
                formData.biFront ? uploadFile(formData.biFront, 'bi_front') : null,
                formData.biBack ? uploadFile(formData.biBack, 'bi_back') : null,
                formData.selfie ? uploadFile(formData.selfie, 'selfie') : null,
                formData.addressProof ? uploadFile(formData.addressProof, 'address') : null,
                formData.salaryReceipt ? uploadFile(formData.salaryReceipt, 'salary_receipt') : null,
            ]);

            // Save to kyc_submissions
            const { error: submitError } = await (supabase as any)
                .from('kyc_submissions')
                .upsert({
                    user_id: profile.id,
                    full_name: formData.fullName,
                    bi_number: formData.biNumber,
                    bi_front_url: biFrontUrl,
                    bi_back_url: biBackUrl,
                    selfie_url: selfieUrl,
                    address_proof_url: addressUrl,
                    salary_receipt_url: salaryReceiptUrl,
                    location: formData.location,
                    contacts: formData.contacts,
                    phone_number: formData.phoneNumber,
                    phone_verified: formData.isPhoneVerified,
                    status: 'pending'
                }, { onConflict: 'user_id' });

            if (submitError) throw submitError;

            // Update profile status and basic info
            const { error: profileError } = await (supabase as any)
                .from('profiles')
                .update({
                    kyc_status: 'pending' as any,
                    nome: formData.fullName,
                    bi: formData.biNumber
                })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            toast.success("Documentação enviada com sucesso! Aguarde a verificação.");
            navigate("/app");
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro ao enviar documentação: ${error.message || "Tente novamente."}`);
        } finally {
            setIsLoading(false);
        }
    };

    const requestLocation = () => {
        setIsLoading(true);
        if (!navigator.geolocation) {
            toast.error("Geolocalização não é suportada por este navegador.");
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                }));
                toast.success("Localização capturada com sucesso!");
                setIsLoading(false);
            },
            (error) => {
                console.error(error);
                toast.error("Erro ao obter localização. Certifique-se de que deu permissão.");
                setIsLoading(false);
            }
        );
    };

    const requestContacts = async () => {
        setIsLoading(true);
        try {
            // Contacts Picker API is experimental and only supported on some mobile browsers
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
                const contacts = await (navigator as any).contacts.select(props, opts);
                setFormData(prev => ({ ...prev, contacts }));
                toast.success(`${contacts.length} contactos sincronizados!`);
            } else {
                // Fallback for desktop/unsupported browsers
                toast.info("A sincronização de contactos é otimizada para dispositivos móveis Chrome/Android.");
                // Simulating discovery to show UI
                setFormData(prev => ({ ...prev, contacts: [{ name: "Referência 1", tel: "9xx xxx xxx" }] }));
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao aceder aos contactos.");
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        const currentIndex = availableSteps.findIndex(s => s.id === currentStep);
        if (currentIndex < availableSteps.length - 1) {
            setCurrentStep(availableSteps[currentIndex + 1].id);
        }
    };

    const prevStep = () => {
        const currentIndex = availableSteps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(availableSteps[currentIndex - 1].id);
        } else {
            navigate("/app");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 flex items-center justify-center">
            <div className="max-w-2xl w-full">
                {/* Progress Stepper */}
                <div className="mb-10">
                    <div className="flex justify-between items-center relative gap-2">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                        {availableSteps.map((step) => {
                            const Icon = step.icon;
                            const isCompleted = currentStep > step.id;
                            const isActive = currentStep === step.id;
                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-success border-success text-white" :
                                        isActive ? "bg-white border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                                            "bg-white border-slate-200 text-slate-300"
                                        }`}>
                                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider text-center ${isActive ? "text-primary" : "text-slate-400"}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-[2.5rem] shadow-card border border-slate-100 overflow-hidden min-h-[500px] flex flex-col relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/app")}
                        className="absolute top-6 right-6 rounded-full hover:bg-slate-100 text-slate-400"
                        title="Voltar ao Painel"
                    >
                        <Home className="w-5 h-5" />
                    </Button>
                    <div className="p-10 flex-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Dados de Identificação</h2>
                                            <p className="text-slate-500 text-sm mt-2">Confirme os seus dados conforme constam no Bilhete de Identidade.</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</Label>
                                                <Input
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="h-12 rounded-xl bg-slate-50 border-slate-100"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Número do BI</Label>
                                                <Input
                                                    value={formData.biNumber}
                                                    onChange={(e) => setFormData({ ...formData, biNumber: e.target.value })}
                                                    className="h-12 rounded-xl bg-slate-50 border-slate-100"
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                                            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                Os seus dados estão protegidos por criptografia de ponta e serão utilizados apenas para fins de verificação financeira.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Cópia do Documento</h2>
                                            <p className="text-slate-500 text-sm mt-2">Carregue fotos ou PDF nítidos da frente e do verso do seu BI. <span className="text-xs text-slate-400">(Máx. 5MB)</span></p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Frente do BI</Label>
                                                <div className="relative group h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => handleFileChange('biFront', e)}
                                                    />
                                                    {formData.biFront ? (
                                                        <div className="flex flex-col items-center text-success">
                                                            {isPdf(formData.biFront) ? <FileText className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                                                            <span className="text-[10px] mt-2 font-bold uppercase truncate max-w-[120px]">{fileLabel(formData.biFront)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-400">
                                                            <Upload className="w-8 h-8 mb-2 group-hover:text-primary" />
                                                            <span className="text-[10px] font-bold uppercase">Upload Frente</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase">Verso do BI</Label>
                                                <div className="relative group h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-primary/40 hover:bg-primary/[0.02]">
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => handleFileChange('biBack', e)}
                                                    />
                                                    {formData.biBack ? (
                                                        <div className="flex flex-col items-center text-success">
                                                            {isPdf(formData.biBack) ? <FileText className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                                                            <span className="text-[10px] mt-2 font-bold uppercase truncate max-w-[120px]">{fileLabel(formData.biBack)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-400">
                                                            <Upload className="w-8 h-8 mb-2 group-hover:text-primary" />
                                                            <span className="text-[10px] font-bold uppercase">Upload Verso</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Validação Facial</h2>
                                            <p className="text-slate-500 text-sm mt-2">Tire uma selfie segurando o seu bilhete de identidade para confirmarmos que é você.</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <CameraModal
                                                onCapture={(file) => setFormData(prev => ({ ...prev, selfie: file as File }))}
                                                trigger={
                                                    <div className="relative w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-primary/40 cursor-pointer shadow-sm hover:shadow-md">
                                                        {formData.selfie ? (
                                                            <div className="flex flex-col items-center text-success animate-in zoom-in-50 duration-300">
                                                                <CheckCircle2 className="w-12 h-12" />
                                                                <span className="text-xs mt-3 font-bold uppercase tracking-widest">{formData.selfie.name}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center text-slate-400 group-hover:text-primary transition-colors">
                                                                <Camera className="w-12 h-12 mb-3" />
                                                                <p className="text-xs font-bold uppercase tracking-widest">Capturar Selfie em Tempo Real</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                            />
                                            <div className="mt-6 flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                <div className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Iluminação boa</div>
                                                <div className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Rosto visível</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Documentos Financeiros</h2>
                                            <p className="text-slate-500 text-sm mt-2">Carregue os comprovativos necessários. <span className="text-xs text-slate-400">(Imagem ou PDF, máx. 5MB)</span></p>
                                        </div>

                                        {/* Address Proof */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Comprovativo de Morada (Recibo de água, luz, internet)</Label>
                                            <div className="relative w-full h-36 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-primary/40">
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => handleFileChange('addressProof', e)}
                                                />
                                                {formData.addressProof ? (
                                                    <div className="flex flex-col items-center text-success">
                                                        {isPdf(formData.addressProof) ? <FileText className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                                                        <span className="text-[10px] mt-2 font-bold uppercase">{fileLabel(formData.addressProof)}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-400">
                                                        <Home className="w-10 h-10 mb-2" />
                                                        <p className="text-xs font-bold uppercase">Upload do Comprovativo</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Salary Receipt */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Último Recibo Salarial</Label>
                                            <div className="relative w-full h-36 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-primary/40">
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => handleFileChange('salaryReceipt', e)}
                                                />
                                                {formData.salaryReceipt ? (
                                                    <div className="flex flex-col items-center text-success">
                                                        {isPdf(formData.salaryReceipt) ? <FileText className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                                                        <span className="text-[10px] mt-2 font-bold uppercase">{fileLabel(formData.salaryReceipt)}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-400">
                                                        <Upload className="w-10 h-10 mb-2" />
                                                        <p className="text-xs font-bold uppercase">Upload do Recibo Salarial</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h2 className="text-2xl font-bold font-display text-slate-800">Segurança Avançada</h2>
                                            <p className="text-slate-500 text-sm mt-2">Para sua segurança, solicitamos acesso a estas permissões para validar a autenticidade do seu perfil.</p>
                                        </div>

                                        <div className="space-y-4">
                                            {settings?.solicitarGPS && (
                                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${formData.location ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                                            <MapPin className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">Localização GPS</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">Confirmação de residência em tempo real</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant={formData.location ? "ghost" : "outline"}
                                                        size="sm"
                                                        onClick={requestLocation}
                                                        className={`rounded-lg font-bold text-[10px] uppercase tracking-wider ${formData.location ? 'text-success hover:bg-success/5' : ''}`}
                                                    >
                                                        {formData.location ? 'Capturado ✓' : 'Permitir'}
                                                    </Button>
                                                </div>
                                            )}

                                            {settings?.solicitarContactos && (
                                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${formData.contacts.length > 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                                            <Users2 className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">Sincronizar Contactos</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">Apenas para validação de referências</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant={formData.contacts.length > 0 ? "ghost" : "outline"}
                                                        size="sm"
                                                        onClick={requestContacts}
                                                        className={`rounded-lg font-bold text-[10px] uppercase tracking-wider ${formData.contacts.length > 0 ? 'text-success hover:bg-success/5' : ''}`}
                                                    >
                                                        {formData.contacts.length > 0 ? 'Sincronizado ✓' : 'Sincronizar'}
                                                    </Button>
                                                </div>
                                            )}

                                            {settings?.solicitarSMS && (
                                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 group hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${formData.isPhoneVerified ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                                            <Smartphone className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">Verificação de SMS</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">Validação do número de telemóvel</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex gap-2">
                                                            <Input
                                                                placeholder="Nº de Telemóvel"
                                                                value={formData.phoneNumber}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                                                className="h-10 rounded-xl bg-white border-slate-100 text-xs font-bold"
                                                                disabled={formData.isPhoneVerified || formData.smsCodeSent}
                                                            />
                                                            {!formData.smsCodeSent && !formData.isPhoneVerified && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (formData.phoneNumber.length < 9) {
                                                                            toast.error("Insira um número válido");
                                                                            return;
                                                                        }
                                                                        setFormData(prev => ({ ...prev, smsCodeSent: true }));
                                                                        toast.info("Modo Simulação: Use o código 1234");
                                                                    }}
                                                                    disabled={!formData.phoneNumber}
                                                                    className="rounded-xl px-4 font-bold text-xs gradient-primary text-white"
                                                                >
                                                                    Verificar
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {formData.smsCodeSent && !formData.isPhoneVerified && (
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
                                                                        placeholder="Código de 4 dígitos"
                                                                        value={formData.verificationCode}
                                                                        onChange={(e) => setFormData(prev => ({ ...prev, verificationCode: e.target.value }))}
                                                                        className="h-10 rounded-xl bg-white border-slate-100 text-center text-sm font-bold tracking-[0.5em]"
                                                                        maxLength={4}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            if (formData.verificationCode === "1234") {
                                                                                setFormData(prev => ({ ...prev, isPhoneVerified: true, smsCodeSent: false }));
                                                                                toast.success("Telemóvel verificado com sucesso!");
                                                                            } else {
                                                                                toast.error("Código incorreto. Tente 1234");
                                                                            }
                                                                        }}
                                                                        className="rounded-xl px-4 font-bold text-xs bg-success text-white hover:bg-success/90"
                                                                    >
                                                                        Confirmar
                                                                    </Button>
                                                                </div>
                                                                <button
                                                                    onClick={() => setFormData(prev => ({ ...prev, smsCodeSent: false, verificationCode: "" }))}
                                                                    className="text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-tight"
                                                                >
                                                                    Alterar número
                                                                </button>
                                                            </motion.div>
                                                        )}

                                                        {formData.isPhoneVerified && (
                                                            <div className="flex items-center gap-2 text-success font-bold text-xs bg-success/5 p-2 rounded-lg border border-success/20">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Número Verificado
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={currentStep === 1 ? () => navigate("/app") : prevStep}
                            disabled={isLoading}
                            className="rounded-xl h-12 px-6 gap-2 text-slate-500 hover:text-slate-800"
                        >
                            <ArrowLeft className="w-4 h-4" /> {currentStep === 1 ? "Sair da Verificação" : "Voltar"}
                        </Button>

                        {currentStep < availableSteps[availableSteps.length - 1]?.id ? (
                            <Button
                                onClick={nextStep}
                                disabled={
                                    (currentStep === 1 && (!formData.fullName || !formData.biNumber)) ||
                                    (currentStep === 2 && (!formData.biFront || !formData.biBack)) ||
                                    (currentStep === 3 && !formData.selfie) ||
                                    (currentStep === 4 && !formData.addressProof)
                                }
                                className="gradient-primary text-white rounded-xl h-12 px-8 font-bold gap-2"
                            >
                                Próximo <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={
                                    (settings?.solicitarGPS && !formData.location) ||
                                    (settings?.solicitarSMS && !formData.isPhoneVerified) ||
                                    isLoading
                                }
                                className="gradient-primary text-white rounded-xl h-12 px-10 font-bold gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                Finalizar Verificação
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
