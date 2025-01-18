import {
  Group,
  Raycaster,
  Vector2,
  Vector3,
  Matrix4,
  LineBasicMaterial,
  BufferGeometry,
  Line,
  color,
} from "three";

const _pointer = new Vector2();
const _event = { type: "", data: _pointer };

const _raycaster = new Raycaster();
// const tempMatrix = new Matrix4();
// const raycastLineMaterial = new LineBasicMaterial({ color: 0xff0000 });
// const raycastLineGeometry = new BufferGeometry().setFromPoints([
//   new Vector3(0, 0, 0),
//   new Vector3(0, 0, -1),
// ]);

const lineGeometry = new BufferGeometry().setFromPoints([
  new Vector3(0, 0, 0),
  new Vector3(0, 0, -10),
]);

const defaultGeometry = new BufferGeometry().setFromPoints([
  new Vector3(0, 0, 0),
  new Vector3(0, 0, -10),
]);

let isRaycastLineDefault = true;

const line = new Line(lineGeometry, new LineBasicMaterial({ color: 0x5555ff }));
// const raycastLine = new Line(raycastLineGeometry, raycastLineMaterial);

// let highlightedObject = [];
let rightArrowHighlighted = false;
let leftArrowHighlighted = false;

class InteractiveGroup extends Group {
  listenToPointerEvents(renderer, camera) {}

  listenToXRControllerEvents(controller) {
    const scope = this;
    controller.add(line.clone());

    // TODO: Dispatch pointerevents too

    const events = {
      move: "mousemove",

      select: "click",
      selectstart: "mousedown",
      selectend: "mouseup",
    };

    function onXRControllerEvent(event) {
      const controller = event.target;
      // Extract the controller's position and orientation
      //  tempMatrix.identity().extractRotation(controller.matrixWorld);
      //  _raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      //  _raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      _raycaster.setFromXRController(controller);

      const intersections = _raycaster.intersectObjects(scope.children, false);

      if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;

        if (!rightArrowHighlighted) {
          if (object.userData.name === "rightArrow") {
            rightArrowHighlighted = true;
            highlightRightArrow();
          }
        }

        if (!leftArrowHighlighted) {
          if (object.userData.name === "leftArrow") {
            leftArrowHighlighted = true;
            highlightLeftArrow();
          }
        }

        const uv = intersection.uv;

        if (uv) {
          _event.data.set(uv.x, 1 - uv.y);
        } else {
          _event.data.set(0, 0); // Default values if uv is undefined
        }
        _event.type = events[event.type];

        object.dispatchEvent(_event);

        const distance = intersection.distance;
        controller.children[0].geometry = new BufferGeometry().setFromPoints([
          new Vector3(0, 0, 0),
          new Vector3(0, 0, -distance),
        ]);

        if(isRaycastLineDefault){
          isRaycastLineDefault = false;
        }
      } else {
        if (rightArrowHighlighted) {
          rightArrowHighlighted = false;
          unhighlightRightArrow();
        }

        if (leftArrowHighlighted) {
          leftArrowHighlighted = false;
          unhighlightLeftArrow();
        }

        // Reset raycast line if no intersections
        if (!isRaycastLineDefault) {
          controller.children[0].geometry.dispose();
          controller.children[0].geometry = defaultGeometry.clone();
          isRaycastLineDefault = true;
        }

        // controller.children[0].geometry = new BufferGeometry().setFromPoints([
        //   new Vector3(0, 0, 0),
        //   new Vector3(0, 0, -10),
        // ]);
      }
    }

    controller.addEventListener("move", onXRControllerEvent);
    controller.addEventListener("select", onXRControllerEvent);
    controller.addEventListener("selectstart", onXRControllerEvent);
    controller.addEventListener("selectend", onXRControllerEvent);
  }
}

export { InteractiveGroup };
