import type { FreeCameraMouseInput, Scene } from '@babylonjs/core'
import { UniversalCamera } from '@babylonjs/core'

// The EP camera name and id are the same.
export const experiencePlayerCameraName = 'MERSIVE_EXPERIENCE_PLAYER_CAMERA'

class MersiveExperiencePlayerCamera extends UniversalCamera {
    private canvas: HTMLCanvasElement
    private scene: Scene

    private walkingSpeed: number
    private sprintingSpeed: number

    private isPointerLocked = false
    private isRequestPointerLockAllowed = true
    private isRequestPointerLockAllowedTimeOutId: number | null = null
    private waitTimeBeforeNewRequestPointerLock = 2000 // ms

    public requestPointerLock(): void {
        if (this.isRequestPointerLockAllowed === false) {
            return
        }

        if (this.isPointerLocked === true) {
            return
        }

        if (
            this.canvas.requestPointerLock === null ||
            this.canvas.requestPointerLock === undefined
        ) {
            return
        }

        void this.canvas.requestPointerLock()
    }

    /**
     * Wait some time before making another request pointer lock
     * after exiting from the previous one.
     * This is done to fix the error "The user has exited the lock
     * before this request was completed".
     * It happens in this way (without this fix):
     * 1 - click the canvas (and the pointer lock is given)
     * 2 - press exit
     * 3 - click the canvas again before 2 seconds have passed
     * 4 - ERROR
     *
     * @see https://forum.babylonjs.com/t/pointerlock-issues/14056
     * @see https://discourse.threejs.org/t/how-to-avoid-pointerlockcontrols-error/33017/2
     */
    private onPointerLockChange(): void {
        if (document.pointerLockElement === null) {
            this.isPointerLocked = false
        } else {
            this.isPointerLocked = true
        }

        this.isRequestPointerLockAllowed = false
        if (this.isRequestPointerLockAllowedTimeOutId !== null) {
            window.clearTimeout(this.isRequestPointerLockAllowedTimeOutId)
        }
        this.isRequestPointerLockAllowedTimeOutId = window.setTimeout(() => {
            this.isRequestPointerLockAllowed = true
        }, this.waitTimeBeforeNewRequestPointerLock)
    }

    private handlePointerLockChangeEvents(): void {
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange())
        document.addEventListener('mspointerlockchange', () => this.onPointerLockChange())
        document.addEventListener('mozpointerlockchange', () => this.onPointerLockChange())
        document.addEventListener('webkitpointerlockchange', () => this.onPointerLockChange())
    }

    private handleKeyDownEvents(): void {
        this.canvas.addEventListener('keydown', (keyboardEvent) => {
            switch (keyboardEvent.key.toLowerCase()) {
                case 'shift':
                    this.speed = this.sprintingSpeed
                    break
                default:
                    break
            }
        })
    }

    private handleKeyUpEvents(): void {
        this.canvas.addEventListener('keyup', (keyboardEvent) => {
            switch (keyboardEvent.key.toLowerCase()) {
                case 'shift':
                    this.speed = this.walkingSpeed
                    break
                default:
                    break
            }
        })
    }

    private handleKeyboardEvents(): void {
        this.handleKeyDownEvents()
        this.handleKeyUpEvents()
    }

    private setupEventHandlers(): void {
        this.handlePointerLockChangeEvents()
        this.handleKeyboardEvents()
    }

    constructor(sourceCamera: UniversalCamera, canvas: HTMLCanvasElement, scene: Scene) {
        super(experiencePlayerCameraName, sourceCamera.position.clone(), scene)

        this.canvas = canvas
        this.scene = scene

        const keyboardKeyCodes = {
            A: 65,
            D: 68,
            S: 83,
            W: 87,
            Q: 81,
            E: 69,
        }

        this.attachControl(canvas, true)

        // Only allow the left click to rotate the camera
        ;(this.inputs.attached.mouse as FreeCameraMouseInput).buttons = [0]

        // Camera movement with the WASD keys instead of the arrow keys
        this.keysLeft = [keyboardKeyCodes.A]
        this.keysUp = [keyboardKeyCodes.W]
        this.keysRight = [keyboardKeyCodes.D]
        this.keysDown = [keyboardKeyCodes.S]

        // Remove upward and downward with PageUp and PageDown.
        this.keysUpward = []
        this.keysDownward = []

        // Add virtual joysticks for moving the camera if the device has a touchscreen
        if (window.matchMedia('(pointer: coarse)').matches) {
            this.inputs.addVirtualJoystick()
        }

        // TODO: Any attempt to customize the virtual joysticks doesn't work.
        //       Investigate why.
        // const virtualJoystickInput = this.inputs.attached
        //     .virtualJoystick as FreeCameraVirtualJoystickInput
        // const leftVirtualJoystick = virtualJoystickInput.getLeftJoystick()
        // const rightVirtualJoystick = virtualJoystickInput.getRightJoystick()

        // leftVirtualJoystick.setJoystickColor('#000000')
        // rightVirtualJoystick.setJoystickColor('#000000')

        // Camera movement adjustments
        this.rotation = sourceCamera.rotation.clone()
        this.fov = sourceCamera.fov
        this.walkingSpeed = sourceCamera.speed
        this.sprintingSpeed = this.walkingSpeed * 2
        this.speed = this.walkingSpeed
        this.inertia = sourceCamera.inertia
        this.angularSensibility = sourceCamera.angularSensibility
        this.ellipsoid = sourceCamera.ellipsoid.clone()

        this.minZ = 0.1
        this.maxZ = 10_000
        this.applyGravity = true
        this.checkCollisions = true

        this.setupEventHandlers()
    }
}

export default MersiveExperiencePlayerCamera
