 let vs = `
  varying vec2 vUv;
      uniform float brightness;
  void main() {
      vUv = uv;
  }
`;

export { vs };

let fs = `
  varying vec2 vUv;
  uniform bool highlighted;

      void main() {

      if(highlighted){
       
      if(csm_FragColor.g > 0.5){
        csm_FragColor = vec4(csm_FragColor.r, csm_FragColor.g, csm_FragColor.b, 1.0);
      }else{
         csm_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    }else{
    
    csm_FragColor = csm_FragColor;
    }
       csm_UnlitFac =  csm_UnlitFac;
  }
`;

export { fs };