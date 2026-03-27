import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
    const location = useLocation();

    // Auth state managed via onAuthStateChange (no race condition)
    const [session, setSession] = useState<Session | null>(null);
    const [isSessionLoaded, setIsSessionLoaded] = useState(false);

    // Profile state
    const [profile, setProfile] = useState<{ role: string; must_change_password: boolean } | null>(null);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);

    // 1. Listen for auth state changes reliably
    useEffect(() => {
        // First, get the current session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            setIsSessionLoaded(true);
        });

        // Then listen for changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setIsSessionLoaded(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch profile when session is available
    useEffect(() => {
        if (!session?.user?.id) {
            setProfile(null);
            setIsProfileLoaded(isSessionLoaded); // Only mark loaded if session itself is loaded
            return;
        }

        setIsProfileLoaded(false);
        (supabase as any)
            .from("profiles")
            .select("role, must_change_password")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data, error }: any) => {
                if (error) {
                    console.error("Erro ao carregar perfil:", error);
                    setProfile(null);
                } else {
                    setProfile(data);
                }
                setIsProfileLoaded(true);
            });
    }, [session?.user?.id, isSessionLoaded]);

    const isLoading = !isSessionLoaded || (!!session && !isProfileLoaded);
    const isAuthenticated = !!session;
    const isAdmin = profile?.role === "admin" || profile?.role === "manager";
    const isMustChange = profile?.must_change_password || false;

    // Session Timeout Logic for Admins
    useEffect(() => {
        if (!isAdmin || !isAuthenticated) return;

        let sessionTimeout = 30; // default 30 mins

        const fetchSettings = async () => {
            try {
                const { data } = await (supabase as any).from('system_settings').select('value').eq('key', 'seguranca').single();
                if (data?.value?.expiracaoSessao) {
                    sessionTimeout = data.value.expiracaoSessao;
                }
            } catch (e) {
                console.error("Erro ao carregar configurações de segurança:", e);
            }
        };

        fetchSettings();

        const updateActivity = () => {
            localStorage.setItem('admin_last_activity', Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActivity = parseInt(localStorage.getItem('admin_last_activity') || Date.now().toString(), 10);
            if (Date.now() - lastActivity > sessionTimeout * 60 * 1000) {
                supabase.auth.signOut().then(() => {
                    localStorage.removeItem('admin_last_activity');
                    window.location.href = '/admin/login?expired=true';
                });
            }
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        updateActivity(); // init

        const interval = setInterval(checkInactivity, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            clearInterval(interval);
        };
    }, [isAdmin, isAuthenticated]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-slate-500 font-medium animate-pulse">Verificando credenciais...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirecionar para login de admin se for uma rota de admin
        const loginPath = requireAdmin ? "/admin/login" : "/login";
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    // Se tiver flag de troca de senha e não estiver já na página de troca
    if (isMustChange && !location.pathname.includes("setup-password")) {
        return <Navigate to="/setup-password" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
