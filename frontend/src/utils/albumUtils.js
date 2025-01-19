import axios from 'axios';


const albumData = {bs: 5}
const albumId = 3;


export const createAlbum = async (albumData) => {
  try {
    const response = await axios.post('/album', albumData);
    return response.data;
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
};

export const deleteAlbum = async (albumId) => {
  try {
    const response = await axios.post('/album/delete', { id: albumId });
    return response.data;
  } catch (error) {
    console.error('Error deleting album:', error);
    throw error;
  }
};