<script setup lang="ts">
import { useExperienceDesignerStore } from '@/stores/experienceDesigner'

const experienceDesignerStore = useExperienceDesignerStore()

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    displayText: {
        type: String,
        required: true,
    },
})
</script>

<template>
    <div
        class="menu"
        :class="{
            'menu--active':
                experienceDesignerStore.topBarMenuBarData.showMenuItems &&
                experienceDesignerStore.topBarMenuBarData.activeMenu == props.name,
        }"
    >
        <button
            class="menu__title"
            @click="experienceDesignerStore.toggleTopBarMenuBarShowMenuItems(props.name)"
            @mouseover="experienceDesignerStore.setTopBarMenuBarActiveMenu(props.name)"
        >
            {{ displayText }}
        </button>
        <div class="menu__items">
            <slot></slot>
        </div>
    </div>
</template>

<style scoped>
.menu__title {
    background-color: transparent;

    border-radius: 4px;

    color: var(--mersive-c-white-soft);

    padding: 4px 12px;
    transition: background-color 0.1s linear;
}

.menu--active,
.menu__title:hover {
    background-color: var(--mersive-c-grey-light);
    border-radius: 4px;
}

.menu__items {
    display: none;

    border-radius: 6px;
    border: 1px solid var(--mersive-c-grey-light);
    background-color: var(--color-background);

    padding: 0.5em 0;
}

.menu--active .menu__items {
    position: absolute;
    display: flex;
    flex-direction: column;
}
</style>
