import './assets/css/main.css'
import 'normalize.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// console.log('main.ts', Date.now())

const pinia = createPinia()
const app = createApp(App)

// Disable scrolling with arrows, space and page up/down (for example, on the Outliner)
// But allow arrows to be used in inputs for incrementing and decrementing values
window.addEventListener('keydown', (keyboardEvent) => {
    if (
        ['input', 'textarea'].includes((keyboardEvent.target as HTMLElement).tagName.toLowerCase())
    ) {
        return
    }

    if (
        ![' ', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'PageUp', 'PageDown'].includes(
            keyboardEvent.key,
        )
    ) {
        return
    }

    keyboardEvent.preventDefault()
})

window.addEventListener('dragover', (e) => {
    // Prevent default behavior (prevent files from being opened) when dragging files
    e.preventDefault()
})

window.addEventListener('drop', (e) => {
    // Prevent default behavior (prevent files from being opened) when dropping files (drag end)
    e.preventDefault()
})

app.use(pinia)
app.mount('#app')
