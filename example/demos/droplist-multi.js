import { DropList } from '@danielgindi/selectbox';

const filters = [
    { label: 'Status', value: 'status', _group: true },
    { label: 'Open', value: 'open', _child: true },
    { label: 'In progress', value: 'in-progress', _child: true },
    { label: 'Done', value: 'done', _child: true },
    { label: 'Priority', value: 'priority', _group: true },
    { label: 'High', value: 'high', _child: true },
    { label: 'Medium', value: 'medium', _child: true },
    { label: 'Low', value: 'low', _child: true },
];

function button(label, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'demo-button';
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
}

export default function (stage) {
    const toggle = button('Filters ▾', () => {
        if (panel.isVisible()) {
            panel.hide();
        } else {
            panel.show();
            panel.el.querySelector('input').focus();
        }
    });

    const summary = document.createElement('span');
    summary.className = 'demo-note';

    const panel = new DropList({
        // Checkboxes instead of a single selection
        multi: true,
        // Checking a group checks all of its items (the default)
        autoCheckGroupChildren: true,
        searchable: true,
        searchPlaceholder: 'Find a filter',
        // Group headers aren't matched against the search, they're kept (`true`: they must match too)...
        filterGroups: false,
        // ...but a group left with no matching items is hidden. Search "hi": only Priority > High remains.
        filterEmptyGroups: true,
        isFooterVisible: true,
        positionOptionsProvider: () => ({
            target: toggle,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            offset: { x: 0, y: 4 },
            updateWidth: 240,
        }),
    });

    panel.setItems(filters);
    panel.setCheckedValues(['open', 'high']);

    const update = () => {
        // `true` leaves out the group items themselves
        const values = panel.getCheckedValues(true);
        summary.textContent = values.length ? `Showing: ${values.join(', ')}` : 'No filters';
    };

    // 'check' fires for each item; 'groupcheck' once for a whole group
    panel.on('check', update);
    panel.on('groupcheck', ({ item, affectedCount }) => {
        update();
        summary.textContent += ` (${item.label}: ${affectedCount} changed)`;
    });

    // Close when focus leaves the panel - unless it went to the toggle button, which closes it itself
    panel.on('blur', (event) => {
        if (event.relatedTarget !== toggle)
            panel.hide();
    });

    // The footer is a plain element: add your own buttons
    panel.getFooterElement().append(
        button('All', () => {
            panel.setCheckedValues(filters.map(filter => filter.value));
            update();
        }),
        button('None', () => {
            panel.setCheckedValues([]);
            update();
        }),
        button('Toggle "Done"', () => {
            panel.setItemChecked('done', !panel.getCheckedValues().includes('done'));
            update();
        }),
    );

    update();
    stage.append(toggle, summary);
}
