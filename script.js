/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2xhc2VyamEiLCJhIjoiY201b2RybzhxMGt5ZDJrcTFoYWhuZGg1NSJ9.26_93f6771_YWY9BhIhnlw'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/glaserja/cm72c3cvb007u01s31k928na5",
    center: [-79.39, 43.66], // Toronto coordinates
    zoom: 12
});


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable
let collisionData;
let neighborhoods;

// Fetch GeoJSON from your GitHub repository and store response
fetch('https://raw.githubusercontent.com/glaserja5/GGR472-Lab-4/main/data/pedcyc_collision_06-21.geojson')
    .then(response => response.json()
    .then(response => {
        collisionData = response; // Store geojson as a variable
    }))
    .catch(error => console.error('Error fetching collision data:', error));

fetch('https://raw.githubusercontent.com/glaserja5/GGR472-Lab-4/main/data/toronto_crs84.geojson')
    .then(response => response.json()
    .then(response => {
        neighborhoods = response; // Store geojson as a variable
    }))
    .catch(error => console.error('Error fetching collision data:', error));

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function
//      **Option: You may want to consider how to increase the size of your bbox to enable greater geog coverage of your hexgrid
//                Consider return types from different turf functions and required argument types carefully here

map.on('load', () => {

    let bbox = turf.bbox(collisionData);
    let bboxPolygon = turf.bboxPolygon(bbox);
    let expandedBboxPolygon = turf.transformScale(bboxPolygon, 1.1);
    let expandedBbox = turf.bbox(expandedBboxPolygon);

    // Create hexgrid (cell size = 0.5 km)
    let hexgrid = turf.hexGrid(expandedBbox, 0.5, { units: 'kilometers' });
    console.log("Hexgrid:", hexgrid);

    let collected = turf.collect(hexgrid, collisionData, '_id', 'values');
    console.log("Collected Data:", collected);

    let toronto;
    neighborhoods.features.forEach((i) => {
        if (toronto){
            toronto = turf.union(toronto, turf.polygon(i.geometry.coordinates))
        } else {
            toronto = turf.polygon(i.geometry.coordinates)
        }
    })

    console.log(toronto)

    let maxCollisions = 0;

    // Loop through hexagons to add collision count
    collected.features.forEach((feature) => {
        let count = feature.properties.values.length; // Number of points inside hexagon
        feature.properties.COUNT = count; // Store count in hexagon properties

        // Track max collision count
        if (count > maxCollisions) {
            maxCollisions = count;
        }
    });

    // Add hexgrid to map
    map.addSource('hexgrid', {
        type: 'geojson',
        data: hexgrid
    });

    map.addLayer({
        id: 'hexgrid-layer',
        type: 'fill',
        source: 'hexgrid',
        paint: {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'COUNT'],
                0, '#fef0d9',    // Light color for few collisions
                5, '#fdcc8a',
                10, '#fc8d59',
                20, '#e34a33',
                50, '#b30000'    // Darkest red for highest collision counts
            ],
            'fill-opacity': 0.5,
            'fill-outline-color': '#000'
        }
    });
})


/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty
document.getElementById('aggregatebutton').addEventListener('click', () => {
    console.log("Aggregating collision data...");

    if (!collisionData || !map.getSource('hexgrid')) {
        console.error("Ensure collision data and hexgrid are loaded before aggregating.");
        return;
    }

    // Use Turf.js collect function to count collisions inside each hexagon
    

    document.getElementById('aggregatebutton').disabled = true; // Disable button after use
});


// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows

map.on('click', 'hexgrid-layer', (e) => {
    let count = e.features[0].properties.COUNT || 0;
    
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>Collisions:</strong> ${count}`)
        .addTo(map);
});

// Change cursor on hover
map.on('mouseenter', 'hexgrid-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'hexgrid-layer', () => {
    map.getCanvas().style.cursor = '';
});


