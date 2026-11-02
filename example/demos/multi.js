import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        placeholder: 'Pick some countries',
        items: [
            // `short_label` is used for the chip, `label` for the list
            { label: 'United States', short_label: 'USA', value: 'us' },
            { label: 'United Kingdom', short_label: 'UK', value: 'uk' },
            { label: 'Canada', value: 'ca' },
            { label: 'France', value: 'fr' },
            { label: 'Germany', value: 'de' },
            { label: 'Japan', value: 'jp' },
            { label: 'Brazil', value: 'br' },
            { label: 'Israel', value: 'il' },
        ],
        value: ['us', 'fr', 'jp'],
    });

    stage.append(selectBox.el);

    return selectBox;
}
