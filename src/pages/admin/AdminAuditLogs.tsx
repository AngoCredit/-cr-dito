import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Activity, ShieldAlert, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('admin_audit_logs')
                .select('*, admin:admin_id(email)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar registos de auditoria.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto pb-10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-800 transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-2xl font-bold text-slate-900 font-display">Registos de Auditoria</h1>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 ml-9">Histórico de ações e eventos do sistema.</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Atualizar
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-sm font-medium">A carregar registos...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm font-medium text-slate-500">Nenhum registo encontrado.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-3xl">Data / Hora</th>
                                        <th className="px-6 py-4">Administrador</th>
                                        <th className="px-6 py-4">Ação</th>
                                        <th className="px-6 py-4">Entidade</th>
                                        <th className="px-6 py-4 rounded-tr-3xl">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-800">
                                                    {format(new Date(log.created_at), "dd MMM yyyy")}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {format(new Date(log.created_at), "HH:mm:ss")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">
                                                    {log.admin?.email || 'Sistema'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {log.entity} {log.entity_id ? `(#${log.entity_id})` : ''}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                                {log.details ? JSON.stringify(log.details) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
