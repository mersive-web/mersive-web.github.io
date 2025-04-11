import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useExperiencePlayerStore = defineStore('experiencePlayerStore', () => {
    const isExperiencePlayerExaminationScreenShown = ref(false)

    return {
        isExperiencePlayerExaminationScreenShown,
    }
})
