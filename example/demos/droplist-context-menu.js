import { DropList } from '@danielgindi/selectbox';

export default function (stage) {
    const area = document.createElement('div');
    area.className = 'demo-area';
    area.textContent = 'Right-click anywhere in here';

    const note = document.createElement('span');
    note.className = 'demo-note';

    const menu = new DropList({});

    // Groups and nested menus work in a plain DropList too
    menu.setItems([
        { label: 'Edit', value: 'edit', _group: true },
        { label: 'Cut', value: 'cut', _child: true },
        { label: 'Copy', value: 'copy', _child: true },
        { label: 'Paste (clipboard is empty)', value: 'paste', _child: true, _nointeraction: true },
        { label: 'Arrange', value: 'arrange', _group: true },
        {
            label: 'Align',
            value: 'align',
            _child: true,
            _subitems: [
                { label: 'Left', value: 'align-left' },
                { label: 'Center', value: 'align-center' },
                { label: 'Right', value: 'align-right' },
            ],
        },
        {
            label: 'Order',
            value: 'order',
            _child: true,
            _subitems: [
                { label: 'Bring to front', value: 'front' },
                { label: 'Send to back', value: 'back' },
            ],
        },
    ]);

    area.addEventListener('contextmenu', (event) => {
        event.preventDefault();

        // No target element: the menu opens at the mouse, as if from a zero-size target
        menu.show({
            targetOffset: { left: event.pageX, top: event.pageY },
            targetWidth: 0,
            targetHeight: 0,
            anchor: { x: 'start', y: 'top' },
            position: { x: 'start', y: 'top' },
            // There's no element to read the direction from, so pass it
            targetRtl: getComputedStyle(area).direction === 'rtl',
        });
        menu.el.focus();
    });

    menu.on('select', ({ item }) => {
        note.textContent = `Ran "${item.label}"`;
        menu.hide();
    });

    // Picks inside nested menus are reported on the top menu as 'subitems:select'
    menu.on('subitems:select', ({ item }) => {
        note.textContent = `Ran "${item.label}" (from a nested menu)`;
        menu.hide();
    });

    menu.on('show_subitems', ({ item }) => {
        note.textContent = `Opened "${item.label}"…`;
    });

    menu.on('blur', () => menu.hide());

    stage.append(area, note);
}
