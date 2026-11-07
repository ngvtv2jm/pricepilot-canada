export type VariantChoice = { id: string; label: string; searchText: string };
export const VARIANT_CHOICE_LIMIT = 20;

const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function variantChoices(choices: VariantChoice[], query: string, selectedId = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const searching = terms.join('').length >= 2;
  const matches = searching ? choices.filter(choice => {
    const text = normalize(choice.searchText);
    return terms.every(term => text.includes(term));
  }) : [];
  const options = matches.slice(0, VARIANT_CHOICE_LIMIT);
  const selected = choices.find(choice => choice.id === selectedId);
  if (selected && !options.some(choice => choice.id === selected.id)) options.unshift(selected);
  return { options, total: matches.length, searching };
}

export function sourceLicenseText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/^[\s.·]+|[\s.·]+$/g, '') : '';
}
