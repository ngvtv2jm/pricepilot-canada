import { money, safeUrl, type Row } from './lib/domain';
import { cadAmount, websiteState } from './lib/catalogPrices';

export function ResearchPrices({ records, members, now }: { records: Row[]; members: boolean; now: number }) {
  if (!records.length) return null;
  return <section className="panel">
    <h2>Retailer website prices</h2>
    <p>These are dated website observations for this package. Confirm branch prices and stock with the retailer before shopping.</p>
    <div className="table-scroll"><table>
      <thead><tr><th>Retailer</th><th>CAD price</th><th>Conditions</th><th>Observed</th><th>Scope</th></tr></thead>
      <tbody>{records.map(row => {
        const standard = cadAmount(row.price_cad);
        const member = members ? cadAmount(row.member_price_cad) : null;
        const state = websiteState(row, now);
        const url = safeUrl(row.product_url);
        return <tr key={row.id}>
          <td>{url ? <a href={url} target="_blank" rel="noreferrer">{row.retailer} · View product</a> : row.retailer}</td>
          <td><strong>{standard === null ? 'Standard price unavailable' : money(standard)}</strong>{member !== null && <small>Member: {money(member)}</small>}</td>
          <td>{row.promotion_text || 'No promotion recorded'}{member !== null && <small>{row.member_promotion_text || 'Membership required'}</small>}</td>
          <td>{Number.isFinite(Date.parse(row.observed_at)) ? new Date(row.observed_at).toLocaleString('en-CA') : 'Date unavailable'}
            {state === 'unconfirmed' && <small>Latest price unconfirmed. Last successful observation shown when available.</small>}
            {state === 'old' && <small>Older observation. Recheck with retailer.</small>}</td>
          <td>{row.store_scope || 'Retailer website'}<small>Branch price and stock not verified</small></td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}
