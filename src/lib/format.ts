export const formatKz = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' Kz';
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-AO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const getReferralLevel = (count: number) => {
  if (count >= 50) return { name: 'Platina', bonus: 5, color: 'from-purple-400 to-purple-600' };
  if (count >= 30) return { name: 'Ouro', bonus: 4, color: 'from-yellow-400 to-yellow-600' };
  if (count >= 20) return { name: 'Prata', bonus: 3.5, color: 'from-gray-300 to-gray-500' };
  if (count >= 10) return { name: 'Bronze', bonus: 3, color: 'from-amber-600 to-amber-800' };
  return { name: 'Iniciante', bonus: 3, color: 'from-muted to-muted' };
};
