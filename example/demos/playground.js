import { SelectBox } from '@danielgindi/selectbox';

const fruits = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Kiwi', 'Lemon', 'Mango', 'Peach']
    .map(name => ({ label: name, value: name.toLowerCase() }));

export default function (stage, controls) {
    const selectBox = new SelectBox({
        items: fruits,
        placeholder: 'Pick a fruit',
    });

    stage.append(selectBox.el);

    // Every option has a matching setter, so it can change at any time.
    controls.toggle('multi', false, on => selectBox.setMulti(on));
    controls.toggle('searchable', true, on => selectBox.setSearchable(on));
    controls.toggle('clearable', true, on => selectBox.setClearable(on));
    controls.toggle('hasOpenIndicator', true, on => selectBox.setHasOpenIndicator(on));
    controls.toggle('sortListItems', false, on => selectBox.setSortListItems(on));
    controls.toggle('disabled', false, on => selectBox.disable(on));
    controls.toggle('readOnly', false, on => selectBox.setReadOnly(on));
    controls.toggle('isLoadingMode', false, on => selectBox.setIsLoadingMode(on));
    controls.select('direction', ['auto', 'ltr', 'rtl'], dir => selectBox.setDirection(dir));
    controls.text('placeholder', 'Pick a fruit', text => selectBox.setPlaceholder(text));

    return selectBox;
}
