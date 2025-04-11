<script setup lang="ts">
const { placeholderText, options } = defineProps<{
    placeholderText: string
    options: { name: string | number; value: string | number }[]
}>()

const selectValue = defineModel<number | string>({
    required: true,
})

const emit = defineEmits(['change'])
</script>

<template>
    <select v-model="selectValue" class="m-select" @change="emit('change')">
        <option disabled value="">{{ placeholderText }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.name }}
        </option>
    </select>
</template>

<style scoped>
.m-select {
    width: 100%;

    font-weight: 600;
    font-size: 0.8em;

    outline: none;
    border: none;
    border-radius: 6px;
    padding: 0.4em 0.8em;
    margin: 0 0 1em 0;

    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white);

    cursor: pointer;
}

.m-select:hover {
    background-color: var(--mersive-c-grey-dark);
}

.m-select option {
    font-weight: 400;
    font-size: 1em;

    padding: 1em 0;

    background-color: var(--mersive-c-grey-dark);
    color: var(--mersive-c-white);
}
</style>
