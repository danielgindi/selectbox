import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const items = Array.from({ length: 100_000 }, (_, i) => ({
        label: `Item #${(i + 1).toLocaleString()}`,
        value: i + 1,
    }));

    // Lists are virtualized automatically: only the visible rows exist in the DOM.
    // Opening, scrolling and searching stay fast even with 100,000 items.
    const selectBox = new SelectBox({
        items,
        value: 50_000,
        placeholder: 'Search 100,000 items',
    });

    stage.append(selectBox.el);

    return selectBox;
}
