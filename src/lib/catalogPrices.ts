import { current, price, type Offer, type Row } from './domain.ts';

const websiteMaxAge = 48 * 3600000;

export function packageLabel(variant: Row | undefined, observations: Row[] = []): string {
  if (!variant) return 'Package unavailable';
  const observedLabels = [...new Set(observations.map(r => String(r.package_size ?? '').trim()).filter(Boolean))];
  const name = String(variant.name ?? '').trim();
  // Preserve the exact source label, including multipack count and dimensions.
  if (observedLabels.length === 1) return observedLabels[0];
  if (variant.discovered && name) return name;
  const unit = String(variant.unit ?? '').trim();
  const quantity = Number(variant.quantity);
  if (unit && Number.isFinite(quantity) && quantity > 0) {
    const size = quantity + ' ' + unit;
    if (!name || name.toLowerCase() === size.toLowerCase() || name.toLowerCase() === 'default') return size;
    return name + ' · ' + size;
  }
  return name && name.toLowerCase() !== 'default' ? name : 'Package unavailable';
}

export function cadAmount(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function websiteState(row: Row, now: number): 'current' | 'old' | 'unconfirmed' {
  const observed = Date.parse(row.observed_at);
  if (!Number.isFinite(observed) || observed > now || (row.check_status && row.check_status !== 'verified')) return 'unconfirmed';
  return observed <= now - websiteMaxAge ? 'old' : 'current';
}

export function websiteOffers(rows: Row[], members: boolean, now: number) {
  return rows.flatMap(row => {
    const standard = cadAmount(row.price_cad);
    const member = members ? cadAmount(row.member_price_cad) : null;
    const memberOnly = member !== null && (standard === null || member < standard);
    const amount = memberOnly ? member : standard;
    return amount === null ? [] : [{ row, amount, memberOnly, state: websiteState(row, now) }];
  }).sort((a, b) => Number(b.state === 'current') - Number(a.state === 'current') || a.amount - b.amount);
}

export function branchOffers(offers: Offer[], retailer: string, branch: string, now: number, members: boolean) {
  return offers.filter(offer => (!branch || offer.store_id === branch) &&
    (!retailer || offer.retailer_name === retailer) && current(offer, now, members))
    .sort((a, b) => price(a)! - price(b)!);
}

export function eligibleVariants(variants: Row[], observations: Row[], offers: Offer[], retailer: string, branch: string) {
  if (branch) {
    const offered = new Set(offers.map(offer => offer.variant_id));
    return variants.filter(variant => offered.has(variant.id));
  }
  if (retailer) {
    const listed = new Set(observations.filter(row => row.retailer === retailer).map(row => row.variant_id));
    return variants.filter(variant => listed.has(variant.id));
  }
  return variants;
}

export function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const group = grouped.get(id);
    if (group) group.push(row);
    else grouped.set(id, [row]);
  }
  return grouped;
}
