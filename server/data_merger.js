const fs = require('fs');
const path = require('path');

const loadData = () => {
  try {
    const basicsPath = path.join(__dirname, '../data/property_basics.json');
    const characteristicsPath = path.join(__dirname, '../data/property_characteristics.json');
    const imagesPath = path.join(__dirname, '../data/property_images.json');

    const basics = JSON.parse(fs.readFileSync(basicsPath, 'utf8'));
    const characteristics = JSON.parse(fs.readFileSync(characteristicsPath, 'utf8'));
    const images = JSON.parse(fs.readFileSync(imagesPath, 'utf8'));

    // Merge data by ID
    const mergedData = basics.map(basic => {
      const char = characteristics.find(c => c.id === basic.id) || {};
      const img = images.find(i => i.id === basic.id) || {};
      
      return {
        ...basic,
        ...char,
        ...img
      };
    });

    return mergedData;
  } catch (error) {
    console.error("Error loading data:", error);
    return [];
  }
};

module.exports = { loadData };





