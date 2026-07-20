/* eslint-disable no-console */

import { performance } from 'node:perf_hooks';

const topLevelCount = 10000;
const groupsCount = 100;
const subitemsPerGroup = 50;
const lookupIterations = 100000;
const stateIterations = 10000;
const resetIterations = 100;

function createItems() {
    const items = [];

    for (let i = 0; i < topLevelCount; i++) {
        items.push({ label: `Top ${i}`, value: `top-${i}` });
    }

    for (let groupIndex = 0; groupIndex < groupsCount; groupIndex++) {
        const subitems = [];

        for (let subitemIndex = 0; subitemIndex < subitemsPerGroup; subitemIndex++) {
            subitems.push({
                label: `Sub ${groupIndex}.${subitemIndex}`,
                value: `sub-${groupIndex}-${subitemIndex}`,
            });
        }

        items.push({
            label: `Group ${groupIndex}`,
            value: `group-${groupIndex}`,
            _subitems: subitems,
        });
    }

    return items;
}

function createSelectBoxState(items, multi = false) {
    const state = {
        _p: {
            items: [],
            itemByValueMap: new Map(),
            subitemByValueMap: null,
            valueProp: 'value',
            multi,
            selectedItems: [],
            selectedValues: [],
            itemsChanged: true,
            selectionChanged: true,
            resortBySelectionNeeded: false,
        },

        setItems(nextItems, resetValues = true) {
            const p = this._p;

            p.items = (nextItems ?? []).slice(0);
            p.itemsChanged = true;
            this._updateItemByValueMap();

            if (resetValues)
                this.setSelectedValues(this.getSelectedValues());

            return this;
        },

        setValue(value) {
            const p = this._p;
            if (p.multi)
                return this.setSelectedValues(Array.isArray(value) ? value : value !== undefined ? [value] : []);

            return this.setSelectedValues(value !== undefined ? [value] : []);
        },

        setSelectedValues(values) {
            const p = this._p;
            const valueProp = p.valueProp;

            if (!p.multi)
                values = values.slice(0, 1);

            const set = new Set();
            const selectedValues = [];
            const selectedItems = [];

            for (let value of values) {
                if (set.has(value))
                    continue;
                set.add(value);

                selectedValues.push(value);

                const item = this._getItemByValue(value);
                if (item !== undefined) {
                    selectedItems.push(item);
                } else {
                    selectedItems.push({ [valueProp]: value });
                }
            }

            p.selectedValues = selectedValues;
            p.selectedItems = selectedItems;
            p.selectionChanged = true;
            p.resortBySelectionNeeded = true;

            return this;
        },

        getSelectedValues() {
            return this._p.selectedValues.slice(0);
        },

        updateItemByValue(value, newItem) {
            const p = this._p;
            const existingItem = this._getItemByValue(value);

            if (existingItem) {
                const currentValue = existingItem[p.valueProp];
                if (p.itemByValueMap?.has(currentValue))
                    p.itemByValueMap.delete(currentValue);

                Object.assign(existingItem, newItem);
                p.itemByValueMap.set(existingItem[p.valueProp], existingItem);
                p.subitemByValueMap = null;
            }

            return this;
        },

        _updateItemByValueMap() {
            const p = this._p;
            const itemByValueMap = p.itemByValueMap = new Map();
            const valueProp = p.valueProp;

            for (let item of p.items) {
                itemByValueMap.set(item[valueProp], item);
            }

            p.subitemByValueMap = null;
        },

        _getItemByValue(value) {
            const p = this._p;
            let item = p.itemByValueMap.get(value);
            if (item !== undefined)
                return item;

            if (!p.subitemByValueMap)
                this._refreshSubitemByValueMap();

            return p.subitemByValueMap.get(value);
        },

        _refreshSubitemByValueMap() {
            const p = this._p;
            const subitemByValueMap = p.subitemByValueMap = new Map();
            this._addSubitemsToValueMap(p.items, subitemByValueMap, p.valueProp);
        },

        _addSubitemsToValueMap(itemsToMap, itemByValueMap, valueProp) {
            for (let item of itemsToMap) {
                if (!item._subitems?.length)
                    continue;

                for (let subitem of item._subitems) {
                    if (!itemByValueMap.has(subitem[valueProp]))
                        itemByValueMap.set(subitem[valueProp], subitem);
                }

                this._addSubitemsToValueMap(item._subitems, itemByValueMap, valueProp);
            }
        },
    };

    return state.setItems(items, false);
}

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function measure(name, fn) {
    const startedAt = performance.now();
    fn();
    const elapsed = performance.now() - startedAt;

    console.log(`${name.padEnd(48)} ${elapsed.toFixed(3)}ms`);
}

function heading(name) {
    console.log(`\n${name}`);
}

const items = createItems();
const topLevelValue = `top-${topLevelCount - 1}`;
const otherTopLevelValue = `top-${topLevelCount - 2}`;
const subitemValue = `sub-${groupsCount - 1}-${subitemsPerGroup - 1}`;
const otherSubitemValue = `sub-${groupsCount - 1}-${subitemsPerGroup - 2}`;

heading('Value map');

measure('build top-level value map', () => {
    createSelectBoxState(items);
});

const lookup = createSelectBoxState(items);
measure(`${lookupIterations} top-level lookups`, () => {
    for (let i = 0; i < lookupIterations; i++) {
        lookup._getItemByValue(topLevelValue);
    }
});

assert(lookup._p.subitemByValueMap === null, 'Top-level lookups should not build the subitem map');

measure('first subitem lookup, includes cache build', () => {
    const item = lookup._getItemByValue(subitemValue);
    assert(item?.value === subitemValue, 'Expected subitem to resolve');
});

measure(`${lookupIterations} warmed subitem lookups`, () => {
    for (let i = 0; i < lookupIterations; i++) {
        lookup._getItemByValue(subitemValue);
    }
});

heading('Single selection');

measure(`${stateIterations} setValue(top-level)`, () => {
    const state = createSelectBoxState(items);
    for (let i = 0; i < stateIterations; i++) {
        state.setValue(i % 2 === 0 ? topLevelValue : otherTopLevelValue);
    }
    assert(state._p.subitemByValueMap === null, 'Top-level setValue should not build the subitem map');
});

measure(`${stateIterations} setValue(subitem, cold first)`, () => {
    const state = createSelectBoxState(items);
    for (let i = 0; i < stateIterations; i++) {
        state.setValue(i % 2 === 0 ? subitemValue : otherSubitemValue);
    }
    assert(state._p.selectedItems[0]?.value === otherSubitemValue, 'Expected warmed subitem selection to resolve');
});

measure(`${stateIterations} setValue(unknown)`, () => {
    const state = createSelectBoxState(items);
    for (let i = 0; i < stateIterations; i++) {
        state.setValue(`missing-${i}`);
    }
    assert(state._p.selectedItems[0]?.value === `missing-${stateIterations - 1}`, 'Expected unknown value fallback item');
});

heading('Multi selection');

measure(`${stateIterations} setSelectedValues(5 top-level)`, () => {
    const state = createSelectBoxState(items, true);
    for (let i = 0; i < stateIterations; i++) {
        state.setSelectedValues(['top-1', 'top-2', 'top-3', 'top-4', 'top-5']);
    }
    assert(state._p.selectedItems.length === 5, 'Expected five selected top-level items');
    assert(state._p.subitemByValueMap === null, 'Top-level multi selection should not build the subitem map');
});

measure(`${stateIterations} setSelectedValues(mixed)`, () => {
    const state = createSelectBoxState(items, true);
    for (let i = 0; i < stateIterations; i++) {
        state.setSelectedValues(['top-1', subitemValue, 'missing-value', otherSubitemValue, 'top-1']);
    }
    assert(state._p.selectedItems.length === 4, 'Expected duplicate selected value to be ignored');
});

heading('Items and updates');

measure(`${resetIterations} setItems(reset top-level value)`, () => {
    const state = createSelectBoxState(items);
    state.setValue(topLevelValue);

    for (let i = 0; i < resetIterations; i++) {
        state.setItems(createItems());
    }

    assert(state._p.selectedItems[0]?.value === topLevelValue, 'Expected top-level selection after item reset');
    assert(state._p.subitemByValueMap === null, 'Top-level item reset should not build the subitem map');
});

measure(`${resetIterations} setItems(reset subitem value)`, () => {
    const state = createSelectBoxState(items);
    state.setValue(subitemValue);

    for (let i = 0; i < resetIterations; i++) {
        state.setItems(createItems());
    }

    assert(state._p.selectedItems[0]?.value === subitemValue, 'Expected subitem selection after item reset');
});

measure(`${stateIterations} updateItemByValue(top-level)`, () => {
    const state = createSelectBoxState(items);
    for (let i = 0; i < stateIterations; i++) {
        state.updateItemByValue('top-0', { label: `Top updated ${i}`, value: 'top-0' });
    }
    assert(state._getItemByValue('top-0')?.label === `Top updated ${stateIterations - 1}`, 'Expected top-level update');
});

measure(`${stateIterations} updateItemByValue(subitem)`, () => {
    const state = createSelectBoxState(items);
    for (let i = 0; i < stateIterations; i++) {
        state.updateItemByValue('sub-0-0', { label: `Sub updated ${i}`, value: 'sub-0-0' });
    }
    assert(state._getItemByValue('sub-0-0')?.label === `Sub updated ${stateIterations - 1}`, 'Expected subitem update');
});