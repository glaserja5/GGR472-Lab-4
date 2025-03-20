# GGR472 Lab 4: Collision Data Visualization with Turf.js & Mapbox GL JS

This repository contains the files necessary to create an interactive web map that visualizes pedestrian and cyclist collision data in Toronto using [Turf.js](https://turfjs.org/) for spatial analysis and [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/) for mapping.

## Repository Contents

- `data/pedcyc_collision_06-21.geojson`: GeoJSON file containing point locations of pedestrian and cyclist collisions in Toronto (2006-2021).
- `index.html`: Main HTML file that renders the web map.
- `style.css`: CSS file for styling the map interface and UI elements.
- `script.js`: JavaScript file that initializes the map, processes the data, generates a hexgrid, and adds interactive elements.
- `README.md`: Documentation file explaining how to use and modify the map.

## Features

- **Hexagonal Binning**: Uses Turf.js to aggregate collision data into a hexagonal grid.
- **Dynamic Styling**: Colors hexagons based on collision density.
- **Interactive Popups**: Displays the number of collisions within each hexagon on hover.
- **Hover Effects**: Highlights hexagons when hovered.

