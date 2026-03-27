/**
 * Sistema de Credit Scoring (+Kwanzas)
 * Calcula um score de 0 a 1000 baseado em 4 fatores ponderados.
 */

export interface ScoringData {
    paidLoans: number;
    delayedLoans: number;
    totalLoans: number;
    monthlySalary: number;
    requestedAmount: number;
    activeLoansCount: number;
    outstandingBalance: number;
    kycVerified: boolean;
    monthsSinceCreation: number;
}

export interface ScoreBreakdown {
    history: number;     // 40%
    income: number;      // 30%
    debt: number;        // 20%
    stability: number;   // 10%
    finalScore: number;
}

export type CreditDecision = 'APROVADO' | 'ANALISE_MANUAL' | 'REJEITADO';

/**
 * Calcula o score de crédito final e o breakdown por fator.
 */
export const calculateCreditScore = (data: ScoringData): ScoreBreakdown => {
    // 1. Histórico de Pagamento (400 pontos máx)
    let historyScore = 0;
    if (data.totalLoans > 0) {
        const successRate = data.paidLoans / data.totalLoans;
        historyScore = successRate * 800; // Base de 800 para quem tem histórico
        historyScore -= (data.delayedLoans * 150); // Penalização por atraso
    } else {
        historyScore = 500; // Neutro para novos utilizadores
    }
    historyScore = Math.max(0, Math.min(1000, historyScore));

    // 2. Rendimento e Capacidade (300 pontos máx)
    // Ratio de Prestação Estimada (assumindo 40% de taxa num empréstimo médio)
    const estimatedInstallment = data.requestedAmount * 1.4;
    const dti = data.monthlySalary > 0 ? (estimatedInstallment / data.monthlySalary) : 1;

    let incomeScore = 0;
    if (dti <= 0.3) incomeScore = 1000;
    else if (dti <= 0.5) incomeScore = 700;
    else if (dti <= 0.7) incomeScore = 400;
    else incomeScore = 100;

    if (data.monthlySalary === 0) incomeScore = 0;
    incomeScore = Math.max(0, Math.min(1000, incomeScore));

    // 3. Nível de Endividamento (200 pontos máx)
    let debtScore = 1000;
    debtScore -= (data.activeLoansCount * 300);
    if (data.monthlySalary > 0) {
        const debtRatio = data.outstandingBalance / data.monthlySalary;
        debtScore -= (debtRatio * 200);
    }
    debtScore = Math.max(0, Math.min(1000, debtScore));

    // 4. Estabilidade (100 pontos máx)
    let stabilityScore = 0;
    if (data.kycVerified) stabilityScore += 600;
    stabilityScore += Math.min(400, data.monthsSinceCreation * 50);
    stabilityScore = Math.max(0, Math.min(1000, stabilityScore));

    // Cálculo Final Ponderado
    const finalScore = Math.round(
        (historyScore * 0.40) +
        (incomeScore * 0.30) +
        (debtScore * 0.20) +
        (stabilityScore * 0.10)
    );

    return {
        history: Math.round(historyScore),
        income: Math.round(incomeScore),
        debt: Math.round(debtScore),
        stability: Math.round(stabilityScore),
        finalScore: Math.max(0, Math.min(1000, finalScore))
    };
};

/**
 * Retorna a decisão baseada no score.
 */
export const getCreditDecision = (score: number): CreditDecision => {
    if (score >= 750) return 'APROVADO';
    if (score >= 600) return 'ANALISE_MANUAL';
    return 'REJEITADO';
};

/**
 * Retorna descrição da decisão para o utilizador/admin.
 */
export const getDecisionLabel = (decision: CreditDecision): string => {
    switch (decision) {
        case 'APROVADO': return 'Crédito Pré-Aprovado (Baixo Risco)';
        case 'ANALISE_MANUAL': return 'Necessita Análise Humana (Médio Risco)';
        case 'REJEITADO': return 'Crédito Recusado (Alto Risco)';
    }
};
