import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ThemeColors = {
    primary: string;
    accent: string;
    background: string;
};

type ThemeContextType = {
    colors: ThemeColors;
    updateColors: (newColors: ThemeColors) => Promise<void>;
    isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [colors, setColors] = useState<ThemeColors>({
        primary: "210 86% 29%",
        accent: "28 91% 54%",
        background: "210 20% 98%",
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('app_configuration')
                .select('value')
                .eq('key', 'theme_colors')
                .single();

            if (data && data.value) {
                const themeColors = data.value as ThemeColors;
                setColors(themeColors);
                applyTheme(themeColors);
            }
        } catch (err) {
            console.error("Error fetching theme settings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const applyTheme = (theme: ThemeColors) => {
        const root = document.documentElement;
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--accent", theme.accent);
        root.style.setProperty("--background", theme.background);
        root.style.setProperty("--ring", theme.primary);
    };

    const updateColors = async (newColors: ThemeColors) => {
        try {
            const { error } = await (supabase as any)
                .from('app_configuration')
                .upsert({
                    key: 'theme_colors',
                    value: newColors
                }, { onConflict: 'key' });

            if (error) throw error;
            setColors(newColors);
            applyTheme(newColors);
        } catch (err) {
            console.error("Error updating theme settings:", err);
            throw err;
        }
    };

    return (
        <ThemeContext.Provider value={{ colors, updateColors, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
