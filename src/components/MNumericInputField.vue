<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
    theme: {
        type: String,
        required: false,
        default: 'default',
    },
    minValue: {
        type: [String, Number],
        required: false,
        default: '',
    },
    maxValue: {
        type: [String, Number],
        required: false,
        default: '',
    },
    step: {
        type: [String, Number],
        required: false,
        default: 1,
    },
    textBeforeInput: {
        type: [String, Boolean],
        required: false,
        default: false,
    },
    textAfterInput: {
        type: [String, Boolean],
        required: false,
        default: false,
    },
})

const emit = defineEmits(['input'])

const inputElementLeftPadding = computed(() => {
    if (props.textBeforeInput !== false) {
        return '2em'
    } else {
        return '0.3em'
    }
})

// When the input is empty, its value will be ''.
// So, the model can also be a string.
// If we don't do this, the following Vue warn will be thrown:
// [Vue warn]: Invalid prop: type check failed for prop "modelValue". Expected Number with value 0, got String with value "".
const inputValue = defineModel<number | string>({
    required: true,
})
const inputElement = ref<HTMLInputElement | null>(null)

function handleInput() {
    if (!inputElement.value) {
        return
    }

    if (inputElement.value.value == '') {
        return
    }

    if (inputElement.value.checkValidity() === false) {
        return
    }

    emit('input')
}
</script>

<template>
    <div
        class="m-numeric-input-field-wrapper"
        :class="`m-numeric-input-field-wrapper--theme-${theme}`"
    >
        <span v-if="textBeforeInput" class="m-numeric-input-field-wrapper__text-before-input">
            {{ textBeforeInput }}
        </span>
        <input
            ref="inputElement"
            v-model.number="inputValue"
            type="number"
            class="m-numeric-input-field-wrapper__input"
            :min="minValue"
            :max="maxValue"
            required
            :step="step"
            @input="handleInput"
        />
        <span v-if="textAfterInput" class="m-numeric-input-field-wrapper__text-after-input">
            {{ textAfterInput }}
        </span>
    </div>
</template>

<style scoped>
.m-numeric-input-field-wrapper {
    width: 100%;

    display: flex;
    align-items: center;
    position: relative;
}

.m-numeric-input-field-wrapper__text-before-input,
.m-numeric-input-field-wrapper__text-after-input {
    position: absolute;
    font-size: 0.8em;
    color: var(--mersive-c-white);
    line-height: 0;
}

.m-numeric-input-field-wrapper__text-before-input {
    left: 16px;
}

.m-numeric-input-field-wrapper--theme-default .m-numeric-input-field-wrapper__input {
    width: 100%;

    color: var(--mersive-c-white);
    background-color: var(--mersive-c-grey-dark);
    border: 2px solid var(--mersive-c-grey-dark);
    border-radius: 6px;

    font-size: 0.8em;
    padding: 0.3em 40% 0.3em 10%;
    text-align: right;
    line-height: 0;

    transition: border 0.2s;
}

.m-numeric-input-field-wrapper--theme-ed-editor-input .m-numeric-input-field-wrapper__input {
    width: 100%;

    background-color: var(--mersive-c-grey);
    border: 2px solid var(--mersive-c-grey);

    color: var(--mersive-c-white);
    font-size: 0.8em;
    padding: 0.3em 40px 0.3em v-bind(inputElementLeftPadding);
    text-align: right;
    line-height: 0;

    transition: border 0.2s;
}

.m-numeric-input-field-wrapper--theme-ed-editor-input:first-of-type
    .m-numeric-input-field-wrapper__input {
    border-radius: 6px 6px 0 0;
}

.m-numeric-input-field-wrapper--theme-ed-editor-input:last-of-type
    .m-numeric-input-field-wrapper__input {
    border-radius: 0 0 6px 6px;
}

.m-numeric-input-field-wrapper--theme-ed-editor-input:first-of-type:last-of-type
    .m-numeric-input-field-wrapper__input {
    border-radius: 6px;
}

.m-numeric-input-field-wrapper__input:invalid {
    border: 2px solid #d00e3b;
}

.m-numeric-input-field-wrapper__text-after-input {
    right: 16px;
}
</style>
