import { FINENESS, GRAMS_PER_TROY_OUNCE } from './pricing';
import type { Config, Finish, Karat, MetalColor } from './types';

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (n: number) => usd0.format(n);
export const money2 = (n: number) => usd2.format(n);
export const grams = (g: number) => `${g < 10 ? g.toFixed(2) : g.toFixed(1)} g`;
export const ozt = (g: number) => `${(g / GRAMS_PER_TROY_OUNCE).toFixed(3)} ozt`;

export const COLOR_LABEL: Record<MetalColor, string> = { yellow: 'Yellow gold', rose: 'Rose gold', white: 'White gold' };
export const FINISH_LABEL: Record<Finish, string> = { polished: 'High polish', satin: 'Satin brushed', hammered: 'Hand hammered' };
export const KARAT_NOTE: Record<Karat, string> = {
  24: 'Fine gold, 99.99% pure. Soft and deeply yellow.',
  22: 'Traditional high karat, 91.6% gold. Rich colour, gentle wear.',
  18: 'The jeweller’s standard, 75% gold. Hard enough for daily wear.',
  14: '58.5% gold. The toughest choice for rings worn every day.',
};

export const hallmark = (k: Karat) => (k === 24 ? '999.9' : String(FINENESS[k]));

export function configSummary(c: Config): string {
  const parts = [`${c.karat}k ${COLOR_LABEL[c.color].toLowerCase()}`, FINISH_LABEL[c.finish].toLowerCase()];
  if (c.size) parts.push(`size ${c.size}`);
  if (c.engraving.trim()) parts.push(`engraved “${c.engraving.trim()}”`);
  return parts.join(' · ');
}

export function shortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
