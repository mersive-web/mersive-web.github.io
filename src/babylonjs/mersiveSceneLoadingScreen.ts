import type { ILoadingScreen } from '@babylonjs/core'
import eventBus from '@/eventBus'

class MersiveSceneLoadingScreen implements ILoadingScreen {
    private loadingScreenName: string
    public loadingUIBackgroundColor: string
    public loadingUIText: string

    constructor(
        loadingScreenName: string,
        loadingUIText: string,
        loadingUIBackgroundColor: string,
    ) {
        this.loadingScreenName = loadingScreenName
        this.loadingUIBackgroundColor = loadingUIBackgroundColor
        this.loadingUIText = loadingUIText
    }

    public displayLoadingUI() {
        eventBus.emit((this.loadingScreenName + 'Shown') as 'loadingScreenShown', {
            loadingScreenData: {
                loadingBackgroundColor: this.loadingUIBackgroundColor,
                loadingText: this.loadingUIText,
            },
        })
    }

    public hideLoadingUI() {
        eventBus.emit((this.loadingScreenName + 'Hidden') as 'loadingScreenHidden')
    }
}

export default MersiveSceneLoadingScreen
