<template>
  <div>
    <!-- Gear Icon -->
    <button
      class="showSettingsButton"
      v-if="!showSettingsPanel"
      @click="toggleSettingsPanel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        viewBox="0 0 20 20"
        height="20"
        fill="none"
        class="svg-icon"
      >
        <g stroke-width="1.5" stroke-linecap="round" stroke="#5d41de">
          <circle r="2.5" cy="10" cx="10"></circle>
          <path
            fill-rule="evenodd"
            d="m8.39079 2.80235c.53842-1.51424 2.67991-1.51424 3.21831-.00001.3392.95358 1.4284 1.40477 2.3425.97027 1.4514-.68995 2.9657.82427 2.2758 2.27575-.4345.91407.0166 2.00334.9702 2.34248 1.5143.53842 1.5143 2.67996 0 3.21836-.9536.3391-1.4047 1.4284-.9702 2.3425.6899 1.4514-.8244 2.9656-2.2758 2.2757-.9141-.4345-2.0033.0167-2.3425.9703-.5384 1.5142-2.67989 1.5142-3.21831 0-.33914-.9536-1.4284-1.4048-2.34247-.9703-1.45148.6899-2.96571-.8243-2.27575-2.2757.43449-.9141-.01669-2.0034-.97028-2.3425-1.51422-.5384-1.51422-2.67994.00001-3.21836.95358-.33914 1.40476-1.42841.97027-2.34248-.68996-1.45148.82427-2.9657 2.27575-2.27575.91407.4345 2.00333-.01669 2.34247-.97026z"
            clip-rule="evenodd"
          ></path>
        </g>
      </svg>
      <span class="lable">Settings</span>

      <i class="fas fa-cog"></i>
    </button>

    <!-- Settings Panel -->
    <div v-if="showSettingsPanel" class="settings-panel">
      <button class="close-tab-btn" @click="toggleSettingsPanel">
        <i class="fas fa-times"></i>
      </button>
      <h3>...</h3>

      <label class="toggle-switch">
        <input type="checkbox" v-model="toggleSwitch" />
        <div class="toggle-switch-background">
          <div class="toggle-switch-handle"></div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { getMainStore } from "./store/main";
let store;

const showSettingsPanel = ref(false);
const toggleSwitch = ref(false);
const toggleSettingsPanel = () => {
  showSettingsPanel.value = !showSettingsPanel.value;
};

// Watch for changes on the toggleSwitch
watch(toggleSwitch, (newValue, oldValue) => {
  console.log(`Toggle switch changed from ${oldValue} to ${newValue}`)
  store.setProcessClientSide(newValue);
});

onMounted(() => {
  store = getMainStore();
});
</script>

<style scoped>
.icon-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 20;
  color: white;
  transition: color 0.3s ease;
}

.icon-button:hover {
  color: #ccc;
}

.settings-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: rgb(128, 119, 119);
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 300px;
  z-index: 1000;
}


.settings-panel h3 {
  margin-top: 0;
}

.settings-panel div {
  margin-bottom: 10px;
}

.showSettingsButton {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 20;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 12px;
  gap: 8px;
  height: 36px;
  width: 120px;
  border: none;
  background: #5e41de33;
  border-radius: 20px;
  cursor: pointer;
}

.lable {
  line-height: 20px;
  font-size: 17px;
  color: #5d41de;
  font-family: sans-serif;
  letter-spacing: 1px;
}

.button:hover {
  background: #5e41de4d;
}

.button:hover .svg-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.close-button {
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #ac0909;
  transition: color 0.3s ease;
}

.close-button:hover {
  color: #ff0000;
}
.svg-icon {
  fill: #5d41de;
}

.label {
  color: #5d41de;
}

/* Button Styling */
.close-tab-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(145deg, #ff7b7b, #ff3a3a);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
}

/* Icon Styling */
.close-tab-btn::before {
  content: "×";
  font-size: 24px;
  color: white;
}

/* Hover Effects */
.close-tab-btn:hover {
  background: linear-gradient(145deg, #ff3a3a, #ff7b7b);
  transform: scale(1.1);
}

.close-tab-btn:active {
  transform: scale(1);
}


.toggle-switch {
  position: relative;
  display: inline-block;
  width: 80px;
  height: 40px;
  cursor: pointer;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-switch-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ddd;
  border-radius: 20px;
  box-shadow: inset 0 0 0 2px #ccc;
  transition: background-color 0.3s ease-in-out;
}

.toggle-switch-handle {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 30px;
  height: 30px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out;
}

.toggle-switch::before {
  content: "";
  position: absolute;
  top: -25px;
  right: -35px;
  font-size: 12px;
  font-weight: bold;
  color: #aaa;
  text-shadow: 1px 1px #fff;
  transition: color 0.3s ease-in-out;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch-handle {
  transform: translateX(45px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2), 0 0 0 3px #05c46b;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch-background {
  background-color: #05c46b;
  box-shadow: inset 0 0 0 2px #04b360;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch:before {
  content: "On";
  color: #05c46b;
  right: -15px;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch-background .toggle-switch-handle {
  transform: translateX(40px);
}

</style>
