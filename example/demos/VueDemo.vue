<template>
  <div class="vue-demo">
    <SelectBox
      v-model="selected"
      :items="planets"
      :multi="true"
      placeholder="Pick planets"
    >
      <!-- Slots render items with Vue: list-item, single-item, multi-item, ... -->
      <template #list-item="item">
        {{ item.icon }} {{ item.label }}
      </template>
      <template #multi-item="item">
        {{ item.icon }} {{ item.label }}
      </template>
    </SelectBox>

    <p>v-model: <code>{{ selected }}</code></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { SelectBox } from '@danielgindi/selectbox/vue';

const planets = [
    { label: 'Mercury', value: 'mercury', icon: '☿' },
    { label: 'Venus', value: 'venus', icon: '♀' },
    { label: 'Earth', value: 'earth', icon: '🜨' },
    { label: 'Mars', value: 'mars', icon: '♂' },
    { label: 'Jupiter', value: 'jupiter', icon: '♃' },
    { label: 'Saturn', value: 'saturn', icon: '♄' },
];

const selected = ref(['earth', 'mars']);
</script>
