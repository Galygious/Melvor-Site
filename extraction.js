function mapNamespaceRegistries(itemRegistry) {
    if (!itemRegistry) {
        console.error("Invalid item registry structure", itemRegistry);
        return {};
    }

    let mappedNamespaces = {};

    // Define field mappings with structured extraction rules
    const fields = {
        name: "_name",
        type: "type",
        image: "_media",
        category: "category",
        soulPoints: "soulPoints",
        sellPrice: "sellsFor.quantity",
        sellCurrency: "sellsFor.currency._localID",
        equipmentStats: {  
            path: "equipmentStats",
            foreach: { 
                "key": "value"  // Extract key-value pairs dynamically
            }
        },
        equipRequirements: {  
            path: "equipRequirements",
            foreach: {
                "skill._localID": "level"  // Dynamic key-value pair
            }
        },
        specialAttacks: {
            path: "specialAttacks",
            foreach: {
                "_name": {  // `_name` becomes the key
                    "description": "_description",
                    "chance": "defaultChance",
                    "attackCount": "attackCount",
                    "attackInterval": "attackInterval",
                    "lifesteal": "lifesteal"
                }
            }
        }
    };

    // Iterate over the properties of game.items (which are NamespaceRegistry objects)
    Object.keys(itemRegistry).forEach(namespace => {
        if (itemRegistry[namespace]?.registeredObjects instanceof Map) {
            mappedNamespaces[namespace] = {}; 

            itemRegistry[namespace].registeredObjects.forEach((item, registeredItem) => {
                let itemData = {}; 

                Object.keys(fields).forEach(field => {
                    let fieldConfig = fields[field]; 
                    let value;

                    // If fieldConfig is a string, get the value directly
                    if (typeof fieldConfig === "string") {
                        value = getValueFromPath(item, fieldConfig);
                    }

                    // If fieldConfig is an object and uses foreach(), process it differently
                    else if (typeof fieldConfig === "object" && fieldConfig.foreach) {
                        let arrayData = getValueFromPath(item, fieldConfig.path);
                        if (Array.isArray(arrayData) && arrayData.length > 0) { 
                            value = {}; 

                            arrayData.forEach(entry => {
                                let key = getValueFromPath(entry, Object.keys(fieldConfig.foreach)[0]);
                                let subFields = fieldConfig.foreach[key];

                                if (typeof subFields === "object") {
                                    // Extract multiple sub-fields
                                    let nestedEntry = {};
                                    Object.keys(subFields).forEach(subFieldKey => {
                                        let val = getValueFromPath(entry, subFields[subFieldKey]);
                                        if (val !== undefined) {
                                            nestedEntry[subFieldKey] = val;
                                        }
                                    });

                                    if (Object.keys(nestedEntry).length > 0) {
                                        value[key] = nestedEntry;
                                    }
                                }
                            });

                            if (Object.keys(value).length === 0) {
                                value = undefined;
                            }
                        }
                    }

                    if (value !== undefined && value !== null && value !== '') {
                        itemData[field] = value;
                    }
                });

                if (Object.keys(itemData).length > 0) {
                    mappedNamespaces[namespace][registeredItem] = itemData;
                }
            });
        }
    });

    return mappedNamespaces;
}

// Helper function to retrieve values from nested paths
function getValueFromPath(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// Extract namespace categories from game.items
let mappedNamespaces = mapNamespaceRegistries(game.items);

// Convert to JSON string
let jsonOutput = JSON.stringify(mappedNamespaces, null, 2);

// Display in console
jsonOutput;
