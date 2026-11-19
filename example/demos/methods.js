import { SelectBox } from '@danielgindi/selectbox';

const fruits = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Grapefruit', value: 'grapefruit', citrus: true },
    { label: 'Kiwi', value: 'kiwi' },
    { label: 'Lemon', value: 'lemon', citrus: true },
    { label: 'Mango', value: 'mango' },
    { label: 'Orange', value: 'orange', citrus: true },
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
    const selectBox = new SelectBox({
        multi: true,
        items: fruits,
        placeholder: 'Pick fruits',
    });

    const note = document.createElement('p');
    note.className = 'demo-note';

    const buttons = document.createElement('div');
    buttons.className = 'demo-buttons';
    buttons.append(
        button('Open list', () => selectBox.openList()),
        // `toggleList()` flips; `toggleList(true/false)` opens or closes
        button('Peek for 2s', () => {
            selectBox.toggleList(true);
            setTimeout(() => selectBox.toggleList(false), 2000);
        }),
        button('Focus', () => selectBox.focusInput()),
        // Type into the box from code; `true` also filters the list
        button('Search "an"', () => {
            selectBox
                .focusInput()
                .setSearchTerm('an', true)
                .openList();
        }),
        button('Select citrus', () => selectBox.setSelectedItems(fruits.filter(fruit => fruit.citrus))),
        button('Rename Kiwi', () => selectBox.updateItemByValue('kiwi', { label: 'Kiwifruit' })),
        button('Clear', () => selectBox.clear()),
        button('Read selection', () => {
            const labels = selectBox.getSelectedItems().map(item => item.label);
            note.textContent = labels.length ? `Selected: ${labels.join(', ')}` : 'Nothing selected';
        }),
        // A one-time handler, removed automatically after it runs
        button('Notify on next pick', () => {
            note.textContent = 'Waiting for the next pick…';
            selectBox.once('addsel', ({ item }) => {
                note.textContent = `You picked ${item.label}`;
            });
        }),
    );

    stage.append(selectBox.el, buttons, note);

    return selectBox;
}
