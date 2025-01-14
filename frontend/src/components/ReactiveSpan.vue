<template>
    <span>{{ value }}</span>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    value: String
  });
  </script>