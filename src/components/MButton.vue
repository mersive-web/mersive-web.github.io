<script setup lang="ts"></script>

<template>
    <button tabindex="-1" class="m-button">
        <slot></slot>
    </button>
</template>

<style scoped>
.m-button {
    padding: 0.5em 1em;

    font-size: 0.8em;

    color: var(--mersive-c-white);

    background-color: var(--mersive-c-grey);
    border: none;
    border-radius: 6px;

    cursor: pointer;
    user-select: none;

    transition: background-color 0.1s ease-in;
}

.m-button:hover {
    background-color: var(--mersive-c-grey-dark);
}
</style>
