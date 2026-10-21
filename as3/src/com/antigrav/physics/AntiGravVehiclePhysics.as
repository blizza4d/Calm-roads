package com.antigrav.physics 
{
    import flash.geom.Vector3D;
    import flash.geom.Matrix3D;

    /**
     * Anti-Gravity Vehicle Physics Engine.
     * Implements 4-corner downward spring raycasters, repulsor damping,
     * frictionless inertia drifting, and bank-into-turn dynamics.
     */
    public class AntiGravVehiclePhysics 
    {
        // State
        public var position:Vector3D = new Vector3D(0, 2.5, 0);
        public var linearVelocity:Vector3D = new Vector3D(0, 0, 0);
        public var yawAngle:Number = 0;   // Radians
        public var pitchAngle:Number = 0; // Radians
        public var rollAngle:Number = 0;  // Radians

        // Telemetry
        public var speedKmh:Number = 0;
        public var rpm:Number = 1000;
        public var forwardVel:Number = 0;
        public var lateralVel:Number = 0;

        // Configuration
        public var maxSpeed:Number = 72.0;    // m/s (~260 km/h)
        public var accelForce:Number = 12.5;  // m/s^2
        public var brakeForce:Number = 28.0;  // m/s^2
        public var turnRate:Number = 1.85;
        public var hoverRestHeight:Number = 1.35; // Hover clearance
        public var springStiffness:Number = 32.0;
        public var damperStrength:Number = 8.5;

        // 4 Corner suspension compressions [FL, FR, RL, RR]
        public var compressions:Vector.<Number> = new <Number>[0, 0, 0, 0];

        // Dimensions
        private const HALF_TRACK:Number = 0.95;
        private const HALF_BASE:Number = 1.45;

        public function update(
            dt:Number, 
            throttle:Number, 
            brake:Number, 
            steerInput:Number, 
            heightCallback:Function
        ):void 
        {
            if (dt > 0.05) dt = 0.05;

            // 1. Steering & Inward Banking
            var speedFactor:Number = Math.max(0.25, 1.0 - (speedKmh / 280.0) * 0.6);
            yawAngle += steerInput * turnRate * speedFactor * (forwardVel >= 0 ? 1 : -1) * dt;

            // 2. Drive & Brake Acceleration
            if (throttle > 0) {
                forwardVel += throttle * accelForce * dt;
                if (forwardVel > maxSpeed) forwardVel = maxSpeed;
            } else if (throttle < 0) {
                forwardVel += throttle * (accelForce * 0.5) * dt;
                if (forwardVel < -12.0) forwardVel = -12.0;
            }

            if (brake > 0) {
                if (forwardVel > 0) forwardVel = Math.max(0, forwardVel - brake * brakeForce * dt);
                else if (forwardVel < 0) forwardVel = Math.min(0, forwardVel + brake * brakeForce * dt);
            }

            // Low-friction hover aerodynamic drag
            if (throttle == 0 && brake == 0) {
                forwardVel *= Math.pow(0.996, dt * 60.0);
            }

            // 3. Lateral Inertia Drift & Inward Sci-Fi Banking
            var targetLateral:Number = -steerInput * (speedKmh / 140.0) * 8.0;
            lateralVel += (targetLateral - lateralVel) * (dt * 4.0);

            // Forward & Lateral Vectors
            var forwardX:Number = -Math.sin(yawAngle);
            var forwardZ:Number = -Math.cos(yawAngle);
            var rightX:Number = Math.cos(yawAngle);
            var rightZ:Number = -Math.sin(yawAngle);

            position.x += (forwardX * forwardVel + rightX * lateralVel) * dt;
            position.z += (forwardZ * forwardVel + rightZ * lateralVel) * dt;

            // 4. Downward Quad-Raycast Repulsor Springs
            var cosY:Number = Math.cos(yawAngle);
            var sinY:Number = Math.sin(yawAngle);

            var corners:Array = [
                [-HALF_TRACK, -HALF_BASE], // FL
                [ HALF_TRACK, -HALF_BASE], // FR
                [-HALF_TRACK,  HALF_BASE], // RL
                [ HALF_TRACK,  HALF_BASE]  // RR
            ];

            var avgGroundY:Number = 0;
            for (var i:int = 0; i < 4; i++) {
                var lx:Number = corners[i][0];
                var lz:Number = corners[i][1];
                var wx:Number = position.x + lx * cosY + lz * sinY;
                var wz:Number = position.z - lx * sinY + lz * cosY;
                var gy:Number = heightCallback(wx, wz);
                avgGroundY += gy * 0.25;

                var dist:Number = position.y - gy;
                var comp:Number = hoverRestHeight - dist;
                compressions[i] += (comp - compressions[i]) * (dt * 16.0);
            }

            // 5. Vertical Spring-Damper Elevation
            var targetY:Number = avgGroundY + hoverRestHeight;
            position.y += (targetY - position.y) * (dt * 8.5);

            // 6. Dynamic Pitch & Bank Roll
            var frontComp:Number = (compressions[0] + compressions[1]) * 0.5;
            var rearComp:Number = (compressions[2] + compressions[3]) * 0.5;
            var leftComp:Number = (compressions[0] + compressions[2]) * 0.5;
            var rightComp:Number = (compressions[1] + compressions[3]) * 0.5;

            var targetPitch:Number = (frontComp - rearComp) * 0.35 + (throttle - brake) * 0.04;
            pitchAngle += (targetPitch - pitchAngle) * (dt * 8.0);

            // Inward Sci-Fi Banking into turns
            var targetRoll:Number = (rightComp - leftComp) * 0.25 + (steerInput * (speedKmh / 160.0) * 0.22);
            rollAngle += (targetRoll - rollAngle) * (dt * 8.0);

            // Telemetry
            speedKmh = Math.abs(forwardVel) * 3.6;
            rpm = Math.min(8000, Math.max(900, 1000 + (speedKmh / 260.0) * 6200 + throttle * 800));
        }
    }
}
