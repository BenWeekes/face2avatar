import {
    AvatarAnimationData,
    AvatarController,
    avatarDataUrlFromKey,
    AvatarFactory,
    AvatarMatrix,
    Col,
    FaceTracker,
    Logger,
    LogLevel,
    Nullable,
    TrackerAvatarController,
    Vec3,
    Timer,
    Quaternion,
    FPS,
    Avatar,
    PeriodicExecutor,
    AvatarView,
    Future,
    Try,
    TrackerImage,
    deserializeResult,
    FallbackAvatarController,
    CameraWrapper,
} from '@0xalter/alter-core'


export const createAvatar = async (customPresetIndex = 4) => {
	Logger.logLevel = LogLevel.Debug
	const messageElement = document.getElementById('message') as HTMLElement
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    const blendShapesContainnr = document.getElementById('blend-shapes-values') as any;
    let avatarPresets: Array<AvatarMatrix> = []
    let avatar: Avatar | undefined
    let cameraTracker: CameraTracker | undefined
    let presetsSwapExecutor: PeriodicExecutor
    let presetIndex = 0

    const idleAnimationAvatarController = new IdleAnimationAvatarController()
    const fps = new FPS(1.0)

    // Create factory for downloading and creating avatars. Do not forget to get your avatar data key at https://studio.alter.xyz
    // You might want to handle errors more gracefully in your app. We just fail with an error here, as this demo makes little sense without avatars!
    //const avatarFactory = AvatarFactory.create(avatarDataUrlFromKey('enzdjehsjxn4vkzw7yuqfcneoiubwgn5ioqd4frhvwk4qac5n7dzg2a'), canvas,window.location.origin).orThrow
    const avatarFactory = AvatarFactory.create(avatarDataUrlFromKey('enzdjehsjxn4vkzw7yuqfcneoiubwgn5ioqd4frhvwk4qac5n7dzg2a'), canvas,"https://eu.sokool.io").orThrow

    // Wrap a HTML canvas with an AvatarView that handles all avatar rendering and interaction
    const avatarView = new AvatarView(canvas)

    // If there is no tracking data, we will control the avatar using a simple "idle" animation
    avatarView.avatarController = idleAnimationAvatarController
    avatarView.setOnFrameListener(() => {
        fps.tick((n) => {
            const fpsMessage = `FPS: ${Math.ceil(n)}`
            const noFaceMessage = cameraTracker?.lastResult?.hasFace() !== true ? '<br /><span class="cameraDetection">No face detected</span>' : ''

            const lastResult = cameraTracker?.lastResult;
	    /*
            const blend_shapes = lastResult?._blendshapes_9?._innerMap;
            let keys = [];
            let values = [] as any;
            if (lastResult && blend_shapes) {

                blend_shapes.forEach(function (value: any, key: any) {
                    values.push(`<p><b>${key}</b> : ${value} </p> `);
                })
            }

            blendShapesContainnr.innerHTML = values.join(' ');
	   */




            messageElement.innerHTML = fpsMessage + noFaceMessage
        })
        // canvas.width = 480;
        // canvas.height = 360;
        //
        // if (canvas.clientWidth !== canvas.width || canvas.clientHeight !== canvas.height) {
        //     canvas.width = canvas.clientWidth
        //     canvas.height = canvas.clientHeight
        // }
    })

    // Create first avatar. Note that loading avatars can take some time (network requests etc.) so we get an asynchronous Future object
    // that resolves when the avatar is ready to display.
    const avatarFuture = avatarFactory.createAvatarFromFile('avatar.json' /*, avatarFactory?.bundledFileSystem*/) // uncomment to load the Avatar matrix from app assets
    await avatarFuture?.then(
        (createdAvatar) => {
            avatar = createdAvatar ?? undefined
            avatar?.setBackgroundColor(Col.GREEN)
            avatarView.avatar = avatar

            const spinner = document.getElementById('spinner')
            if (spinner) {
                spinner.style.display = 'none'
            }
        },
        (error) => console.error(`Failed to create avatar, ${error}`)
    )

    // Load more avatars from ready-made presets and start swapping them around
    await avatarFactory
        .parseAvatarMatricesFromFile('presets.json' /*, avatarFactory?.bundledFileSystem*/) // uncomment to load the avatar presets from app assets
        .then(
            (presets) => {
                avatarPresets = presets.toArray()
                if (avatarPresets.length > 0) {
                    if (customPresetIndex) {
                        avatar
                            ?.updateAvatarFromMatrix(avatarPresets[customPresetIndex])
                            .then(() => console.log(`Updated to avatar preset ${customPresetIndex} of ${avatarPresets.length}`)) 
                    } else {
                        presetsSwapExecutor = new PeriodicExecutor(20, () => {
                            const currentPresetIndex = presetIndex
                            console.info(`Updating to avatar preset ${currentPresetIndex}`)
                            debugger;
                            avatar
                                ?.updateAvatarFromMatrix(avatarPresets[currentPresetIndex])
                                .then(() => console.log(`Updated to avatar preset ${currentPresetIndex}`))
                            presetIndex = (currentPresetIndex + 1) % avatarPresets.length
                        })
                    }

                }
            },
            (error) => console.error(`Failed to load and parse avatar presets, ${error}`)
        )

    // If webcamera is available on this device, start it to mirror facial expressions to the avatar
    const cameraFuture = CameraTracker.create(avatarFactory)
    Promise.all([avatarFuture.promise(), cameraFuture.promise()]).then(([avatar, camTracker]) => {
        cameraTracker = camTracker
        camTracker.attachAvatar(avatar)
        if (camTracker.avatarController) {
            // Use the face tracking controller and if there is no face, fall back to the basic "idle" controller.
            avatarView.avatarController = new FallbackAvatarController(camTracker.avatarController, idleAnimationAvatarController)
        }
    })
}

/**
 * Animates the avatar if camera is not available or no face is detected
 */
class IdleAnimationAvatarController implements AvatarController {
    private timer = Timer.start()
    frame(): Nullable<AvatarAnimationData> {
        const time = this.timer.tick().elapsed
        const smile = 0.5 + 0.5 * Math.sin(time * 0.5)
        // for the list of available expression, print EXPRESSION_BLENDSHAPES
        return new AvatarAnimationData(
            new Map([
                ['mouthSmile_L', smile],
                ['mouthSmile_R', smile],
            ]),
            AvatarAnimationData.DEFAULT_AVATAR_POSITION,
            Quaternion.fromRotation(0.3 * Math.sin(time * 0.5), Vec3.zAxis),
            Vec3.createWithNum(0.5)
        )
    }
}

/**
 * Handles interaction with webcamera and sends facial expressions to the avatar
 */
class CameraTracker {
    static create(avatarFactory: AvatarFactory): Future<Try<CameraTracker>> {
    const videoElement = document.getElementById('videoSource') as HTMLVideoElement
        const cameraWrapper = new CameraWrapper(videoElement)
        return FaceTracker.createVideoTracker(avatarFactory.bundledFileSystem).mapTry((tracker) => new CameraTracker(cameraWrapper, tracker))
    }

    private _avatarController: TrackerAvatarController | undefined

    constructor(cameraWrapper: CameraWrapper, private faceTracker: FaceTracker) {
        // Start camera recording or log an error if it fails
        cameraWrapper.start().logError('Error starting camera')
        cameraWrapper.addOnFrameListener((texture) => this.onCameraImage(texture))
    }

    public attachAvatar(avatar: Avatar) {
        this._avatarController = TrackerAvatarController.create1(this.faceTracker, avatar)
    }

    // Called whenever a new frame from camera is available
    private onCameraImage(cameraTexture: TrackerImage) {
        if (this._avatarController !== undefined) {
            // Give the tracking controller a new image to process.
            // AvatarView automatically picks up changes in the controller so no more work needs to be done!
            // You can access the raw tracking data by inspecting the object this method returns.
            this._avatarController.updateFromCamera(cameraTexture)
        }

        // Serialize/deserialize tracking result for e.g. sending over WebRTC, use TrackerResultAvatarController for that
        // const serialized = this.lastResult?.serialize()
        // const deserialized = serialized ? deserializeResult(serialized).first : undefined
        // console.log("deserialized values", deserialized)
    }

    public get avatarController() {
        return this._avatarController
    }

    public get lastResult() {
        return this.faceTracker.lastResult
    }
}

//window. createAvatar=createAvatar;// createAvatar();
//  createAvatar();
declare global {
    interface Window {
        createAvatar: any
    }
}

window.createAvatar = createAvatar;