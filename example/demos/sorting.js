import { SelectBox } from '@danielgindi/selectbox';

const currencies = [
    { label: 'Yen', value: 'JPY' },
    { label: 'Euro', value: 'EUR' },
    { label: 'Swiss Franc', value: 'CHF' },
    { label: 'Pound Sterling', value: 'GBP' },
    { label: 'Australian Dollar', value: 'AUD' },
    { label: 'US Dollar', value: 'USD' },
];

export default function (stage) {
    const byLabel = new SelectBox({
        multi: true,
        items: currencies,
        value: ['GBP', 'AUD'],
        // Sort the list alphabetically…
        sortListItems: true,
        // …with checked items first (multi mode)…
        sortListCheckedFirst: true,
        // …and "sticky" values always on top, in the list and in the chips.
        stickyValues: ['USD'],
        // Chips are sorted too (`sortSelectedItems`, on by default)
    });

    const byCode = new SelectBox({
        multi: true,
        items: currencies,
        value: ['GBP', 'AUD'],
        sortListItems: true,
        // Your own order, for the list and the chips: here, by currency code.
        // It replaces the default comparator, including its handling of `stickyValues`.
        sortItemComparator: (a, b) => a.value.localeCompare(b.value),
        // Chips stay in the order they were picked
        sortSelectedItems: false,
    });

    stage.append(byLabel.el, byCode.el);

    return byCode;
}
