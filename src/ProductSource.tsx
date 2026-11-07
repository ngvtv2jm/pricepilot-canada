import { safeUrl } from './lib/domain';
import { sourceLicenseText } from './lib/variantChoices';

export default function ProductSource({ provider, url, license }: { provider: string; url: unknown; license: unknown }) {
  const detail = sourceLicenseText(license);
  return <p className="notice product-source"><span>Product data: <a href={safeUrl(url)} target="_blank" rel="noreferrer">{provider}</a>
    {detail && <> · {detail}</>}. Verify the exact package and local availability with the retailer.</span></p>;
}
