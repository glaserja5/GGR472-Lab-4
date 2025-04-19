// access mapbox API and style
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2xhc2VyamEiLCJhIjoiY205bnI4aWRtMDFnMDJxb25tdXd4bGV5ayJ9.6EInEzp25PqwQ2PZsvcEuQ';

const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/glaserja/cm72c3cvb007u01s31k928na5",
    center: [-79.39, 43.66],
    zoom: 12
});

// declare Collision data and hexgrid globally to be accessed anywhere
let collisionData;
let hexgrid;

fetch('https://raw.githubusercontent.com/glaserja5/GGR472-Lab-4/main/data/pedcyc_collision_06-21.geojson') // fetch data from github
    .then(response => response.json()) // converts the response of the fetch to a json format
    // .then() is used to process the raw json
    .then(data => {
        collisionData = data; // stores the fetched data in collisionData
        
        console.log("Collision data loaded:", collisionData.features.length, "points");
        
        initializeMap(); // call the initializeMap() function when data is fetched
    })
    .catch(error => console.error('Error fetching collision data:', error));

/*--------------------------------------------------------------------
Step 3: INITIALIZE MAP, CREATE HEXGRID, & AGGREGATE COLLISIONS
--------------------------------------------------------------------*/
function initializeMap() {
    // waits till mapbox is fully laoded before executing function
    map.on("load", () => {
        console.log("Map has loaded.");

        if (!collisionData) {
            console.error("Collision data is missing!");
            return;
        }

        // Create hexgrid (cell size = 0.5 km)
        let bbox = turf.bbox(collisionData); // Get the bounding box of the collision dataset
        let bboxPolygon = turf.bboxPolygon(bbox); // converts to polygon
        let expandedBboxPolygon = turf.transformScale(bboxPolygon, 1.1); // expand by 10% for full coverage
        let expandedBbox = turf.bbox(expandedBboxPolygon); // convert back to a bounding box
        hexgrid = turf.hexGrid(expandedBbox, 0.5, { units: "kilometers" }); // initiates hexagonal grid with 0.5 km hexagons

        console.log("Hexgrid created:", hexgrid);

        // Add Hexgrid as a Mapbox Source
        map.addSource("hexgrid", {
            type: "geojson",
            data: hexgrid
        });

        // Add Layer for Hexgrid
        map.addLayer({
            id: "hexgrid-layer",
            type: "fill",
            source: "hexgrid",
            paint: {
                "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false], "#ffff00", // Yellow highlight on hover
                    ["interpolate", ["linear"], ["get", "COUNT"],
                    // colour code collision categories
                        0, "#fef0d9",
                        5, "#fdcc8a",
                        10, "#fc8d59",
                        20, "#e34a33",
                        50, "#b30000"
                    ]
                ],
                "fill-opacity": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false], 0.5, // Increases opacity on hover effect
                    0.6
                ],
                "fill-outline-color": "#000"
            },
            filter: [">", ["get", "COUNT"], 0] // filter hides hexagons where COUNT is 0
        });        

        // Run the function to aggregate collisions into hexagons
        aggregateCollisions();
    });
}

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS WITH TURF.JS
--------------------------------------------------------------------*/
function aggregateCollisions() {
    let maxCollisions = 0;

    // Collect collision IDs and neighborhood names
    let collected = turf.collect(hexgrid, collisionData, 'COLLISION_ID', 'values');
    let neighborhoodCollected = turf.collect(hexgrid, collisionData, 'NEIGHBOURHOOD_158', 'neighborhoods');

    // counts number of elements in collision array
    collected.features.forEach((feature, index) => {
        let count = feature.properties.values.length;
        feature.properties.COUNT = count;
        
        //folllowing code is used to aggregate nieghborhood names because hexagons don't have neighborhood id. 
        // we have to aggregate neighborhoods in each hex to get a name.
        // shoutout claude3.7 for this logic..
        // Assign a unique ID to each hexagon
        feature.id = index;

        // Get the corresponding neighborhoods for this hexagon
        const neighborhoods = neighborhoodCollected.features[index].properties.neighborhoods || [];
        
        // Find the most common neighborhood
        if (neighborhoods.length > 0) {
            // Count occurrences of each neighborhood
            const neighborhoodCounts = {};
            neighborhoods.forEach(neighborhood => {
                if (neighborhood) { // Make sure the neighborhood value is not null/undefined
                    neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1;
                }
            });
            
            // Find the neighborhood with the highest count
            let mostCommonNeighborhood = null;
            let highestCount = 0;
            
            Object.keys(neighborhoodCounts).forEach(neighborhood => {
                if (neighborhoodCounts[neighborhood] > highestCount) {
                    mostCommonNeighborhood = neighborhood;
                    highestCount = neighborhoodCounts[neighborhood];
                }
            });
            
            // Add the most common neighborhood to the hexagon properties
            feature.properties.NEIGHBORHOOD = mostCommonNeighborhood;
            feature.properties.NEIGHBORHOOD_COUNT = highestCount;
            feature.properties.TOTAL_NEIGHBORHOODS = neighborhoods.length;
        } else {
            feature.properties.NEIGHBORHOOD = "Unknown";
        }

        if (count > maxCollisions) {
            maxCollisions = count;
        }
    });

    if (map.getSource('hexgrid')) {
        map.getSource('hexgrid').setData(collected);
    }
}

/*--------------------------------------------------------------------
Step 5: Make it look good
--------------------------------------------------------------------*/

// Declare the popup globally
let popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
let hoveredHexId = null; // Track the currently hovered hexagon

// create popup
map.on("mousemove", "hexgrid-layer", (e) => {
    if (e.features.length > 0) {
        const hexId = e.features[0].id; //get the unique ID of the hovered hexagon
        const count = e.features[0].properties.COUNT || 0; //get number of collisions
        const neighborhood = e.features[0].properties.NEIGHBORHOOD || "Unknown"; //get neghborhood name from aggregation

        // if ensures hexID is calid before applying
        if (hexId !== undefined) {
            // if another hex was previously hovered, this resets it to before the hover effect with 'false'
            if (hoveredHexId !== null && hoveredHexId !== hexId) {
                map.setFeatureState({ source: "hexgrid", id: hoveredHexId }, { hover: false });
            }
            
            //update currently hovered hex ID and apply hover effect with 'true'
            hoveredHexId = hexId;
            map.setFeatureState({ source: "hexgrid", id: hoveredHexId }, { hover: true });

            // Show collision count and neighborhood in the popup
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <strong>Neighborhood:</strong> ${neighborhood}<br>
                    <strong>Collisions:</strong> ${count}
                `)
                .addTo(map);
        }
    }
});

map.on("mouseleave", "hexgrid-layer", () => {
    if (hoveredHexId !== null) {
        map.setFeatureState({ source: "hexgrid", id: hoveredHexId }, { hover: false });
        hoveredHexId = null;
    }
    
    // Remove popup when leaving the hexgrid
    popup.remove();
});