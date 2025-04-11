<script setup lang="ts">
const colorValue = defineModel({
    required: true,
    type: String,
})

const emit = defineEmits(['input'])
</script>

<template>
    <input v-model.number="colorValue" type="color" class="m-color-input" @input="emit('input')" />
</template>

<style scoped>
.m-color-input {
    width: 60px;
    height: 30px;

    padding: 0.2em;

    background-color: var(--mersive-c-grey-dark);
    border: none;
    border-radius: 6px;

    cursor: pointer;
}
</style>
