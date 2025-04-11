import type { FreeCameraMouseInput, Scene } from '@babylonjs/core'
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'

class MersiveExperienceDesignerCamera extends UniversalCamera {
    public readonly defaultFOV = 0.8 // rad
    public readonly defaultWalkingSpeed = 1 // m/s
    public readonly defaultSprintingSpeed = 4 // m/s
    public readonly defaultInertia = 0.2
    public readonly defaultAngularSensibility = 1_000

    private walkingSpeed = this.defaultWalkingSpeed
    private sprintingSpeed = this.defaultSprintingSpeed

    public getWalkingSpeed() {
        return this.walkingSpeed
    }

    public setWalkingSpeed(walkingSpeed: number) {
        this.walkingSpeed = walkingSpeed
        this.speed = this.walkingSpeed
    }

    public getSprintingSpeed() {
        return this.sprintingSpeed
    }

    public setSprintingSpeed(sprintingSpeed: number) {
        this.sprintingSpeed = sprintingSpeed
    }

    constructor(canvas: HTMLCanvasElement, scene: Scene) {
        super('MERSIVE_EXPERIENCE_DESIGNER_CAMERA', new Vector3(0, 2, -10), scene)

        const keyboardKeyCodes = {
            A: 65,
            D: 68,
            S: 83,
            W: 87,
            Q: 81,
            E: 69,
        }

        this.rotation = new Vector3(0, 0, 0)
        this.attachControl(canvas, true)

        // Only allow the left click to rotate the camera
        ;(this.inputs.attached.mouse as FreeCameraMouseInput).buttons = [0]

        // Camera movement with the WASD keys instead of the arrow keys
        this.keysLeft = [keyboardKeyCodes.A]
        this.keysUp = [keyboardKeyCodes.W]
        this.keysRight = [keyboardKeyCodes.D]
        this.keysDown = [keyboardKeyCodes.S]

        // Remove upward and downward with PageUp and PageDown.
        // Replace them with Q and E
        this.keysUpward = [keyboardKeyCodes.Q]
        this.keysDownward = [keyboardKeyCodes.E]

        this.inputs.addMouseWheel()

        // Camera movement adjustments
        this.fov = this.defaultFOV
        this.speed = this.getWalkingSpeed()
        this.inertia = this.defaultInertia
        this.angularSensibility = this.defaultAngularSensibility

        this.applyGravity = false
        this.checkCollisions = false

        this.doNotSerialize = true

        window.addEventListener('keydown', (ev) => {
            switch (ev.key.toLowerCase()) {
                case 'shift':
                    this.speed = this.getSprintingSpeed()
                    break
                default:
                    break
            }
        })

        window.addEventListener('keyup', (ev) => {
            switch (ev.key.toLowerCase()) {
                case 'shift':
                    this.speed = this.getWalkingSpeed()
                    break
                default:
                    break
            }
        })
    }
}

export default MersiveExperienceDesignerCamera
