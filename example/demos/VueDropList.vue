<template>
  <div class="vue-demo">
    <div>
      <button
        ref="toggle"
        type="button"
        class="demo-button"
        @click="open = !open"
      >
        Sort by: {{ options.find(option => option.value === sort)?.label }} ▾
      </button>
    </div>

    <!-- The list shows while it's rendered: toggle it with v-if -->
    <DropList
      v-if="open"
      v-model="sort"
      :items="options"
      :position-options="positionOptions"
      :is-header-visible="true"
      :is-footer-visible="true"
      :auto-focus="true"
      :auto-relayout-on-items-change="true"
      @select="open = false"
      @blur="onBlur"
      @hide="open = false"
    >
      <template #header>
        <strong>Sort by</strong>
      </template>
      <template #footer>
        <button
          type="button"
          class="demo-button"
          @click="addOption"
        >
          + Add an option
        </button>
      </template>
    </DropList>

    <p>v-model: <code>{{ sort }}</code></p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { DropList } from '@danielgindi/selectbox/vue';

const options = ref([
    { label: 'Name', value: 'name' },
    { label: 'Date modified', value: 'modified' },
    { label: 'Size', value: 'size' },
]);

const sort = ref('modified');
const open = ref(false);
const toggle = ref(null);

const positionOptions = computed(() => ({
    target: toggle.value,
    anchor: { x: 'start', y: 'bottom' },
    position: { x: 'start', y: 'top' },
    offset: { x: 0, y: 4 },
    updateWidth: 220,
}));

// Changing `items` while open re-lays out the list (`auto-relayout-on-items-change`, on by default)
let extra = 0;
function addOption() {
    extra++;
    options.value = [...options.value, { label: `Custom field ${extra}`, value: `custom-${extra}` }];
}

// Close when focus leaves the list - unless it went to the toggle button, which closes it itself
function onBlur(event) {
    if (event.relatedTarget !== toggle.value)
        open.value = false;
}
</script>
