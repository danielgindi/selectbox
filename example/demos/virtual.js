import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const items = Array.from({ length: 100_000 }, (_, i) => ({
        label: `Item #${(i + 1).toLocaleString()}`,
        value: i + 1,
    }));

    const counter = document.createElement('span');
    counter.className = 'demo-note';

    // Count the rows that exist right now: a row is rendered when it scrolls into view,
    // and unrendered (to be reused) when it scrolls out
    const rows = new Set();
    const showCount = () => counter.textContent = `Rows in the DOM: ${rows.size}`;

    // Lists are virtualized automatically: only the visible rows exist in the DOM.
    // Opening, scrolling and searching stay fast even with 100,000 items.
    const selectBox = new SelectBox({
        items,
        value: 50_000,
        placeholder: 'Search 100,000 items',
        listOptions: {
            renderItem: (item, itemEl) => {
                rows.add(itemEl);
                showCount();
                return false; // keep the default rendering
            },
            // Clean up whatever `renderItem` set up - here, just the count
            unrenderItem: (item, itemEl) => {
                rows.delete(itemEl);
                showCount();
            },
        },
    });

    showCount();
    stage.append(selectBox.el, counter);

    return selectBox;
}
