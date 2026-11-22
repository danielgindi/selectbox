import { DropList, ItemSymbol } from '@danielgindi/selectbox';

function button(label, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'demo-button';
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
}

export default function (stage) {
    let nextId = 1;
    const createTask = () => {
        const id = nextId++;
        return { label: `Task #${id}`, value: id };
    };

    const toggle = button('Show tasks ▾', () => {
        if (list.isVisible()) {
            list.hide();
        } else {
            list.show();
            list.el.focus(); // for the keyboard: arrows, typing to jump to an item, Escape
        }
    });

    const count = document.createElement('span');
    count.className = 'demo-note';

    const list = new DropList({
        // Virtualize from 50 items (default: 100)...
        virtualMinItems: 50,
        // ...with a row height estimate close to the real one, for a steady scrollbar
        estimatedItemHeight: 23,
        // Size the list from one measured row, instead of measuring every row
        estimateWidth: true,
        noResultsText: 'No tasks',
        // Close on a click or focus outside - except on the buttons next to it, which change the open list
        autoHide: true,
        autoHideIgnore: stage,
        positionOptionsProvider: () => ({
            target: toggle,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            offset: { x: 0, y: 4 },
        }),
    });

    list.addItems(Array.from({ length: 5 }, createTask));

    const changed = () => {
        count.textContent = `${list.itemCount()} tasks`;
        // Fit the open list to its new content
        list.relayout();
    };

    // Double-click a row to remove it. `ItemSymbol` leads from a row element to its item.
    list.el.addEventListener('dblclick', (event) => {
        const row = event.target.closest('li');
        const item = row?.[ItemSymbol]?.[ItemSymbol];
        if (!item)
            return;

        list.removeItem(item.value);
        changed();
    });

    stage.append(
        toggle,
        button('Add one', () => {
            list.addItem(createTask());
            changed();
        }),
        // A second argument inserts at an index
        button('Add 100 at the top', () => {
            list.addItems(Array.from({ length: 100 }, createTask), 0);
            changed();
        }),
        button('Mark first as done', () => {
            const first = list.itemAtIndex(0);
            if (first)
                list.updateItemByValue(first.value, { ...first, label: `✓ ${first.label}` });
            changed();
        }),
        button('Remove last', () => {
            const last = list.itemAtIndex(list.itemCount() - 1);
            if (last)
                list.removeItem(last.value);
            changed();
        }),
        button('Remove all', () => {
            list.removeAllItems();
            changed();
        }),
        count,
    );

    changed();
}
