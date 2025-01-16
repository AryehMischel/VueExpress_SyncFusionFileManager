import { Group, Raycaster, Vector2 } from "three";

const _pointer = new Vector2();
const _event = { type: "", data: _pointer };

const _raycaster = new Raycaster();

// let highlightedObject = [];
let rightArrowHighlighted = false;
let leftArrowHighlighted = false;

class InteractiveGroup extends Group {
  listenToPointerEvents(renderer, camera) {}

  listenToXRControllerEvents(controller) {
    const scope = this;

    // TODO: Dispatch pointerevents too

    const events = {
      move: "mousemove",

      select: "click",
      selectstart: "mousedown",
      selectend: "mouseup",
    };

    function onXRControllerEvent(event) {
      const controller = event.target;

      _raycaster.setFromXRController(controller);

      const intersections = _raycaster.intersectObjects(scope.children, false);

      if (intersections.length > 0) {
        const intersection = intersections[0];

        const object = intersection.object;
        console.log("intersected object", object.userData.name);

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

        _event.type = events[event.type];
        _event.data.set(uv.x, 1 - uv.y);

        object.dispatchEvent(_event);
      } else {
        if (rightArrowHighlighted) {
          rightArrowHighlighted = false;
          unhighlightRightArrow();
        }

        if (leftArrowHighlighted) {
          leftArrowHighlighted = false;
          unhighlightLeftArrow();
        }
      }
    }

    controller.addEventListener("move", onXRControllerEvent);
    controller.addEventListener("select", onXRControllerEvent);
    controller.addEventListener("selectstart", onXRControllerEvent);
    controller.addEventListener("selectend", onXRControllerEvent);
  }
}

export { InteractiveGroup };
