import { SelectBox } from '@danielgindi/selectbox';

export default function (stage) {
    const selectBox = new SelectBox({
        multi: true,
        placeholder: 'Choose ingredients',
        // Groups are flat: a `_group` item heads the `_child` items that follow it.
        // Checking a group header checks all of its children.
        items: [
            { label: 'Fruits', value: 'fruits', _group: true },
            { label: 'Apple', value: 'apple', _child: true },
            { label: 'Banana', value: 'banana', _child: true },
            { label: 'Mango', value: 'mango', _child: true },

            { label: 'Vegetables', value: 'vegetables', _group: true },
            { label: 'Carrot', value: 'carrot', _child: true },
            { label: 'Spinach', value: 'spinach', _child: true },

            { label: 'Dairy', value: 'dairy', _group: true },
            { label: 'Milk', value: 'milk', _child: true },
            { label: 'Yogurt', value: 'yogurt', _child: true },
        ],
        value: ['carrot'],
        // Checked items move to the top of the list, in their own group copy
        sortListCheckedFirst: true,
        splitListCheckedGroups: true,
    });

    stage.append(selectBox.el);

    return selectBox;
}
