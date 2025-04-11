<script setup lang="ts">
const isEnabled = defineModel({
    required: true,
    type: Boolean,
})

const emit = defineEmits(['click'])

function handleClick() {
    isEnabled.value = !isEnabled.value

    emit('click')
}
</script>

<template>
    <button tabindex="-1" class="m-toggle" @click="handleClick">
        <img v-show="isEnabled === false" src="./../assets/icons/toggle_off_200.svg" alt="" />
        <img v-show="isEnabled === true" src="./../assets/icons/toggle_on_200.svg" alt="" />
    </button>
</template>

<style scoped>
.m-toggle {
    background-color: transparent;
    border: none;

    cursor: pointer;
    user-select: none;
}

.m-toggle img {
    width: 36px;
    height: 36px;
}
</style>
