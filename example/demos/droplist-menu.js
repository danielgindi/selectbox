import { DropList } from '@danielgindi/selectbox';

export default function (stage) {
    const button = document.createElement('button');
    button.className = 'demo-button';
    button.textContent = 'Actions ▾';
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');

    // A DropList is the floating list on its own - use it for menus, popovers, pickers...
    const menu = new DropList({
        isHeaderVisible: true,
        isFooterVisible: true,
        positionOptionsProvider: () => ({
            target: button,
            anchor: { x: 'start', y: 'bottom' }, // this point of the button…
            position: { x: 'start', y: 'top' }, // …meets this point of the menu
            offset: { x: 0, y: 4 },
            updateWidth: 220,
        }),
        on: (name, data) => {
            if (name === 'show' || name === 'hide')
                button.setAttribute('aria-expanded', String(name === 'show'));

            if (name === 'select') {
                button.textContent = `${data.item.label} ▾`;
                menu.hide();
            }
        },
    });

    menu.setItems([
        { label: 'Duplicate', value: 'duplicate' },
        { label: 'Rename', value: 'rename' },
        { label: 'Share…', value: 'share' },
        { label: 'Archive', value: 'archive' },
        { label: 'Delete', value: 'delete' },
    ]);

    // Header and footer are plain elements - fill them with anything
    menu.getHeaderElement().textContent = 'File actions';
    menu.getFooterElement().textContent = 'Esc to close';

    button.addEventListener('click', () => {
        if (menu.isVisible()) {
            menu.hide();
        } else {
            menu.show();
            menu.el.focus(); // enables keyboard navigation
        }
    });

    stage.append(button);
}
