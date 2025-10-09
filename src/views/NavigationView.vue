<template>
  <div id="navigation-top-container">
    <div id="instruction-box">
      <div>
        <div id="turn-icon">Turn right</div> <p>1 m.</p>
      </div>
      <p id="instruction-text">Turn right</p> </div>
    <div id="next-turn-box">
        Then <span id="next-turn-arrow">↑</span>
    </div>
  </div>
  <div id="navigation-bottom-container">
    <p id="time-to-destination">3 min</p>
    <div id="bottom-details">
      <p>20 m.</p>
      <p>12:03</p>
      <button id="exit-button">Exit</button>
    </div>
  </div>
</template>
<script setup lang="ts">

</script>
<style>
/*
  * Assumes a parent element wraps the <template> content,
  * e.g., <div id="map-view-parent">...template content...</div>
*/
#map-view-parent {
  /* This is crucial for absolute positioning within its bounds */
  position: relative;
  /* Example size, adjust as needed */
  width: 400px;
  height: 600px;
  /* Add background map/image here if needed */
  background-color: #e8e8e8; /* Light gray background */
}


/*
 * TOP INSTRUCTION BOX STYLES
 */
#navigation-top-container {
  /* HOIST to the TOP */
  position: absolute;
  top: 50px; /* Small gap from the top */
  left: 10px;
  right: 10px;
  z-index: 10; /* Make sure it's above the map content */
  /* Using flex for layout within this container */
  display: flex;
  align-items: flex-start; /* Aligns the instruction box to the top */
}

#instruction-box {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* Allows it to take up most of the space */
}

#instruction-box > div {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Pushes the distance '1 m.' to the right */
  margin-bottom: 5px;
}

#turn-icon {
  font-size: 24px;
  font-weight: bold;
  /* Simulate the arrow and text layout */
  display: flex;
  align-items: center;
}

#instruction-text {
  font-size: 20px;
  font-weight: 500;
  margin: 0;
  padding: 0;
}

#instruction-box p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

/* Next turn 'Then' box styling */
#next-turn-box {
  /* Positioning next to the main instruction box */
  margin-left: -5px; /* Overlap with the main box */
  margin-top: 50px; /* Position it lower to overlap the map background */
  background-color: #8ac08a; /* Light green/blue color from image */
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px; /* Fixed width to match the image's small box */
  height: 40px;
}

#next-turn-arrow {
    display: block; /* Ensure the arrow is on its own line or centered */
    font-size: 18px;
}

/*
 * BOTTOM CONTROL BOX STYLES
 */
#navigation-bottom-container {
  /* HOIST to the BOTTOM */
  position: absolute;
  bottom: 10px; /* Small gap from the bottom */
  left: 10px;
  right: 10px;
  z-index: 10;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.15); /* Shadow on top */
  padding: 15px;
  text-align: left;
}

#time-to-destination {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 10px 0;
}

#bottom-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#bottom-details p {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

#exit-button {
  background-color: #d9534f; /* Red-ish color */
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
</style>
