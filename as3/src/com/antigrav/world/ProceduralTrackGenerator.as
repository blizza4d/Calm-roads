package com.antigrav.world 
{
    import flash.display3D.Context3D;
    import flash.display3D.IndexBuffer3D;
    import flash.display3D.VertexBuffer3D;
    import flash.geom.Vector3D;
    import flash.geom.Matrix3D;

    /**
     * Procedural Anti-Gravity Track & Environment Generator.
     * Generates continuous 3D ribbon tracks using Parallel Transport Frames
     * and seeds biome-specific decorations (floating monoliths, neon pylons).
     */
    public class ProceduralTrackGenerator 
    {
        public static const CHUNK_LENGTH:Number = 300.0;
        public static const SEGMENTS_PER_CHUNK:int = 60;
        public static const TRACK_WIDTH:Number = 16.0;
        public static const BANKING_MAX:Number = 0.45; // Radians

        private var _context3D:Context3D;
        private var _lastTangent:Vector3D;
        private var _lastNormal:Vector3D;
        private var _lastBinormal:Vector3D;

        public function ProceduralTrackGenerator(context:Context3D) 
        {
            this._context3D = context;
            this._lastTangent = new Vector3D(0, 0, -1);
            this._lastNormal = new Vector3D(0, 1, 0);
            this._lastBinormal = new Vector3D(1, 0, 0);
        }

        /**
         * 3D Parametric Centerline at distance s along the highway.
         */
        public function evaluateSpline(s:Number):Vector3D 
        {
            var x:Number = Math.sin(s * 0.0032) * 45.0 + Math.sin(s * 0.0075) * 18.0;
            var y:Number = Math.sin(s * 0.0045) * 14.0 + Math.cos(s * 0.009) * 8.0;
            var z:Number = -s;
            return new Vector3D(x, y, z);
        }

        /**
         * Computes the curvature derivative for track banking into turns.
         */
        public function evaluateBanking(s:Number):Number 
        {
            var delta:Number = 2.0;
            var x1:Number = evaluateSpline(s + delta).x;
            var x2:Number = evaluateSpline(s).x;
            var x3:Number = evaluateSpline(s - delta).x;
            var curvature:Number = (x3 - 2 * x2 + x1) / (delta * delta);
            return Math.max(-BANKING_MAX, Math.min(BANKING_MAX, curvature * 6.5));
        }

        /**
         * Generates a seamless Stage3D mesh chunk.
         * Output Vertex Layout (9 floats per vertex):
         * [x, y, z,   nx, ny, nz,   u, v,   glowIntensity]
         */
        public function buildChunkMesh(startDist:Number):TrackChunkData 
        {
            var numVerts:int = (SEGMENTS_PER_CHUNK + 1) * 2;
            var vertexData:Vector.<Number> = new Vector.<Number>();
            var indexData:Vector.<uint> = new Vector.<uint>();

            var step:Number = CHUNK_LENGTH / SEGMENTS_PER_CHUNK;
            var halfW:Number = TRACK_WIDTH * 0.5;

            for (var i:int = 0; i <= SEGMENTS_PER_CHUNK; i++) 
            {
                var s:Number = startDist + (i * step);
                var center:Vector3D = evaluateSpline(s);
                var nextCenter:Vector3D = evaluateSpline(s + 0.5);

                // Compute tangent vector
                var T:Vector3D = nextCenter.subtract(center);
                T.normalize();

                // Parallel transport frame update (prevents gimbal flip)
                var a:Vector3D = _lastTangent.crossProduct(T);
                if (a.length > 0.0001) 
                {
                    a.normalize();
                    var theta:Number = Math.acos(Math.max(-1, Math.min(1, _lastTangent.dotProduct(T))));
                    var rotMat:Matrix3D = new Matrix3D();
                    rotMat.appendRotation(theta * (180.0 / Math.PI), a);
                    _lastNormal = rotMat.transformVector(_lastNormal);
                }
                _lastTangent = T;
                _lastBinormal = _lastTangent.crossProduct(_lastNormal);
                _lastBinormal.normalize();

                // Apply banking rotation around tangent
                var bankAngle:Number = evaluateBanking(s);
                var bankMat:Matrix3D = new Matrix3D();
                bankMat.appendRotation(bankAngle * (180.0 / Math.PI), T);
                var curNormal:Vector3D = bankMat.transformVector(_lastNormal);
                var curBinormal:Vector3D = bankMat.transformVector(_lastBinormal);

                // Left & Right Ribbon Vertices
                var leftPos:Vector3D = center.subtract(new Vector3D(curBinormal.x * halfW, curBinormal.y * halfW, curBinormal.z * halfW));
                var rightPos:Vector3D = center.add(new Vector3D(curBinormal.x * halfW, curBinormal.y * halfW, curBinormal.z * halfW));

                var vCoord:Number = (s / 10.0);

                // Left Vertex: x, y, z, nx, ny, nz, u, v, glow
                vertexData.push(leftPos.x, leftPos.y, leftPos.z, curNormal.x, curNormal.y, curNormal.z, 0.0, vCoord, 1.0);
                // Right Vertex
                vertexData.push(rightPos.x, rightPos.y, rightPos.z, curNormal.x, curNormal.y, curNormal.z, 1.0, vCoord, 1.0);

                // Triangles (2 per segment quad)
                if (i < SEGMENTS_PER_CHUNK) 
                {
                    var base:int = i * 2;
                    indexData.push(base, base + 1, base + 2);
                    indexData.push(base + 1, base + 3, base + 2);
                }
            }

            var chunk:TrackChunkData = new TrackChunkData();
            if (_context3D) {
                chunk.vertexBuffer = _context3D.createVertexBuffer(vertexData.length / 9, 9);
                chunk.vertexBuffer.uploadFromVector(vertexData, 0, vertexData.length / 9);

                chunk.indexBuffer = _context3D.createIndexBuffer(indexData.length);
                chunk.indexBuffer.uploadFromVector(indexData, 0, indexData.length);
            }
            chunk.numTriangles = indexData.length / 3;
            chunk.decorations = seedDecorations(startDist);

            return chunk;
        }

        private function seedDecorations(startDist:Number):Vector.<DecorationData> 
        {
            var list:Vector.<DecorationData> = new Vector.<DecorationData>();
            for (var d:Number = startDist; d < startDist + CHUNK_LENGTH; d += 35.0) 
            {
                var pt:Vector3D = evaluateSpline(d);
                var side:Number = (Math.sin(d * 12.3) > 0) ? 1.0 : -1.0;
                var dec:DecorationData = new DecorationData();
                dec.position = new Vector3D(
                    pt.x + side * (TRACK_WIDTH + 12.0 + Math.abs(Math.sin(d)) * 20.0),
                    pt.y + 6.0 + Math.sin(d * 0.05) * 8.0,
                    pt.z
                );
                dec.type = (Math.abs(Math.sin(d * 43.1)) > 0.5) ? "NEON_PYLON" : "FLOATING_RING";
                list.push(dec);
            }
            return list;
        }
    }
}

class TrackChunkData {
    public var vertexBuffer:flash.display3D.VertexBuffer3D;
    public var indexBuffer:flash.display3D.IndexBuffer3D;
    public var numTriangles:int;
    public var decorations:Vector.<DecorationData>;
}

class DecorationData {
    public var position:flash.geom.Vector3D;
    public var type:String;
}
