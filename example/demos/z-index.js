import { SelectBox } from '@danielgindi/selectbox';

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

    const close = document.createElement('button');
    close.className = 'demo-button';
    close.textContent = 'Close';

    dialog.append('A dialog with z-index 20000', selectBox.el, close);

    open.addEventListener('click', () => dialog.hidden = false);
    close.addEventListener('click', () => {
        selectBox.closeList();
        dialog.hidden = true;
    });

    stage.append(open, dialog);

    return selectBox;
}
