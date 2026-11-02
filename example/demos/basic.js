import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        placeholder: 'Choose a coffee',
        items: [
            { label: 'Espresso', value: 'espresso' },
            { label: 'Cappuccino', value: 'cappuccino' },
            { label: 'Flat White', value: 'flat-white' },
            { label: 'Latte', value: 'latte' },
            { label: 'Mocha', value: 'mocha' },
            { label: 'Cold Brew', value: 'cold-brew' },
        ],
        value: 'latte',
    });

    stage.append(selectBox.el);

    return selectBox;
}
