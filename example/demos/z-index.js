import { DropList, SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const open = document.createElement('button');
    open.className = 'demo-button';
    open.textContent = 'Open dialog';

    const dialog = document.createElement('div');
    dialog.className = 'demo-dialog';
    // Above the list's default z-index (10000) - a list without a fix would hide behind it
    dialog.style.zIndex = '20000';
    dialog.hidden = true;

    const selectBox = new SelectBox({
        placeholder: 'Choose a size',
        items: [
            { label: 'Small', value: 's' },
            { label: 'Medium', value: 'm' },
            { label: 'Large', value: 'l' },
        ],
        listOptions: {
            // Resolved every time the list opens. `owner` is the SelectBox's element.
            // To apply this everywhere, set `DropListDefaultOptions.zIndex` instead.
            zIndex: ({ owner }) => {
                const container = owner?.closest('.demo-dialog');
                return container ? Number(container.style.zIndex) + 1 : null;
            },
        },
    });

    // A standalone DropList: `setZIndex()` takes the same values. Its `owner` is the target.
    const more = document.createElement('button');
    more.className = 'demo-button';
    more.textContent = 'More ▾';

    const menu = new DropList({
        positionOptionsProvider: () => ({ target: more }),
    });
    menu.setItems([
        { label: 'Duplicate', value: 'duplicate' },
        { label: 'Export', value: 'export' },
    ]);
    menu.setZIndex(({ owner }) => {
        const container = owner?.closest('.demo-dialog');
        return container ? Number(container.style.zIndex) + 1 : null;
    });
    menu.on('select', () => menu.hide());
    menu.on('blur', () => menu.hide());
    more.addEventListener('click', () => {
        menu.show();
        menu.el.focus();
    });

    // The z-index is resolved when a list opens. If the dialog moves to another layer
    // while a list is open, `updateZIndex()` resolves it again.
    // Click "Raise", then open a list within 3 seconds and watch it stay on top.
    const raise = document.createElement('button');
    raise.className = 'demo-button';
    raise.textContent = 'Raise the dialog in 3s';
    raise.addEventListener('click', () => {
        setTimeout(() => {
            dialog.style.zIndex = String(Number(dialog.style.zIndex) + 10000);
            dialog.firstChild.textContent = `A dialog with z-index ${dialog.style.zIndex}`;
            selectBox.droplistInstance.updateZIndex();
            menu.updateZIndex();
        }, 3000);
    });

    const close = document.createElement('button');
    close.className = 'demo-button';
    close.textContent = 'Close';

    const title = document.createElement('span');
    title.textContent = 'A dialog with z-index 20000';

    dialog.append(title, selectBox.el, more, raise, close);

    open.addEventListener('click', () => dialog.hidden = false);
    close.addEventListener('click', () => {
        selectBox.closeList();
        menu.hide();
        dialog.hidden = true;
    });

    stage.append(open, dialog);

    return selectBox;
}
