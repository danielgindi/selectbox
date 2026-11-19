import { SelectBox } from '@danielgindi/selectbox';

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    .map(size => ({ label: size, value: size }));

const cities = ['Amsterdam', 'Athens', 'Berlin', 'Lisbon', 'London', 'Madrid', 'Paris', 'Prague', 'Rome', 'Vienna']
    .map(city => ({ label: city, value: city.toLowerCase() }));

const team = [
    { label: 'Design', value: 'design', _group: true },
    { label: 'Dana', value: 'dana', _child: true },
    { label: 'Eli', value: 'eli', _child: true },
    { label: 'Engineering', value: 'engineering', _group: true },
    { label: 'Noa', value: 'noa', _child: true },
    { label: 'Omer', value: 'omer', _child: true },
    { label: 'Yael', value: 'yael', _child: true },
];

export default function (stage, controls) {
    // Not searchable, like a native <select>: focus it and type "x" to pick a size
    const size = new SelectBox({
        items: sizes,
        placeholder: 'Size (focus, then type)',
        searchable: false,
        allowTypeToSelect: true,
    });

    // Type "pa", then press Escape: is the text still there?
    const city = new SelectBox({
        items: cities,
        placeholder: 'City',
        // Blur the input after picking - with the mouse or with the keyboard
        blurOnSingleSelection: true,
    });

    const assignees = new SelectBox({
        multi: true,
        items: team,
        placeholder: 'Assign to…',
    });

    stage.append(size.el, city.el, assignees.el);

    controls.toggle('allowTypeToSelect', true, on => size.setAllowTypeToSelect(on));
    controls.select('blurOnSingleSelection', ['true', 'touch', 'false'], value =>
        city.setBlurOnSingleSelection(value === 'touch' ? 'touch' : value === 'true'));

    // Groups become values of their own, instead of shortcuts for their children
    controls.toggle('treatGroupSelectionAsItems', false, on => assignees.setTreatGroupSelectionAsItems(on));
    // Select the typed text after checking an item, so typing again replaces it
    controls.toggle('autoSelectTextOnCheck', true, on => assignees.setAutoSelectTextOnCheck(on));

    // When is the typed text cleared?
    const clearInputWhen = new Set(['single_close', 'multi_select_single']);
    for (const moment of ['single_close', 'multi_close', 'multi_select_single']) {
        controls.toggle(moment, clearInputWhen.has(moment), on => {
            if (on)
                clearInputWhen.add(moment);
            else
                clearInputWhen.delete(moment);

            city.setClearInputWhen([...clearInputWhen]);
            assignees.setClearInputWhen([...clearInputWhen]);
        });
    }

    return assignees;
}
