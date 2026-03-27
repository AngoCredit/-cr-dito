import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TermsModalProps {
    type: "termos_uso" | "politica_privacidade" | "contrato_credito";
    trigger: React.ReactNode;
    onAccept?: () => void;
}

export function TermsModal({ type, trigger, onAccept }: TermsModalProps) {
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");

    useEffect(() => {
        const fetchTerms = async () => {
            const { data } = await supabase
                .from("system_settings")
                .select("value")
                .eq("key", "contratos")
                .single();

            if (data?.value) {
                setContent(data.value[type] || "Conteúdo não disponível.");

                switch (type) {
                    case "termos_uso": setTitle("Termos e Condições de Uso"); break;
                    case "politica_privacidade": setTitle("Política de Privacidade"); break;
                    case "contrato_credito": setTitle("Contrato de Adesão ao Crédito"); break;
                }
            }
        };

        fetchTerms();
    }, [type]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2rem]">
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="font-display text-2xl font-bold text-primary">{title}</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                        Leia atentamente as nossas regras e normas
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                    <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-body pr-4 pb-8">
                        {content}
                    </div>
                </div>

                <div className="p-8 pt-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    <Button variant="ghost" className="rounded-xl font-bold text-slate-400" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                        Fechar
                    </Button>
                    {onAccept && (
                        <Button className="gradient-primary rounded-xl px-12 font-bold shadow-lg" onClick={onAccept}>
                            Compreendo e Aceito
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
