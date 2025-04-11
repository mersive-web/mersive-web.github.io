<script setup lang="ts">
// When the input is empty, its value will be ''.
// So, the model can also be a string.
// If we don't do this, the following Vue warn will be thrown:
// [Vue warn]: Invalid prop: type check failed for prop "modelValue". Expected Number with value 0, got String with value "".
const rangeValue = defineModel<number | string>({
    required: true,
})

defineProps({
    min: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: true,
    },
    step: {
        type: [String, Number],
        required: true,
    },
})

const emit = defineEmits(['input'])
</script>

<template>
    <input
        v-model.number="rangeValue"
        class="m-range"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        @input="emit('input')"
    />
</template>

<style scoped>
/*
 * Thanks to https://range-input-css.netlify.app/
*/
/*********** Baseline, reset styles ***********/
.m-range {
    width: 100%;

    margin: 4px 0;

    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
}

.m-range:focus {
    outline: none;
}

/******** Chrome, Safari, Opera and Edge Chromium styles ********/
/* slider track */
.m-range::-webkit-slider-runnable-track {
    background-color: var(--mersive-c-grey-dark);
    border-radius: 10px;
    height: 12px;
}

/* slider thumb */
.m-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    /* Override default look */
    appearance: none;
    margin-top: -4px;
    /* Centers thumb on the track */
    background-color: var(--mersive-c-white);
    border-radius: 20px;
    height: 20px;
    width: 20px;
}

.m-range:focus::-webkit-slider-thumb {
    outline: none;
}

/*********** Firefox styles ***********/
/* slider track */
.m-range::-moz-range-track {
    background-color: var(--mersive-c-grey-dark);
    border-radius: 10px;
    height: 12px;
}

/* slider thumb */
.m-range::-moz-range-thumb {
    background-color: var(--mersive-c-white);
    border: none;
    /*Removes extra border that FF applies*/
    border-radius: 20px;
    height: 20px;
    width: 20px;
}

.m-range:focus::-moz-range-thumb {
    outline: none;
}
</style>
