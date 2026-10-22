import { SelectBox } from '@danielgindi/selectbox';

// Use your own data shape - no need to map it to `label`/`value`
const employees = [
    { id: 101, name: 'Avery Johnson', initials: 'AJ' },
    { id: 102, name: 'Blake Rivera', initials: 'BR' },
    { id: 103, name: 'Casey Morgan', initials: 'CM' },
    { id: 104, name: 'Devon Patel', initials: 'DP' },
];

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        items: employees,
        labelProp: 'name',
        valueProp: 'id',
        // Chips show the short form
        multiItemLabelProp: 'initials',
        value: [101, 103],
    });

    stage.append(selectBox.el);

    return selectBox;
}
