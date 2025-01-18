class WebXRStore {
    constructor() {
      if (WebXRStore.instance) {
        return WebXRStore.instance;
      }
      this.glBinding = null;
      this.xrSpace = null;
      this.xrSession = null;
      WebXRStore.instance = this;
    }
  
    setGLBinding(glBinding) {
      this.glBinding = glBinding;
    }
  
    setXRSpace(xrSpace) {
      this.xrSpace = xrSpace;
    }

    setXRSession(xrSession){
        this.xrSession = xrSession;
    }
  
    getGLBinding() {
      return this.glBinding;
    }
  
    getXRSpace() {
      return this.xrSpace;
    }

    getXRSession(){
        return this.xrSession;
    }
  }
  
  const webXRStore = new WebXRStore();
  export default webXRStore;