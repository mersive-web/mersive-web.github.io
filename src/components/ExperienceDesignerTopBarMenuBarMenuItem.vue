<script setup lang="ts">
import eventBus, { type Events } from '@/eventBus'

const props = defineProps({
    keyboardShortcut: {
        type: String,
        required: false,
        default: '',
    },
    checkboxEnabled: {
        type: Boolean,
        required: false,
        default: false,
    },
    action: {
        type: String,
        required: true,
    },
    disabled: {
        type: Boolean,
        required: false,
        default: false,
    },
})

function handleClick() {
    if (!props.disabled) {
        eventBus.emit((props.action + 'CommandExecuted') as keyof Events)
    }
}
</script>

<template>
    <button
        class="menu__items__item"
        :class="{
            'menu__items__item--disabled': props.disabled,
        }"
        @click="handleClick"
    >
        <img
            v-if="checkboxEnabled"
            class="menu__items__item__checkbox"
            src="./../assets/icons/check_400.svg"
            alt="V"
        />
        <span class="menu__items__item__action-name">
            <slot></slot>
        </span>
        <span class="menu__items__item__action-keyboard-shortcut">
            {{ keyboardShortcut }}
        </span>
    </button>
</template>

<style scoped>
.menu__items__item {
    min-width: 220px;

    display: flex;
    justify-content: space-between;
    align-items: center;

    background-color: transparent;
    color: var(--mersive-c-white-soft);

    margin: 0 0.5em;
    padding: 0.6em 2em;

    border-radius: 4px;

    text-align: left;

    cursor: pointer;
}

.menu__items__item:hover {
    background-color: var(--color-accent);
}

.menu__items__item__checkbox {
    position: absolute;
    left: 10px;
}

.menu__items__item__action-name {
    margin-right: 20px;
}

.menu__items__item--disabled {
    color: var(--mersive-c-white-mute);
    pointer-events: none;
}
</style>
