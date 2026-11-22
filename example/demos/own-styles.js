import { DropList } from '@danielgindi/selectbox';

// With a different `baseClassName`, none of the bundled styles apply - bring your own.
// Elements get `<base>_wrapper`, `<base>__item`, `<base>__item_focus`, `<base>__item_selected`...
// (Usually this lives in your stylesheet.)
const css = `
.pill-menu_wrapper {
    z-index: 10000;
    padding: 6px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 8px 24px rgb(16 24 40 / 18%);
}
.pill-menu_wrapper ul {
    max-height: 220px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
}
.pill-menu__item {
    padding: 4px 14px;
    border-radius: 999px;
    color: #1d2129;
    white-space: nowrap;
    cursor: pointer;
}
.pill-menu__item_focus { background: #ededfc; }
.pill-menu__item_selected { background: #5b5bd6; color: #fff; }
`;

export default function (stage) {
    if (!document.getElementById('pill-menu-styles')) {
        const style = document.createElement('style');
        style.id = 'pill-menu-styles';
        style.textContent = css;
        document.head.append(style);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-button';
    button.textContent = 'Reaction ▾';

    const menu = new DropList({
        baseClassName: 'pill-menu',
        // Close on a click or focus outside (the button doesn't count)
        autoHide: true,
        // Typing jumps to the item starting with what's typed: match the words, skipping the emoji
        typeAheadTextFn: item => item.label.replace(/^\P{L}+/u, ''),
        positionOptionsProvider: () => ({
            target: button,
            anchor: { x: 'start', y: 'bottom' },
            position: { x: 'start', y: 'top' },
            offset: { x: 0, y: 6 },
        }),
    });

    menu.setItems(['👍 Like', '❤️ Love', '😂 Haha', '😮 Wow', '😢 Sad']
        .map(label => ({ label, value: label })));

    menu.on('select', ({ value }) => {
        button.textContent = `${value} ▾`;
        menu.setSingleSelectedItemByValue(value);
        menu.hide();
    });

    button.addEventListener('click', () => {
        if (menu.isVisible()) {
            menu.hide();
        } else {
            menu.show();
            menu.el.focus();
        }
    });

    stage.append(button);
}
