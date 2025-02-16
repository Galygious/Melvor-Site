function mapNamespaceRegistries(itemRegistry) {
    if (!itemRegistry) {
      console.error("Invalid item registry structure", itemRegistry);
      return {};
    }
  
    let mappedNamespaces = {};
  
    // Define field mappings with structured extraction rules
    var fields = {
      uid: "uid",
      name: "_name",
      className: "constructor.name",
      category: "category",
      type: "type",
      image: "_media",
      description: "_customDescription",
      sellPrice: "sellsFor.quantity",
      sellCurrency: "sellsFor.currency._localID",
      equipmentSlot: {
        path: "validSlots",
        // Use foreacharray with a string to extract a single field from each array element.
        foreacharray: "_localID"
      },
      tier: "tier",
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
      },
      soulPoints: "soulPoints",
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

                    // If fieldConfig is a function, call it with the item
                    if (typeof fieldConfig === "function") {
                        value = fieldConfig(item);
                    }
                    // If fieldConfig is a string, get the value directly
                    else if (typeof fieldConfig === "string") {
                        value = getValueFromPath(item, fieldConfig);
                    }
                    // If fieldConfig is an object
                    else if (typeof fieldConfig === "object") {
                        // Process foreacharray logic (extract an array of values)
                        if (fieldConfig.foreacharray) {
                            let arrayData = getValueFromPath(item, fieldConfig.path);
                            if (Array.isArray(arrayData) && arrayData.length > 0) {
                                if (typeof fieldConfig.foreacharray === "string") {
                                    let arr = [];
                                    arrayData.forEach(entry => {
                                        let v = getValueFromPath(entry, fieldConfig.foreacharray);
                                        if (v !== undefined) {
                                            arr.push(v);
                                        }
                                    });
                                    if (arr.length > 0) {
                                        value = arr;
                                    }
                                }
                            }
                        }
                        // Process foreach logic
                        else if (fieldConfig.foreach) {
                            let arrayData = getValueFromPath(item, fieldConfig.path);
                            if (Array.isArray(arrayData) && arrayData.length > 0) {
                                value = {};
                                const foreachKeys = Object.keys(fieldConfig.foreach);

                                // 1) Direct key-value mapping: { "key": "value" } (e.g. equipmentStats)
                                if (
                                    foreachKeys.length === 1 &&
                                    foreachKeys[0] === "key" &&
                                    fieldConfig.foreach.key === "value"
                                ) {
                                    arrayData.forEach(entry => {
                                        const k = entry.key;
                                        const v = entry.value;
                                        if (k && v !== undefined) {
                                            value[k] = v;
                                        }
                                    });
                                }

                                // 2) If key is quoted, treat it as a literal key to group values into an array.
                                else if (
                                    foreachKeys.length === 1 &&
                                    foreachKeys[0].startsWith('"') &&
                                    foreachKeys[0].endsWith('"')
                                ) {
                                    let lhs = foreachKeys[0];
                                    let rhs = fieldConfig.foreach[lhs];
                                    let literalKey = lhs.slice(1, -1);
                                    let collected = [];
                                    arrayData.forEach(entry => {
                                        let v = getValueFromPath(entry, rhs);
                                        if (v !== undefined) {
                                            collected.push(v);
                                        }
                                    });
                                    if (collected.length > 0) {
                                        value[literalKey] = collected;
                                    }
                                }

                                // 3) Single-property path => path. For example: { "skill._localID": "level" }
                                else if (
                                    foreachKeys.length === 1 &&
                                    typeof fieldConfig.foreach[foreachKeys[0]] === "string"
                                ) {
                                    const keyPath = foreachKeys[0];               // e.g. "skill._localID"
                                    const valPath = fieldConfig.foreach[keyPath]; // e.g. "level"

                                    arrayData.forEach(entry => {
                                        let dynamicKey = getValueFromPath(entry, keyPath);
                                        let dynamicVal = getValueFromPath(entry, valPath);
                                        if (dynamicKey !== undefined && dynamicVal !== undefined) {
                                            value[dynamicKey] = dynamicVal;
                                        }
                                    });
                                }

                                // 4) If there's exactly one property `_name`, treat `_name` as the dynamic key
                                //    and the object as subfields (specialAttacks pattern).
                                else if (
                                    foreachKeys.length === 1 &&
                                    foreachKeys[0] === "_name" &&
                                    typeof fieldConfig.foreach["_name"] === "object"
                                ) {
                                    let subFieldConfig = fieldConfig.foreach["_name"];
                                    arrayData.forEach(entry => {
                                        let dynamicKey = getValueFromPath(entry, "_name");  // e.g. "Fire Spin"
                                        if (!dynamicKey) return; // skip if missing name

                                        let nestedEntry = {};
                                        Object.keys(subFieldConfig).forEach(subFieldKey => {
                                            let val = getValueFromPath(entry, subFieldConfig[subFieldKey]);
                                            if (val !== undefined) {
                                                nestedEntry[subFieldKey] = val;
                                            }
                                        });

                                        if (Object.keys(nestedEntry).length > 0) {
                                            value[dynamicKey] = nestedEntry;
                                        }
                                    });
                                }

                                // 5) Final fallback: use subfields extraction keyed by the value at mainKeyPath
                                else {
                                    arrayData.forEach(entry => {
                                        let mainKeyPath = foreachKeys[0];
                                        let key = getValueFromPath(entry, mainKeyPath);
                                        let subFields = fieldConfig.foreach[key];

                                        if (typeof subFields === "object") {
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
                                }

                                // If nothing got populated, set value = undefined
                                if (value && Object.keys(value).length === 0) {
                                    value = undefined;
                                }
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
