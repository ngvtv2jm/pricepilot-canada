import { useState } from 'react';
import { variantChoices, VARIANT_CHOICE_LIMIT, type VariantChoice } from './lib/variantChoices';

export default function VariantPicker({ number, choices, value, onChange }: {
  number: number; choices: VariantChoice[]; value: string; onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const { options, total, searching } = variantChoices(choices, query, value);
  const hintId = 'variant-hint-' + number;
  return <article className="panel variant-picker">
    <h2>Product {number}</h2>
    <label>Search products or brands
      <input type="search" aria-label={'Search products or brands for Product ' + number} value={query}
        onChange={event => setQuery(event.target.value)} maxLength={160}
        placeholder="e.g. milk 2 L" aria-describedby={hintId}/>
    </label>
    <p id={hintId} className="note" role="status">
      {!searching ? 'Type at least 2 letters or numbers to find an exact package.' :
        !total ? 'No variants match. Try another search or change the filters.' :
        total > VARIANT_CHOICE_LIMIT ? `${total} matches. Showing the first ${VARIANT_CHOICE_LIMIT}; narrow your search to see others.` :
        `${total} matching ${total === 1 ? 'variant' : 'variants'}.`}
      {value && ' Your current choice stays available below.'}
    </p>
    <label>Choose an exact package
      <select aria-label={'Choose an exact package for Product ' + number} value={value} aria-describedby={hintId}
        onChange={event => onChange(event.target.value)}>
        <option value="">{searching ? 'Choose a variant' : 'Search above to find a variant'}</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
    {value && <button type="button" className="link" onClick={() => onChange('')}>Clear Product {number}</button>}
  </article>;
}
