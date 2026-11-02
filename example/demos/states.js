import { SelectBox } from '@danielgindi/selectbox';

const items = [
    { label: 'Draft', value: 'draft' },
    { label: 'In review', value: 'review' },
    { label: 'Published', value: 'published' },
];

export default function (stage) {
    const disabled = new SelectBox({ items, value: 'draft', disabled: true });

    const readOnly = new SelectBox({ items, value: 'review', readOnly: true });

    // Shows a spinner. The list will not open while loading with no items.
    const loading = new SelectBox({ items: [], placeholder: 'Loading…', isLoadingMode: true });

    stage.append(disabled.el, readOnly.el, loading.el);

    // All states can also be toggled at runtime:
    // selectBox.disable(true) / .enable() / .setReadOnly(true) / .setIsLoadingMode(true)
}
