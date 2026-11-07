import { money, price, type Offer, type Row } from './lib/domain';
import { websiteOffers } from './lib/catalogPrices';

export function WebsitePriceSummary({ records, members, now }: { records: Row[]; members: boolean; now: number }) {
  const best = websiteOffers(records, members, now)[0];
  if (!best) return <span>No website price available</span>;
  const { row, amount, memberOnly, state } = best;
  return <span>{state === 'current' ? 'Website price from' : 'Last observed website price'} <strong>{money(amount)}</strong> · {row.retailer}
    <small>{memberOnly ? 'Membership required' : 'Standard price'}{(memberOnly ? row.member_promotion_text : row.promotion_text) ? ' · ' + (memberOnly ? row.member_promotion_text : row.promotion_text) : ''}</small>
    <small>{Number.isFinite(Date.parse(row.observed_at)) ? new Date(row.observed_at).toLocaleDateString('en-CA') : 'Date unavailable'}{state === 'old' ? ' · Older observation' : state === 'unconfirmed' ? ' · Latest price unconfirmed' : ''}</small>
  </span>;
}

export function BranchPriceSummary({ offer }: { offer?: Offer }) {
  if (!offer) return <span>No verified branch price available</span>;
  return <span>Verified branch price from <strong>{money(price(offer)!)}</strong> · {offer.store_name}
    <small>{offer.member_only ? 'Membership required' : 'Standard price'} · {new Date(offer.observed_at).toLocaleDateString('en-CA')}</small>
  </span>;
}
