<template>
  <div class="vue-demo">
    <SelectBox
      v-model="selected"
      :items="planets"
      :multi="true"
      :max-multi-items="3"
      placeholder="Pick planets"
      @addsel="lastEvent = `addsel → ${$event.value}`"
      @removesel="lastEvent = `removesel → ${$event.value}`"
    >
      <!-- Slots render items with Vue: list-item, single-item, multi-item, ... -->
      <template #list-item="item">
        {{ item.icon }} {{ item.label }}
      </template>
      <template #multi-item="item">
        {{ item.icon }} {{ item.label }}
      </template>
      <!-- The chip standing for the chips over `max-multi-items` -->
      <template #rest-multi-item="rest">
        +{{ rest.items.length - 3 }} {{ rest.items.slice(3).map(planet => planet.icon).join('') }}
      </template>
    </SelectBox>

    <p>v-model: <code>{{ selected }}</code></p>
    <!-- Library events are emitted as Vue events, with the same names -->
    <p>Last event: <code>{{ lastEvent }}</code></p>
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

const selected = ref(['earth', 'mars', 'jupiter', 'saturn']);
const lastEvent = ref('-');
</script>
