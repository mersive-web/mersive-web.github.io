<script setup lang="ts">
const props = defineProps({
    imageFilePath: {
        type: String,
        required: true,
    },
    elementName: {
        type: String,
        required: true,
    },
})
</script>

<template>
    <button class="elements-library__element-button" tabindex="-1">
        <img :src="imageFilePath" alt="" />
        <span>{{ props.elementName }}</span>
    </button>
</template>

<style scoped>
.elements-library__element-button {
    width: 150px;

    display: flex;
    flex-direction: column;
    align-items: center;

    font-size: 0.8em;
    text-align: center;

    background-color: var(--mersive-c-grey);
    color: var(--mersive-c-white);

    border-radius: 6px;

    cursor: pointer;
    transition: background-color 0.1s linear;
}

.elements-library__element-button:hover {
    background-color: var(--mersive-c-grey-dark);
}

.elements-library__element-button img {
    width: 150px;
    height: 150px;
}

.elements-library__element-button span {
    margin: 0.2em 0.4em;
}
</style>
