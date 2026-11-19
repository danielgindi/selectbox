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
        value: ['crimson', 'gold', 'royalblue', 'seagreen'],
        renderMultiItem: renderSwatch,
        // The chip standing for the rest of the selection gets `items`: the whole selection
        maxMultiItems: 2,
        renderRestMultiItem: (item, itemEl) => {
            const rest = item.items.slice(2);
            itemEl.title = rest.map(color => color.label).join(', ');
            itemEl.append(`+${rest.length} `, ...rest.map(color => {
                const dot = document.createElement('span');
                dot.style.cssText = `display: inline-block; width: .6em; height: .6em; border-radius: 50%;
                    margin-inline-start: .15em; background: ${color.hex}`;
                return dot;
            }));
        },
        listOptions: {
            renderItem: renderSwatch,
            // Type something that matches no color
            renderNoResultsItem: (item, itemEl) => {
                itemEl.textContent = `No color named "${multi.getSearchTerm()}"`;
            },
        },
    });

    stage.append(single.el, multi.el);

    return multi;
}
