import THREE from "../three";
import cloneObject3D from "../utils/cloneObject3D";

export default class Model extends THREE.Object3D {
  constructor() {
    super();
    this.type = "Model";

    this.model = null;
    this.animations = [];
    this.clipActions = [];

    this._mixer = new THREE.AnimationMixer(this);
  }

  setModel(object, animations) {
    console.log("setModel", object, animations);
    this.model = object;

    if (animations) {
      this.animations = this.animations.concat(animations);
    }

    this.add(object);
  }

  addClipAction(clipName) {
    const clip = this.animations.find(c => c.name === clipName) || null;

    if (!clip) {
      throw new Error(`Model: No clip named: ${clipName} found.`);
    }

    const clipAction = this._mixer.clipAction(clip);
    this.clipActions.push(clipAction);
    return clipAction;
  }

  removeClipAction(clipName) {
    const index = this.clipActions.findIndex(a => a.getClip().name === clipName);

    if (index === -1) {
      this.clipActions.splice(index, 1);
      return true;
    }

    return false;
  }

  // TODO: Add play/pause methods for previewing animations.

  copy(source, recursive) {
    super.copy(source, false);

    this.src = source.src;

    for (const child of source.children) {
      let clonedChild;

      if (child === source.model) {
        clonedChild = cloneObject3D(child);
        this.setModel(clonedChild, source.animations);
      } else if (recursive === true) {
        clonedChild = child.clone();
      }

      if (clonedChild) {
        this.add(clonedChild);
      }
    }

    for (const clipAction of source.clipActions) {
      this.addClipAction(clipAction.getClip().name);
    }
  }

  update(dt) {
    this._mixer.update(dt);
  }
}