import { SelectBox } from '@danielgindi/selectbox';

const toppings = ['Mushrooms', 'Olives', 'Onions', 'Peppers', 'Pineapple', 'Spinach', 'Tomatoes']
    .map(name => ({ label: name, value: name.toLowerCase() }));

export default function (stage) {
    // No chips: the placeholder summarizes the selection, e.g. "Mushrooms (+2)"
    const compact = new SelectBox({
        multi: true,
        items: toppings,
        value: ['mushrooms', 'olives', 'spinach'],
        placeholder: 'No toppings',
        showSelection: false,
    });

    // Your own summary text, also shown as a tooltip (handy when it's cut off)
    const custom = new SelectBox({
        multi: true,
        items: toppings,
        value: ['onions', 'peppers', 'pineapple', 'spinach', 'tomatoes'],
        showSelection: false,
        multiPlaceholderFormatter: (items) => items.length === 0
            ? 'Plain, no toppings'
            : `${items.length} toppings: ${items.map(item => item.label).join(', ')}`,
        showPlaceholderInTooltip: true,
    });

    stage.append(compact.el, custom.el);

    return custom;
}
