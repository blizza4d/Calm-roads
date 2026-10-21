package com.antigrav.audio 
{
    import flash.events.SampleDataEvent;
    import flash.media.Sound;
    import flash.media.SoundChannel;
    import flash.geom.Vector3D;

    /**
     * Real-time procedural audio engine for anti-gravity vehicles.
     * Synthesizes twin-oscillator turbine hum, pink noise wind rush,
     * and spatial Doppler audio processing.
     */
    public class VehicleAudioManager 
    {
        private var _sound:Sound;
        private var _channel:SoundChannel;

        // Telemetry inputs
        public var speedKmh:Number = 0;
        public var rpm:Number = 1000;
        public var throttle:Number = 0;
        public var isHovering:Boolean = true;

        // Synthesis phase accumulators
        private var _phase1:Number = 0;
        private var _phase2:Number = 0;
        private var _noiseFilterState:Number = 0;

        // Doppler & 3D Spatial parameters
        public var listenerPos:Vector3D = new Vector3D(0, 0, 0);
        public var vehiclePos:Vector3D = new Vector3D(0, 0, 0);
        public var vehicleVel:Vector3D = new Vector3D(0, 0, 0);

        private const SPEED_OF_SOUND:Number = 343.0; // m/s
        private const TWO_PI:Number = Math.PI * 2.0;
        private const SAMPLE_RATE:Number = 44100.0;

        public function VehicleAudioManager() 
        {
            _sound = new Sound();
            _sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onGenerateAudio);
        }

        public function start():void 
        {
            if (!_channel) {
                _channel = _sound.play();
            }
        }

        public function stop():void 
        {
            if (_channel) {
                _channel.stop();
                _channel = null;
            }
        }

        /**
         * 3D Doppler Shift Ratio: f' = f * (c / (c + v_source_rel))
         */
        public function getDopplerFactor():Number 
        {
            var toListener:Vector3D = listenerPos.subtract(vehiclePos);
            var dist:Number = toListener.length;
            if (dist < 0.001) return 1.0;
            toListener.normalize();

            // Project vehicle velocity toward listener
            var vRel:Number = -vehicleVel.dotProduct(toListener);
            var factor:Number = SPEED_OF_SOUND / (SPEED_OF_SOUND + vRel);
            return Math.max(0.4, Math.min(2.2, factor));
        }

        /**
         * Real-time DSP synthesis callback buffer.
         */
        private function onGenerateAudio(e:SampleDataEvent):void 
        {
            var doppler:Number = getDopplerFactor();

            // Turbine base frequency modulated by RPM + Hover Repulsor resonance
            var baseFreq:Number = (55.0 + (rpm / 8000.0) * 280.0 + (speedKmh / 300.0) * 110.0) * doppler;
            var subFreq:Number = (baseFreq * 0.5);

            var phaseIncr1:Number = (TWO_PI * baseFreq) / SAMPLE_RATE;
            var phaseIncr2:Number = (TWO_PI * subFreq) / SAMPLE_RATE;

            // Wind rush volume scales quadratic with speed (v^2)
            var windVol:Number = Math.min(0.4, Math.pow(speedKmh / 280.0, 2.0) * 0.4);
            var engineVol:Number = 0.12 + (throttle * 0.15) + (rpm / 8000.0) * 0.08;

            // Stereo Panning (-1.0 to +1.0)
            var pan:Number = Math.max(-1.0, Math.min(1.0, (vehiclePos.x - listenerPos.x) / 30.0));
            var leftGain:Number = Math.cos((pan + 1.0) * (Math.PI / 4.0));
            var rightGain:Number = Math.sin((pan + 1.0) * (Math.PI / 4.0));

            for (var i:int = 0; i < 2048; i++) 
            {
                // 1. Dual oscillator turbine tone (Triangle + Sine harmonic)
                var osc1:Number = (2.0 / Math.PI) * Math.asin(Math.sin(_phase1));
                var osc2:Number = Math.sin(_phase2);
                var turbineSample:Number = (osc1 * 0.65 + osc2 * 0.35) * engineVol;

                // 2. High-speed aero wind rush (One-pole filtered white noise)
                var whiteNoise:Number = (Math.random() * 2.0 - 1.0);
                _noiseFilterState += 0.08 * (whiteNoise - _noiseFilterState);
                var windSample:Number = _noiseFilterState * windVol;

                var mixedMono:Number = turbineSample + windSample;

                // Write interleaved stereo 32-bit floats
                e.data.writeFloat(mixedMono * leftGain);
                e.data.writeFloat(mixedMono * rightGain);

                _phase1 += phaseIncr1;
                _phase2 += phaseIncr2;
                if (_phase1 > TWO_PI) _phase1 -= TWO_PI;
                if (_phase2 > TWO_PI) _phase2 -= TWO_PI;
            }
        }
    }
}
