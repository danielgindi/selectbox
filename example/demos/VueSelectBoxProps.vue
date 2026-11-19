<template>
  <div class="vue-demo">
    <label class="demo-note">
      <input
        v-model="onlyAvailable"
        type="checkbox"
      > Only available people
    </label>

    <SelectBox
      v-model="assignee"
      :items="people"
      placeholder="Assignee"
      :accept-null-as-value="true"
      :filter-fn="filterPeople"
      :filter-on-empty-term="true"
      :filter-dependencies="onlyAvailable"
      :fixed-droplist-width="true"
      :additional-droplist-classes="{ droplist_disabled_no_interaction: true }"
      @select="lastEvent = `select → ${JSON.stringify($event.value)}`"
    >
      <template #single-item="item">
        <span :style="{ color: dotColor(item) }">●</span> {{ item.label }}
      </template>
      <template #list-item="item">
        <span :style="{ color: dotColor(item) }">●</span> {{ item.label }}
      </template>
      <template #no-results-item>
        Nobody matches - <em>try another name</em>
      </template>
    </SelectBox>
    <p>v-model: <code>{{ JSON.stringify(assignee) }}</code></p>

    <SelectBox
      v-model="reviewer"
      :items="reviewers"
      placeholder="Reviewer (clear it with ×)"
      :emit-null-for-empty-value="true"
      @clear="lastEvent = 'clear'"
    />
    <p>v-model: <code>{{ JSON.stringify(reviewer) ?? 'undefined' }}</code></p>

    <p>Last event: <code>{{ lastEvent }}</code></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { SelectBox } from '@danielgindi/selectbox/vue';

const people = [
    // `accept-null-as-value`: a `null` v-model selects this item, instead of meaning "no value"
    { label: 'Unassigned', value: null },
    { label: 'Dana Levi', value: 'dana', available: true },
    { label: 'Eli Cohen', value: 'eli', available: false },
    { label: 'Noa Mizrahi', value: 'noa', available: true },
    { label: 'Omer Peretz (on leave)', value: 'omer', available: false, _nointeraction: true },
    { label: 'Yael Friedman', value: 'yael', available: true },
];
const reviewers = people.slice(1);

const assignee = ref(null);
// `emit-null-for-empty-value`: clearing sets the v-model to `null`, not `undefined`
const reviewer = ref('noa');
const onlyAvailable = ref(false);
const lastEvent = ref('-');

const dotColor = item => item.value === null ? '#8a9099' : item.available ? '#2f7d32' : '#c43d3d';

// Depends on `onlyAvailable` too - so it's passed as `filter-dependencies`,
// which re-runs the filter whenever it changes
function filterPeople(items, term) {
    const lowerTerm = term.toLowerCase();
    return items.filter(item =>
        item.label.toLowerCase().includes(lowerTerm) &&
        (!onlyAvailable.value || item.available || item.value === null));
}
</script>
