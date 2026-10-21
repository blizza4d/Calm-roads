package com.antigrav.graphics 
{
    import flash.display3D.Context3D;
    import flash.display3D.Context3DProgramType;
    import flash.display3D.Program3D;
    import com.adobe.utils.AGALMiniAssembler;

    public class MaterialShaders 
    {
        /**
         * Compiles the metallic car shader in Stage3D AGAL:
         * Inputs:
         *   va0 = [x, y, z] position
         *   va1 = [nx, ny, nz] normal
         *   va2 = [u, v, glowMask] UV coordinates + Neon glow
         * Constants:
         *   vc0-vc3 = ModelViewProjection Matrix
         *   vc4-vc7 = Model World Matrix (for lighting vectors)
         *   fc0 = [lightDir.x, lightDir.y, lightDir.z, 0]
         *   fc1 = [viewPos.x, viewPos.y, viewPos.z, 1]
         *   fc2 = [ambient.r, ambient.g, ambient.b, specularPower]
         *   fc3 = [carPaint.r, carPaint.g, carPaint.b, metallic]
         *   fc4 = [neonColor.r, neonColor.g, neonColor.b, glowMultiplier]
         */
        public static function createMetallicShader(context:Context3D):Program3D 
        {
            var vSrc:String = 
                "m44 op, va0, vc0\n" +             // Clip-space position
                "m33 vt0.xyz, va1.xyz, vc4\n" +       // World normal
                "nrm v1.xyz, vt0.xyz\n" +           // Pass normal to fragment
                "m44 vt1, va0, vc4\n" +             // World vertex position
                "mov v0, va2\n" +                   // Pass UV & glow mask
                "sub v2.xyz, fc1.xyz, vt1.xyz\n" +  // View vector (Eye - WorldPos)
                "nrm v2.xyz, v2.xyz\n";

            var fSrc:String = 
                // Diffuse N dot L
                "dp3 ft0.x, v1.xyz, fc0.xyz\n" +
                "max ft0.x, ft0.x, fc2.x\n" +       // Clamp diffuse to ambient
                "mul ft1.xyz, fc3.xyz, ft0.xxx\n" +

                // Half-angle Specular (Blinn-Phong)
                "add ft2.xyz, fc0.xyz, v2.xyz\n" +
                "nrm ft2.xyz, ft2.xyz\n" +
                "dp3 ft0.y, v1.xyz, ft2.xyz\n" +
                "max ft0.y, ft0.y, fc2.x\n" +
                "pow ft0.y, ft0.y, fc2.w\n" +       // Specular power (roughness)
                "mul ft3.xyz, ft0.yyy, fc3.w\n" +   // Scale by metallic sheen

                // Combine Diffuse + Specular
                "add ft4.xyz, ft1.xyz, ft3.xyz\n" +

                // Neon Glow Accent (Masked by va2.z stored in v0.z)
                "mul ft5.xyz, fc4.xyz, fc4.w\n" +
                "mul ft5.xyz, ft5.xyz, v0.z\n" +
                "add oc.xyz, ft4.xyz, ft5.xyz\n" +
                "mov oc.w, fc1.w\n";               // Alpha = 1.0

            var va:AGALMiniAssembler = new AGALMiniAssembler();
            va.assemble(Context3DProgramType.VERTEX, vSrc);

            var fa:AGALMiniAssembler = new AGALMiniAssembler();
            fa.assemble(Context3DProgramType.FRAGMENT, fSrc);

            var program:Program3D = context.createProgram();
            program.upload(va.agalcode, fa.agalcode);
            return program;
        }
    }
}
