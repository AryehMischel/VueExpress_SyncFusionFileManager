<template>
    <div>
      <button @click="handleCreateAlbum">Create Album</button>
      <button @click="handleDeleteAlbum">Delete Album</button>
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { createAlbum, deleteAlbum } from '../utils/albumUtils';
  
  export default {
    setup() {
      const albumData = ref({ name: 'New Album' });
      const albumId = ref('12345');
  
      const handleCreateAlbum = async () => {
        try {
          const result = await createAlbum(albumData.value);
          console.log('Album created:', result);
        } catch (error) {
          console.error('Error creating album:', error);
        }
      };
  
      const handleDeleteAlbum = async () => {
        try {
          const result = await deleteAlbum(albumId.value);
          console.log('Album deleted:', result);
        } catch (error) {
          console.error('Error deleting album:', error);
        }
      };
  
      return {
        handleCreateAlbum,
        handleDeleteAlbum,
      };
    },
  };
  </script>