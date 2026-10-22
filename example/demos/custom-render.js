import { SelectBox } from '@danielgindi/selectbox';

const colors = [
    { label: 'Crimson', value: 'crimson', hex: '#dc143c' },
    { label: 'Dark Orange', value: 'darkorange', hex: '#ff8c00' },
    { label: 'Gold', value: 'gold', hex: '#ffd700' },
    { label: 'Sea Green', value: 'seagreen', hex: '#2e8b57' },
    { label: 'Royal Blue', value: 'royalblue', hex: '#4169e1' },
    { label: 'Rebecca Purple', value: 'rebeccapurple', hex: '#663399' },
];

// Render callbacks get the item and the element to fill.
// Return `false` to fall back to the default (label) rendering.
function renderSwatch(item, itemEl) {
    const swatch = document.createElement('span');
    swatch.style.cssText = `display: inline-block; width: .8em; height: .8em; border-radius: 50%;
        margin-inline-end: .4em; vertical-align: -.05em; background: ${item.hex}`;

    itemEl.append(swatch, item.label);
}

export default function (stage) {
    const single = new SelectBox({
        items: colors,
        value: 'seagreen',
        renderSingleItem: renderSwatch,
        listOptions: { renderItem: renderSwatch },
    });

    const multi = new SelectBox({
        multi: true,
        items: colors,
        value: ['crimson', 'gold', 'royalblue'],
        renderMultiItem: renderSwatch,
        listOptions: { renderItem: renderSwatch },
    });

    stage.append(single.el, multi.el);

    return multi;
}
