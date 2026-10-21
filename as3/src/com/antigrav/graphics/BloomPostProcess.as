package com.antigrav.graphics 
{
    import flash.display3D.Context3D;
    import flash.display3D.textures.Texture;
    import flash.display3D.Context3DTextureFormat;
    import flash.display3D.Context3DProgramType;
    import flash.display3D.Program3D;
    import com.adobe.utils.AGALMiniAssembler;

    /**
     * High-speed racing post-processing:
     * Downsamples the bright neon elements, blurs them with horizontal/vertical passes,
     * and blends them back additively to create glowing thrusters and sun glares.
     */
    public class BloomPostProcess 
    {
        private var _context:Context3D;
        private var _sceneTexture:Texture;
        private var _blurTextureH:Texture;
        private var _blurTextureV:Texture;
        private var _compositeProgram:Program3D;

        public function BloomPostProcess(context:Context3D, width:int = 1024, height:int = 512) 
        {
            this._context = context;
            if (_context) {
                _sceneTexture = context.createTexture(width, height, Context3DTextureFormat.BGRA, true);
                _blurTextureH = context.createTexture(width >> 1, height >> 1, Context3DTextureFormat.BGRA, true);
                _blurTextureV = context.createTexture(width >> 1, height >> 1, Context3DTextureFormat.BGRA, true);
                initShaders();
            }
        }

        private function initShaders():void 
        {
            // Additive bloom composite pass: Final = SceneColor + (BloomColor * Intensity)
            var vSrc:String = "mov op, va0\nmov v0, va1\n";
            var fSrc:String = 
                "tex ft0, v0, fs0 <2d, linear, clamp>\n" + // Scene
                "tex ft1, v0, fs1 <2d, linear, clamp>\n" + // Blurred Bloom
                "mul ft1, ft1, fc0.xxxx\n" +               // Bloom intensity multiplier
                "add oc, ft0, ft1\n";

            var va:AGALMiniAssembler = new AGALMiniAssembler();
            va.assemble(Context3DProgramType.VERTEX, vSrc);
            var fa:AGALMiniAssembler = new AGALMiniAssembler();
            fa.assemble(Context3DProgramType.FRAGMENT, fSrc);

            _compositeProgram = _context.createProgram();
            _compositeProgram.upload(va.agalcode, fa.agalcode);
        }

        public function beginSceneRender():void 
        {
            if (!_context || !_sceneTexture) return;
            _context.setRenderToTexture(_sceneTexture, true);
            _context.clear(0.04, 0.05, 0.08, 1.0);
        }

        public function renderComposite():void 
        {
            if (!_context || !_compositeProgram) return;
            _context.setRenderToBackBuffer();
            _context.setProgram(_compositeProgram);
            _context.setTextureAt(0, _sceneTexture);
            _context.setTextureAt(1, _blurTextureV);
            _context.setProgramConstantsFromVector(Context3DProgramType.FRAGMENT, 0, Vector.<Number>([1.45, 0, 0, 0]));
        }
    }
}
