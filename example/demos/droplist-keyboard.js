import { DropList } from '@danielgindi/selectbox';

const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL', '7XL']
    .map(size => ({ label: size, value: size }));

function button(label, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'demo-button';
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
}

export default function (stage) {
    const toggle = button('Size ▾', () => {
        if (list.isVisible()) {
            list.hide();
        } else {
            list.show();
            list.el.focus();
        }
    });

    const log = document.createElement('ol');
    log.className = 'event-log';

    const list = new DropList({
        // Keep the highlighted item when focus moves away (to the remote below).
        // By default it's cleared `autoItemBlurDelay` ms (300) after the list loses focus.
        autoItemBlur: false,
        // Close on a click or focus outside - except on the remote, which works on the open list
        autoHide: true,
        autoHideIgnore: () => remote,
        // Your own keys first. Return true to skip the default handling of that key.
        keyDownHandler: (event) => {
            if (event.key === 'Delete' && list.hasFocusedItem()) {
                const item = list.filteredItemAtIndex(list.getFocusedItemIndex());
                list.removeItem(item.value);
                list.relayout();
                return true;
            }
        },
        positionOptionsProvider: () => ({
            target: toggle,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            offset: { x: 0, y: 4 },
            updateWidth: 120,
        }),
    });

    list.setItems(sizes);

    list.on('*', (name, data) => {
        const entry = document.createElement('li');
        entry.textContent = data?.value !== undefined ? `${name} → ${data.value}` : name;
        log.append(entry);
        log.scrollTop = log.scrollHeight;
    });

    list.on('select', ({ value }) => {
        toggle.textContent = `Size: ${value} ▾`;
        list.setSingleSelectedItemByValue(value);
    });

    // A remote control: the same moves the keyboard makes, from code
    const remote = document.createElement('div');
    remote.className = 'demo-buttons';
    remote.append(
        button('First', event => list.goToFirst(event)),
        button('Previous', event => list.previous(event)),
        button('Next', event => list.next(event)),
        button('Page down', event => list.nextPage(event)),
        button('Last', event => list.goToLast(event)),
        button('Focus "XL"', () => {
            list.setFocusedItemByValue('XL');
            list.scrollItemIndexIntoView(list.itemIndexByValue('XL'));
        }),
        button('Pick highlighted', (event) => {
            if (list.hasFocusedItem())
                list.triggerItemSelection(null, event);
        }),
    );

    stage.append(toggle, remote, log);
}
