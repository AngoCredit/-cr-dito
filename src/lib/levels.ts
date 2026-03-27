export interface Level {
    name: string;
    minScore: number;
    benefits: string[];
    bonus: string;
    creditMultiplier: number;
    interestDiscount: number; // Percentage discount on the base interest rate
}

export const LEVELS: Level[] = [
    {
        name: "Iniciante",
        minScore: 0,
        benefits: ["Acesso básico aos serviços"],
        bonus: "0%",
        creditMultiplier: 1.0,
        interestDiscount: 0
    },
    {
        name: "Bronze",
        minScore: 200,
        benefits: ["Crédito aumentado (1.2x)", "Desconto em taxas (5%)"],
        bonus: "3%",
        creditMultiplier: 1.2,
        interestDiscount: 0.05
    },
    {
        name: "Prata",
        minScore: 400,
        benefits: ["Crédito VIP (1.5x)", "Processamento instantâneo", "Desconto em taxas (10%)"],
        bonus: "3.5%",
        creditMultiplier: 1.5,
        interestDiscount: 0.10
    },
    {
        name: "Ouro",
        minScore: 600,
        benefits: ["Crédito Master (2.0x)", "Suporte prioritário", "Desconto em taxas (15%)"],
        bonus: "4%",
        creditMultiplier: 2.0,
        interestDiscount: 0.15
    },
    {
        name: "Platina",
        minScore: 800,
        benefits: ["Crédito Elite (2.5x)", "Acesso antecipado", "Desconto em taxas (20%)"],
        bonus: "5%",
        creditMultiplier: 2.5,
        interestDiscount: 0.20
    },
    {
        name: "Presidente",
        minScore: 1000,
        benefits: ["Crédito Ilimitado (3.0x)", "Atendimento VIP Personalizado", "Desconto em taxas (30%)"],
        bonus: "7%",
        creditMultiplier: 3.0,
        interestDiscount: 0.30
    }
];

export const getUserLevel = (score: number): Level => {
    return [...LEVELS].reverse().find(l => score >= l.minScore) || LEVELS[0];
};

export const getNextLevel = (score: number): Level | null => {
    return LEVELS.find(l => l.minScore > score) || null;
};

