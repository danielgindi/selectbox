import { SelectBox } from '@danielgindi/selectbox';

const languages = [
    'C', 'C#', 'C++', 'Clojure', 'Dart', 'Elixir', 'Go', 'Haskell', 'Java', 'JavaScript',
    'Kotlin', 'Lua', 'Objective-C', 'PHP', 'Python', 'Ruby', 'Rust', 'Scala', 'Swift', 'TypeScript',
].map(name => ({ label: name, value: name.toLowerCase() }));

export default function (stage) {
    // Default search: case-insensitive "contains" match on the label
    const contains = new SelectBox({
        placeholder: 'Contains…',
        items: languages,
        noResultsText: 'No language matches',
    });

    // Custom search: only match from the beginning of the label
    const startsWith = new SelectBox({
        placeholder: 'Starts with…',
        items: languages,
        filterThrottleWindow: 100,
        filterFn: (items, term) => items.filter(item =>
            item.label.toLowerCase().startsWith(term.toLowerCase())),
    });

    // Not searchable: a classic dropdown, opened by click, Enter or Space
    const notSearchable = new SelectBox({
        placeholder: 'Not searchable',
        items: languages,
        searchable: false,
    });

    stage.append(contains.el, startsWith.el, notSearchable.el);

    return contains;
}
