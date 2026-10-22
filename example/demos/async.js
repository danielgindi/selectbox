import { SelectBox } from '@danielgindi/selectbox';

const allUsers = [
    'Ada Lovelace', 'Alan Turing', 'Barbara Liskov', 'Dennis Ritchie', 'Donald Knuth',
    'Edsger Dijkstra', 'Grace Hopper', 'Ken Thompson', 'Linus Torvalds', 'Margaret Hamilton',
].map(name => ({ label: name, value: name.toLowerCase().replace(' ', '.') }));

// Pretend this is a server call
const searchUsers = (term) => new Promise(resolve => setTimeout(() => {
    resolve(allUsers.filter(user => user.label.toLowerCase().includes(term.toLowerCase())));
}, 600));

export default function (stage) {
    const selectBox = new SelectBox({
        placeholder: 'Search users…',
        items: [],
        noResultsText: 'Type to search',
        // The server already filtered the results - show them as they are
        filterFn: (items) => items,
        filterOnEmptyTerm: true,
        // Keep the list (and the typed text) while results load
        closeListWhenLoading: false,
    });

    let lastTerm = null;

    selectBox.on('search:term', async (term) => {
        if (term === lastTerm) return;
        lastTerm = term;

        selectBox.setIsLoadingMode(true);
        const results = term ? await searchUsers(term) : [];

        // Ignore stale responses
        if (term !== lastTerm) return;

        // Replace the items, but keep the selected item (and its label) even if
        // it is not part of these results. Re-setting the selection refreshes the open list.
        selectBox
            .setItems(results, false)
            .setSelectedItems(selectBox.getSelectedItems())
            .setIsLoadingMode(false);
    });

    stage.append(selectBox.el);

    return selectBox;
}
