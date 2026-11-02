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
    const selectBox = new SelectBox({
        multi: true,
        items: currencies,
        value: ['GBP', 'AUD'],
        // Sort the list alphabetically…
        sortListItems: true,
        // …with checked items first (multi mode)…
        sortListCheckedFirst: true,
        // …and "sticky" values always on top, in the list and in the chips.
        stickyValues: ['USD'],
        // Chips are sorted too (on by default); provide your own comparator if needed:
        // sortItemComparator: (a, b) => a.value.localeCompare(b.value),
    });

    stage.append(selectBox.el);

    return selectBox;
}
