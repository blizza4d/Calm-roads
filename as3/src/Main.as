package 
{
    import flash.display.Sprite;
    import flash.display.StageAlign;
    import flash.display.StageScaleMode;
    import flash.display3D.Context3D;
    import flash.display3D.Context3DRenderMode;
    import flash.events.Event;
    import flash.events.KeyboardEvent;
    import flash.ui.Keyboard;

    import com.antigrav.physics.AntiGravVehiclePhysics;
    import com.antigrav.audio.VehicleAudioManager;
    import com.antigrav.world.ProceduralTrackGenerator;
    import com.antigrav.graphics.MaterialShaders;
    import com.antigrav.graphics.BloomPostProcess;

    /**
     * Anti-Gravity Racing Game Entry Point (ActionScript 3 / Stage3D).
     */
    [SWF(width="1280", height="720", frameRate="60", backgroundColor="#07090e")]
    public class Main extends Sprite 
    {
        private var _context3D:Context3D;
        private var _physics:AntiGravVehiclePhysics;
        private var _audio:VehicleAudioManager;
        private var _trackGen:ProceduralTrackGenerator;
        private var _bloom:BloomPostProcess;

        // Key states
        private var _keyForward:Boolean = false;
        private var _keyBackward:Boolean = false;
        private var _keyLeft:Boolean = false;
        private var _keyRight:Boolean = false;

        public function Main() 
        {
            if (stage) init();
            else addEventListener(Event.ADDED_TO_STAGE, onAddedToStage);
        }

        private function onAddedToStage(e:Event):void 
        {
            removeEventListener(Event.ADDED_TO_STAGE, onAddedToStage);
            init();
        }

        private function init():void 
        {
            stage.scaleMode = StageScaleMode.NO_SCALE;
            stage.align = StageAlign.TOP_LEFT;

            _physics = new AntiGravVehiclePhysics();
            _audio = new VehicleAudioManager();

            stage.addEventListener(KeyboardEvent.KEY_DOWN, onKeyDown);
            stage.addEventListener(KeyboardEvent.KEY_UP, onKeyUp);

            // Request Stage3D Context
            if (stage.stage3Ds.length > 0) {
                stage.stage3Ds[0].addEventListener(Event.CONTEXT3D_CREATE, onContextCreated);
                stage.stage3Ds[0].requestContext3D(Context3DRenderMode.AUTO);
            }
        }

        private function onContextCreated(e:Event):void 
        {
            _context3D = stage.stage3Ds[0].context3D;
            _context3D.configureBackBuffer(stage.stageWidth, stage.stageHeight, 2, true);

            _trackGen = new ProceduralTrackGenerator(_context3D);
            _bloom = new BloomPostProcess(_context3D, 1024, 512);

            _audio.start();

            addEventListener(Event.ENTER_FRAME, onRenderFrame);
        }

        private function onKeyDown(e:KeyboardEvent):void 
        {
            if (e.keyCode == Keyboard.UP || e.keyCode == 87) _keyForward = true;
            if (e.keyCode == Keyboard.DOWN || e.keyCode == 83) _keyBackward = true;
            if (e.keyCode == Keyboard.LEFT || e.keyCode == 65) _keyLeft = true;
            if (e.keyCode == Keyboard.RIGHT || e.keyCode == 68) _keyRight = true;
        }

        private function onKeyUp(e:KeyboardEvent):void 
        {
            if (e.keyCode == Keyboard.UP || e.keyCode == 87) _keyForward = false;
            if (e.keyCode == Keyboard.DOWN || e.keyCode == 83) _keyBackward = false;
            if (e.keyCode == Keyboard.LEFT || e.keyCode == 65) _keyLeft = false;
            if (e.keyCode == Keyboard.RIGHT || e.keyCode == 68) _keyRight = false;
        }

        private function onRenderFrame(e:Event):void 
        {
            var dt:Number = 1.0 / 60.0;

            var throttle:Number = _keyForward ? 1.0 : (_keyBackward ? -0.5 : 0.0);
            var brake:Number = (_keyBackward && _physics.forwardVel > 1.0) ? 1.0 : 0.0;
            var steer:Number = (_keyLeft ? 1.0 : 0.0) - (_keyRight ? 1.0 : 0.0);

            // Update Physics
            _physics.update(dt, throttle, brake, steer, function(x:Number, z:Number):Number {
                var center:flash.geom.Vector3D = _trackGen.evaluateSpline(-z);
                return center.y;
            });

            // Update Audio DSP parameters
            _audio.speedKmh = _physics.speedKmh;
            _audio.rpm = _physics.rpm;
            _audio.throttle = Math.abs(throttle);
            _audio.vehiclePos = _physics.position;

            // Render Stage3D
            if (_context3D) {
                _context3D.clear(0.03, 0.04, 0.06, 1.0);
                // Draw track geometry, vehicles, and post-process
                _context3D.present();
            }
        }
    }
}
